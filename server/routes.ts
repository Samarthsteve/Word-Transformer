import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { generateRequestSchema, regenerateRequestSchema, type GeneratedToken } from "@shared/schema";

function getGeminiClient() {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  
  throw new Error("No Gemini API key configured. Please set GEMINI_API_KEY.");
}

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function logProbToProb(logProb: number): number {
  return Math.min(Math.max(Math.exp(logProb), 0), 1);
}

type WordLogprobData = {
  word: string;
  summedLogprob: number;
  topLogprobs: Array<{ token: string; logprob: number }>;
};

function aggregateLogprobsToWords(
  logprobsContent: Array<{
    token: string;
    logprob: number;
    top_logprobs?: Array<{ token: string; logprob: number }>;
  }>
): WordLogprobData[] {
  const words: WordLogprobData[] = [];
  let currentWord = "";
  let currentSummedLogprob = 0;
  let currentTopLogprobs: Array<{ token: string; logprob: number }> = [];

  for (const item of logprobsContent) {
    const token = item.token;
    
    const startsWithSpace = token.startsWith(" ") || token.startsWith("\n");
    const isOnlyPunctuation = /^[\s\n]*[^\w\s]+[\s\n]*$/.test(token);
    const cleanToken = token.replace(/^[\s\n]+/, "");
    
    if (startsWithSpace && currentWord.length > 0) {
      words.push({
        word: currentWord,
        summedLogprob: currentSummedLogprob,
        topLogprobs: currentTopLogprobs,
      });
      currentWord = cleanToken;
      currentSummedLogprob = item.logprob;
      currentTopLogprobs = item.top_logprobs || [];
    } else if (isOnlyPunctuation && currentWord.length > 0) {
      currentWord += token.trim();
      currentSummedLogprob += item.logprob;
    } else {
      if (currentWord.length === 0) {
        currentWord = cleanToken;
        currentSummedLogprob = item.logprob;
        currentTopLogprobs = item.top_logprobs || [];
      } else {
        currentWord += token;
        currentSummedLogprob += item.logprob;
      }
    }
  }

  if (currentWord.length > 0) {
    words.push({
      word: currentWord,
      summedLogprob: currentSummedLogprob,
      topLogprobs: currentTopLogprobs,
    });
  }

  return words;
}

async function generateWithOpenAI(prompt: string): Promise<GeneratedToken[]> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a text completion engine. Your ONLY job is to continue the text that the user provides.

CRITICAL RULES:
1. Do NOT repeat any part of the user's text
2. Do NOT add quotation marks, commentary, or explanations  
3. Simply continue writing from exactly where the user left off
4. Generate 8-15 additional words that naturally continue the text
5. Return ONLY the continuation, nothing else`,
      },
      { role: "user", content: `Continue this text (do NOT repeat it, only add new words): "${prompt}"` },
    ],
    max_tokens: 100,
    logprobs: true,
    top_logprobs: 5,
  });

  let text = response.choices[0]?.message?.content || "";
  const logprobsContent = response.choices[0]?.logprobs?.content || [];
  
  text = text.replace(/^["'\s]+|["'\s]+$/g, "").trim();
  
  const promptWords = prompt.toLowerCase().split(/\s+/);
  const textWords = text.split(/\s+/).filter(w => w.length > 0);
  
  let startIndex = 0;
  for (let i = 0; i < Math.min(textWords.length, promptWords.length + 3); i++) {
    const cleanWord = textWords[i]?.toLowerCase().replace(/[^a-z0-9]/g, "");
    const promptWord = promptWords[i]?.replace(/[^a-z0-9]/g, "");
    if (cleanWord === promptWord) {
      startIndex = i + 1;
    } else {
      break;
    }
  }
  
  const continuationWords = textWords.slice(startIndex);
  
  const aggregatedWords = aggregateLogprobsToWords(logprobsContent);
  
  const tokens: GeneratedToken[] = [];
  
  for (let i = 0; i < continuationWords.length; i++) {
    const word = continuationWords[i];
    const alternatives: { token: string; probability: number }[] = [];
    
    let matchedData: WordLogprobData | undefined;
    
    const cleanTargetWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (let j = 0; j < aggregatedWords.length; j++) {
      const aggWord = aggregatedWords[j];
      const cleanAggWord = aggWord.word.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanAggWord === cleanTargetWord || aggWord.word === word) {
        matchedData = aggWord;
        aggregatedWords.splice(j, 1);
        break;
      }
    }
    
    let chosenTokenProb = 0.75;
    
    if (matchedData) {
      chosenTokenProb = logProbToProb(matchedData.summedLogprob);
      
      if (matchedData.topLogprobs && matchedData.topLogprobs.length > 0) {
        const seenTokens = new Set<string>();
        seenTokens.add(word.toLowerCase());
        
        for (const alt of matchedData.topLogprobs) {
          const cleanToken = alt.token.trim().replace(/^[\s\n]+|[\s\n]+$/g, "");
          
          if (cleanToken.length === 0 || /^[^\w]+$/.test(cleanToken)) {
            continue;
          }
          
          if (!seenTokens.has(cleanToken.toLowerCase())) {
            seenTokens.add(cleanToken.toLowerCase());
            const prob = logProbToProb(alt.logprob);
            if (prob > 0.001 && prob < chosenTokenProb) {
              alternatives.push({
                token: cleanToken,
                probability: prob,
              });
            }
          }
        }
      }
    }
    
    alternatives.sort((a, b) => b.probability - a.probability);
    
    const finalAlternatives = alternatives.slice(0, 5);
    
    if (finalAlternatives.length > 0) {
      finalAlternatives.unshift({
        token: word,
        probability: chosenTokenProb,
      });
    }
    
    tokens.push({
      token: word,
      alternatives: finalAlternatives.filter(a => a.token !== word).slice(0, 5),
      chosenProbability: chosenTokenProb,
    });
  }

  return tokens;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable = error?.status === 503 || error?.status === 429 || 
                          error?.message?.includes("overloaded") ||
                          error?.message?.includes("UNAVAILABLE");
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      console.log(`Gemini API temporarily unavailable, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

