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

// Preset prompts for exhibition
export const presetPrompts = [
  "Once upon a time, in a land far away",
  "The secret to happiness is",
  "In the year 2050, technology will",
  "The most important invention in human history was",
  "If I could travel anywhere, I would go to",
];
