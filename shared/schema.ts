import { z } from "zod";

// Token probability data
export const tokenProbabilitySchema = z.object({
  token: z.string(),
  probability: z.number(),
});

export type TokenProbability = z.infer<typeof tokenProbabilitySchema>;

// Generated token with alternatives
export const generatedTokenSchema = z.object({
  token: z.string(),
  alternatives: z.array(tokenProbabilitySchema),
  chosenProbability: z.number().optional(),
});

export type GeneratedToken = z.infer<typeof generatedTokenSchema>;

// Generation request
export const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.enum(["gemini", "openai"]),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

// Generation response
export const generateResponseSchema = z.object({
  tokens: z.array(generatedTokenSchema),
  model: z.string(),
});

export type GenerateResponse = z.infer<typeof generateResponseSchema>;

// Regenerate request - for when user clicks an alternative token
export const regenerateRequestSchema = z.object({
  originalPrompt: z.string().min(1),
  tokensBeforeChange: z.array(z.string()),
  newToken: z.string(),
  model: z.enum(["gemini", "openai"]),
});

export type RegenerateRequest = z.infer<typeof regenerateRequestSchema>;

// Preset prompts for exhibition
export const presetPrompts = [
  "In the historic city of Bidar, Karnataka, the ancient fort",
  "The transformer architecture works by",
  "Artificial intelligence helps students learn by",
  "The future of education will be shaped by",
  "When machines understand language, they can",
];
