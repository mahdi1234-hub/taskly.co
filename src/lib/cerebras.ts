import { createOpenAI } from "@ai-sdk/openai";

export const cerebras = createOpenAI({
  apiKey: process.env.CEREBRAS_API_KEY!,
  baseURL: process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1",
});

export const chatModel = cerebras("llama-4-scout-17b-16e-instruct");
