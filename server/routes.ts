import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";
import { generateRequestSchema, regenerateRequestSchema, type GeneratedToken } from "@shared/schema";

function getGeminiClient() {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  throw new Error("No Gemini API key configured. Please set GEMINI_API_KEY.");
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
  const systemPrompt = `You are a text completion engine that generates token continuations with alternatives.

STRICT REQUIREMENTS:
1. Generate EXACTLY 10-12 words to continue the text (NO MORE, NO LESS)
2. For EACH generated word, provide EXACTLY 4 alternative words
3. Return ONLY valid JSON, nothing else
4. Do NOT repeat any words from the input text

Format output as JSON:
{
  "tokens": [
    {"chosen": "word", "chosenProbability": 0.45, "alternatives": [{"token": "alt1", "probability": 0.25}, {"token": "alt2", "probability": 0.15}, {"token": "alt3", "probability": 0.10}, {"token": "alt4", "probability": 0.05}]},
    ...
  ]
}

Probability rules:
- Each chosen word: 0.35-0.75 (varies by predictability)
- Alternatives: decreasing order, sum < 0.5
- Use specific decimals: 0.47, 0.23, 0.18, 0.12, 0.09, 0.06, 0.04, 0.03`;

  const gemini = getGeminiClient();
  const response = await retryWithBackoff(() => 
    gemini.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 500,
      },
      contents: `Continue: "${prompt}"`,
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
                  alternatives.push({ token: alt.token, probability: prob });
                }
              }
            }
          }
          
          alternatives.sort((a, b) => b.probability - a.probability);
          
          const chosenProb = tokenData.chosenProbability 
            ? Math.min(Math.max(tokenData.chosenProbability, 0), 1)
            : alternatives.length > 0 
              ? Math.min(alternatives[0].probability * 1.3, 0.95)
              : 0.45 + Math.random() * 0.35;
          
          tokens.push({
            token: tokenData.chosen,
            alternatives: alternatives.slice(0, 4),
            chosenProbability: chosenProb,
          });
        }
      }
      
      if (tokens.length > 0) return tokens;
    }
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", parseError);
  }
  
  throw new Error("Failed to generate tokens");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/generate", async (req, res) => {
    try {
      const parseResult = generateRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request", details: parseResult.error.errors });
      }

      const { prompt } = parseResult.data;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ error: "Gemini credentials not configured." });
      }

      const tokens = await generateWithGemini(prompt);
      return res.json({ tokens, model: "Gemini 2.5 Flash Lite" });
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
        return res.status(400).json({ error: "Invalid request", details: parseResult.error.errors });
      }

      const { originalPrompt, tokensBeforeChange, newToken } = parseResult.data;
      const newPrompt = [originalPrompt, ...tokensBeforeChange, newToken].join(" ");

      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ error: "Gemini credentials not configured" });
      }

      const tokens = await generateWithGemini(newPrompt);
      return res.json({ tokens, model: "Gemini 2.5 Flash Lite" });
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
    });
  });

  return httpServer;
}