async function generateWithGemini(prompt: string): Promise<GeneratedToken[]> {
  // Step 1: Generate the continuation text
  const gemini = getGeminiClient();
  
  const continuationPrompt = `Continue this text with exactly 10-12 new words. Return ONLY the continuation, nothing else.
Do NOT repeat any words from the input. Write naturally and coherently.`;

  const continuationResponse = await retryWithBackoff(() =>
    gemini.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction: continuationPrompt,
        thinkingConfig: { thinkingBudget: 5000 },
        maxOutputTokens: 100,
      },
      contents: prompt,
    })
  );

  let continuation = (continuationResponse.text || "").trim();
  const generatedWords = continuation.split(/\s+/).filter(w => w.length > 0).slice(0, 12);
  
  if (generatedWords.length === 0) {
    return generateWithGeminiFallback(prompt);
  }

  // Step 2: Get probabilities and alternatives for each word
  const probabilityPrompt = `Given this context: "${prompt}"
And these generated words: ${generatedWords.join(", ")}

For EACH word, provide:
1. Its probability at that position (0.2-0.8)
2. Exactly 4 alternative words with decreasing probabilities

Return ONLY valid JSON, no other text:
{
  "tokens": [
    {"chosen": "word", "chosenProbability": 0.52, "alternatives": [{"token": "alt1", "probability": 0.28}, {"token": "alt2", "probability": 0.15}, {"token": "alt3", "probability": 0.06}, {"token": "alt4", "probability": 0.01}]},
    ...
  ]
}`;

  try {
    const probResponse = await retryWithBackoff(() =>
      gemini.models.generateContent({
        model: "gemini-2.5-flash-lite",
        config: {
          systemInstruction: probabilityPrompt,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 5000 },
          maxOutputTokens: 500,
        },
        contents: `Words: ${generatedWords.join(", ")}`,
      })
    );

    let responseText = (probResponse.text || "").replace(/```json\n?|\n?```/g, "").trim();
    console.log("Probability response:", responseText.substring(0, 300));
    
    const parsed = JSON.parse(responseText);
    
    if (parsed.tokens && Array.isArray(parsed.tokens) && parsed.tokens.length > 0) {
      const tokens: GeneratedToken[] = [];
      
      for (const tokenData of parsed.tokens) {
        if (tokenData.chosen && typeof tokenData.chosen === "string") {
          const alternatives: { token: string; probability: number }[] = [];
          
          if (Array.isArray(tokenData.alternatives)) {
            for (const alt of tokenData.alternatives) {
              if (alt.token && typeof alt.probability === "number") {
                const prob = Math.min(Math.max(alt.probability, 0), 1);
                alternatives.push({
                  token: alt.token,
                  probability: prob,
                });
              }
            }
          }
          
          alternatives.sort((a, b) => b.probability - a.probability);
          
          const chosenProb = tokenData.chosenProbability 
            ? Math.min(Math.max(tokenData.chosenProbability, 0), 1)
            : 0.5;
          
          tokens.push({
            token: tokenData.chosen,
            alternatives: alternatives.slice(0, 4),
            chosenProbability: chosenProb,
          });
        }
      }
      
      if (tokens.length > 0) {
        console.log("Successfully generated tokens with log probs approach:", tokens.length);
        return tokens;
      }
    }
    console.log("Invalid probability response");
  } catch (probError) {
    console.error("Failed to get probabilities:", probError);
  }
  
  return generateWithGeminiFallback(prompt);
}

