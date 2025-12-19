import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { z } from "zod";

const generateRequestSchema = z.object({
  prompt: z.string().min(1),
  model: z.enum(["gemini", "openai"]).default("gemini"),
});

const regenerateRequestSchema = z.object({
  originalPrompt: z.string(),
  tokensBeforeChange: z.array(z.string()),
  newToken: z.string(),
  model: z.enum(["gemini", "openai"]).default("gemini"),
});

type GeneratedToken = {
  token: string;
  alternatives: { token: string; probability: number }[];
  chosenProbability: number;
};

function getGeminiClient() {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  
  throw new Error("No Gemini API key configured. Please set GEMINI_API_KEY.");
}

function getOpenAIClient() {
  return process.env.OPENAI_API_KEY 
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
}

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
  const openai = getOpenAIClient();
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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

async function generateWithGemini(prompt: string): Promise<GeneratedToken[]> {
  const gemini = getGeminiClient();
  
  const systemPrompt = `You are an expert text completion engine that simulates natural language model behavior with probability distributions. Your task is to continue text with complete accuracy and provide realistic, context-aware probabilities.

DETAILED INSTRUCTIONS:

1. TEXT CONTINUATION:
   - Generate exactly 10-12 new words that naturally follow the given text
   - Maintain semantic coherence and grammatical correctness
   - Never repeat any words from the input text
   - Consider context and writing style

2. PROBABILITY ASSIGNMENT:
   - For EACH generated word, assign a "chosen probability" representing how likely that word is at that position
   - The chosen probability should vary based on context predictability:
     * High probability (0.6-0.8): Highly predictable words (articles, prepositions after certain contexts)
     * Medium probability (0.4-0.6): Words with moderate predictability
     * Lower probability (0.2-0.5): Less certain words in more creative contexts
   - Use realistic, varied decimal values - NOT round numbers

3. ALTERNATIVES FOR EVERY WORD:
   - For EACH generated word, provide exactly 4 alternative words that could reasonably replace it
   - Alternative words must be contextually appropriate
   - Assign decreasing probabilities to alternatives:
     * 1st alternative: typically 0.15-0.35
     * 2nd alternative: typically 0.08-0.20
     * 3rd alternative: typically 0.04-0.12
     * 4th alternative: typically 0.02-0.06
   - Probabilities must be realistic and contextually sound
   - Ensure alternatives sum to less than 0.5

4. OUTPUT FORMAT (MUST BE VALID JSON):
{
  "tokens": [
    {
      "chosen": "word",
      "chosenProbability": 0.52,
      "alternatives": [
        {"token": "alternative1", "probability": 0.28},
        {"token": "alternative2", "probability": 0.12},
        {"token": "alternative3", "probability": 0.06},
        {"token": "alternative4", "probability": 0.02}
      ]
    }
  ]
}

CRITICAL RULES:
- EVERY word must have EXACTLY 4 alternatives - no exceptions
- ALL probabilities must be realistic decimal values with 2-3 decimal places
- Use varied probability values (0.47, 0.23, 0.18, 0.31, 0.14, 0.09, 0.05, 0.03, etc.)
- Return ONLY the JSON object, nothing else
- Do NOT include markdown code blocks or backticks`;

  const response = await retryWithBackoff(() => 
    gemini.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 5000 },
        maxOutputTokens: 500,
      },
      contents: `Continue this text with probability analysis: "${prompt}"`,
    })
  );

  let responseText = response.text || "";
  
  try {
    responseText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    
    const parsed = JSON.parse(responseText);
    
    if (parsed.tokens && Array.isArray(parsed.tokens)) {
      const tokens: GeneratedToken[] = [];
      
      for (const tokenData of parsed.tokens) {
        if (tokenData.chosen && typeof tokenData.chosen === "string") {
          const alternatives: { token: string; probability: number }[] = [];
          
          if (Array.isArray(tokenData.alternatives)) {
            for (const alt of tokenData.alternatives) {
              if (alt.token && typeof alt.probability === "number") {
                const prob = Math.min(Math.max(alt.probability, 0), 1);
                if (alt.token.toLowerCase() !== tokenData.chosen.toLowerCase()) {
                  alternatives.push({
                    token: alt.token,
                    probability: prob,
                  });
                }
              }
            }
          }
          
          alternatives.sort((a, b) => b.probability - a.probability);
          
          const chosenProb = tokenData.chosenProbability 
            ? Math.min(Math.max(tokenData.chosenProbability, 0), 1)
            : alternatives.length > 0 
              ? Math.min(alternatives[0].probability * (1.3 + Math.random() * 0.5), 0.95)
              : 0.45 + Math.random() * 0.35;
          
          tokens.push({
            token: tokenData.chosen,
            alternatives: alternatives.slice(0, 5),
            chosenProbability: chosenProb,
          });
        }
      }
      
      if (tokens.length > 0) {
        return tokens;
      }
    }
  } catch (parseError) {
    console.error("Failed to parse Gemini JSON response, falling back to simple generation:", parseError);
  }
  
  return generateWithGeminiFallback(prompt);
}

async function generateWithGeminiFallback(prompt: string): Promise<GeneratedToken[]> {
  const gemini = getGeminiClient();
  
  const systemPrompt = `You are a text completion engine. Your ONLY job is to continue the text that the user provides.

CRITICAL RULES:
1. Do NOT repeat any part of the user's text
2. Do NOT add quotation marks, commentary, or explanations
3. Simply continue writing from exactly where the user left off
4. Generate 8-15 additional words that naturally continue the text
5. Return ONLY the continuation, nothing else`;

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
  
  const tokens: GeneratedToken[] = continuationWords.map((word) => ({
    token: word,
    alternatives: [],
    chosenProbability: 0.4 + Math.random() * 0.4,
  }));

  return tokens;
}

async function handleGenerate(req: VercelRequest, res: VercelResponse) {
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
      if (!process.env.OPENAI_API_KEY) {
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

    return res.status(200).json({ 
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
}

async function handleRegenerate(req: VercelRequest, res: VercelResponse) {
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
      if (!process.env.OPENAI_API_KEY) {
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

    return res.status(200).json({ 
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
}

function handleHealth(res: VercelResponse) {
  return res.status(200).json({ 
    status: "ok",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    openaiConfigured: !!process.env.OPENAI_API_KEY,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  
  if (url.includes('/api/health') || url === '/api/health') {
    if (req.method === 'GET') {
      return handleHealth(res);
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (url.includes('/api/generate') || url === '/api/generate') {
    if (req.method === 'POST') {
      return handleGenerate(req, res);
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (url.includes('/api/regenerate') || url === '/api/regenerate') {
    if (req.method === 'POST') {
      return handleRegenerate(req, res);
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(404).json({ error: "Not found" });
}
