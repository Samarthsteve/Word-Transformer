import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { generateRequestSchema, type GeneratedToken } from "@shared/schema";

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function generateWithGemini(prompt: string): Promise<GeneratedToken[]> {
  const systemPrompt = `You are a helpful assistant that generates thoughtful responses. 
Generate a response to the user's prompt. Keep the response concise but meaningful (10-20 words).
Return your response as plain text only.`;

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: systemPrompt,
    },
    contents: prompt,
  });

  const text = response.text || "";
  const words = text.split(/\s+/).filter(w => w.length > 0);

  const tokens: GeneratedToken[] = words.map((word) => {
    const alternatives = generateMockAlternatives(word);
    return {
      token: word,
      alternatives,
    };
  });

  return tokens;
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
        content: "Generate a thoughtful response. Keep it concise (10-20 words).",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 100,
  });

  const text = response.choices[0]?.message?.content || "";
  const words = text.split(/\s+/).filter(w => w.length > 0);

  const tokens: GeneratedToken[] = words.map((word) => {
    const alternatives = generateMockAlternatives(word);
    return {
      token: word,
      alternatives,
    };
  });

  return tokens;
}

function generateMockAlternatives(chosenWord: string): { token: string; probability: number }[] {
  const commonWords: Record<string, string[]> = {
    "The": ["A", "This", "That", "My", "Your"],
    "the": ["a", "this", "that", "my", "your"],
    "is": ["was", "are", "will", "has", "can"],
    "are": ["were", "is", "will", "have", "can"],
    "and": ["or", "but", "with", "then", "so"],
    "to": ["for", "into", "towards", "with", "at"],
    "of": ["for", "with", "in", "about", "from"],
    "a": ["the", "one", "this", "that", "some"],
    "in": ["on", "at", "with", "from", "to"],
    "that": ["which", "this", "what", "who", "where"],
    "it": ["this", "that", "he", "she", "they"],
    "for": ["to", "with", "about", "on", "of"],
    "you": ["we", "they", "one", "people", "someone"],
    "with": ["and", "for", "to", "by", "from"],
    "be": ["become", "stay", "remain", "feel", "seem"],
    "have": ["get", "need", "want", "take", "make"],
    "this": ["that", "the", "a", "one", "some"],
    "will": ["can", "would", "could", "should", "may"],
    "can": ["will", "could", "would", "may", "should"],
    "would": ["could", "will", "should", "can", "may"],
    "not": ["never", "also", "still", "just", "only"],
    "as": ["like", "when", "while", "if", "because"],
    "but": ["and", "yet", "however", "although", "while"],
    "from": ["to", "with", "by", "in", "at"],
    "by": ["with", "from", "through", "via", "using"],
    "or": ["and", "but", "nor", "yet", "so"],
    "an": ["the", "a", "one", "some", "any"],
    "your": ["my", "our", "their", "the", "his"],
    "which": ["that", "what", "who", "where", "when"],
  };

  const wordCategories: Record<string, string[]> = {
    emotion: ["happy", "sad", "excited", "calm", "anxious", "peaceful", "joyful", "content"],
    action: ["run", "walk", "think", "create", "build", "explore", "discover", "learn"],
    adjective: ["beautiful", "amazing", "wonderful", "incredible", "fantastic", "remarkable"],
    time: ["always", "never", "sometimes", "often", "rarely", "frequently", "occasionally"],
    connector: ["therefore", "however", "moreover", "furthermore", "consequently", "thus"],
  };

  let alternatives: string[] = [];

  if (commonWords[chosenWord]) {
    alternatives = commonWords[chosenWord];
  } else if (chosenWord.endsWith("ing")) {
    alternatives = ["thinking", "creating", "building", "exploring", "learning"];
  } else if (chosenWord.endsWith("ed")) {
    alternatives = ["created", "explored", "discovered", "experienced", "achieved"];
  } else if (chosenWord.endsWith("ly")) {
    alternatives = ["quickly", "slowly", "carefully", "gently", "quietly"];
  } else if (chosenWord.endsWith("tion")) {
    alternatives = ["creation", "exploration", "imagination", "innovation", "generation"];
  } else {
    const category = Object.values(wordCategories)[Math.floor(Math.random() * Object.keys(wordCategories).length)];
    alternatives = category.filter(w => w !== chosenWord.toLowerCase());
  }

  alternatives = alternatives.filter(w => w.toLowerCase() !== chosenWord.toLowerCase()).slice(0, 5);

  let remainingProb = 0.85;
  const probabilities: { token: string; probability: number }[] = [];

  alternatives.forEach((alt, index) => {
    const factor = Math.pow(0.5, index);
    const prob = remainingProb * factor * (0.3 + Math.random() * 0.3);
    probabilities.push({ token: alt, probability: Math.min(prob, 0.4) });
    remainingProb -= prob;
  });

  probabilities.sort((a, b) => b.probability - a.probability);

  return probabilities;
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
            error: "Gemini API key not configured." 
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

  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok",
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
    });
  });

  return httpServer;
}