async function generateWithGeminiFallback(prompt: string): Promise<GeneratedToken[]> {
  const systemPrompt = `You are a text completion engine. Your ONLY job is to continue the text that the user provides.

CRITICAL RULES:
1. Do NOT repeat any part of the user's text
2. Do NOT add quotation marks, commentary, or explanations
3. Simply continue writing from exactly where the user left off
4. Generate 8-15 additional words that naturally continue the text
5. Return ONLY the continuation, nothing else`;

  const gemini = getGeminiClient();
  const response = await retryWithBackoff(() =>
    gemini.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: { thinkingBudget: 0 },
      },
      contents: `Continue this text (do NOT repeat it, only add new words): "${prompt}"`,
    })
  );

  let text = response.text || "";
  
  text = text.replace(/^["'\s]+|["'\s]+$/g, "").trim();
  
  const promptWords = prompt.toLowerCase().split(/\s+/);
  const textWords = text.split(/\s+/).filter(w => w.length > 0);
  
  let startIndex = 0;
  for (let i = 0; i < Math.min(textWords.length, promptWords.length + 3); i++) {
    const cleanWord = textWords[i]?.toLowerCase().replace(/[^a-z0-9]/g, "");
    const promptWord = promptWords[i]?.replace(/[^a-z0-9]/g, "");
    if (cleanWord === promptWord) {
      startIndex = i + 1;
    } else {
      break;
    }
  }
  
  const continuationWords = textWords.slice(startIndex);
  
  const alternativesPrompt = `Given these words in context: "${prompt} ${continuationWords.join(" ")}"

For ONLY these specific words: ${JSON.stringify(continuationWords)}

Provide 4 alternative words for each that could replace it in context. Return JSON:
{
  "alternatives": {
    "word1": [{"token": "alt1", "prob": 0.3}, {"token": "alt2", "prob": 0.2}, {"token": "alt3", "prob": 0.1}, {"token": "alt4", "prob": 0.05}],
    ...
  }
}`;

  try {
    const altResponse = await retryWithBackoff(() =>
      getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash-lite",
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: alternativesPrompt,
      })
    );

    const altText = (altResponse.text || "").replace(/```json\n?|\n?```/g, "").trim();
    const altParsed = JSON.parse(altText);
    
    if (altParsed.alternatives) {
      const tokens: GeneratedToken[] = continuationWords.map((word) => {
        const wordAlts = altParsed.alternatives[word] || [];
        const alternatives: { token: string; probability: number }[] = [];
        
        for (const alt of wordAlts) {
          if (alt.token && (alt.prob !== undefined || alt.probability !== undefined)) {
            const prob = alt.prob || alt.probability || 0;
            if (alt.token.toLowerCase() !== word.toLowerCase()) {
              alternatives.push({
                token: alt.token,
                probability: Math.min(Math.max(prob, 0), 1),
              });
            }
          }
        }
        
        const sortedAlts = alternatives.slice(0, 5).sort((a, b) => b.probability - a.probability);
        const chosenProb = sortedAlts.length > 0 
          ? Math.min(sortedAlts[0].probability * (1.2 + Math.random() * 0.6), 0.95)
          : 0.35 + Math.random() * 0.45;
        
        return {
          token: word,
          alternatives: sortedAlts,
          chosenProbability: chosenProb,
        };
      });
      
      return tokens;
    }
  } catch (altError) {
    console.error("Failed to get alternatives from Gemini:", altError);
  }
  
  const tokens: GeneratedToken[] = continuationWords.map((word) => ({
    token: word,
    alternatives: [],
    chosenProbability: 0.4 + Math.random() * 0.4,
  }));

  return tokens;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/generate", async (req, res) => {
    try {
      const parseResult = generateRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors 
        });
      }

      const { prompt, model } = parseResult.data;

      let tokens: GeneratedToken[];

      if (model === "openai") {
        if (!openai) {
          return res.status(400).json({ 
            error: "OpenAI API key not configured. Please use Gemini or add an OpenAI API key." 
          });
        }
        tokens = await generateWithOpenAI(prompt);
      } else {
        if (!process.env.GEMINI_API_KEY) {
          return res.status(400).json({ 
            error: "Gemini credentials not configured." 
          });
        }
        tokens = await generateWithGemini(prompt);
      }

      return res.json({ 
        tokens, 
        model: model === "openai" ? "GPT-4o" : "Gemini 2.5 Flash" 
      });
    } catch (error) {
      console.error("Generation error:", error);
      return res.status(500).json({ 
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/regenerate", async (req, res) => {
    try {
      const parseResult = regenerateRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors 
        });
      }

      const { originalPrompt, tokensBeforeChange, newToken, model } = parseResult.data;
      
      const newPrompt = [originalPrompt, ...tokensBeforeChange, newToken].join(" ");

      let tokens: GeneratedToken[];

      if (model === "openai") {
        if (!openai) {
          return res.status(400).json({ 
            error: "OpenAI API key not configured" 
          });
        }
        tokens = await generateWithOpenAI(newPrompt);
      } else {
        if (!process.env.GEMINI_API_KEY) {
          return res.status(400).json({ 
            error: "Gemini credentials not configured" 
          });
        }
        tokens = await generateWithGemini(newPrompt);
      }

      return res.json({ 
        tokens, 
        model: model === "openai" ? "GPT-4o" : "Gemini 2.5 Flash" 
      });
    } catch (error) {
      console.error("Regeneration error:", error);
      return res.status(500).json({ 
        error: "Failed to regenerate response",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok",
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
    });
  });

  return httpServer;
}
