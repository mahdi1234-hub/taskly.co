import { createOpenAI } from "@ai-sdk/openai";

export const cerebras = createOpenAI({
  apiKey: process.env.CEREBRAS_API_KEY!,
  baseURL: process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1",
});

// Available models: qwen-3-235b-a22b-instruct-2507, llama3.1-8b
export const CEREBRAS_MODEL = "qwen-3-235b-a22b-instruct-2507";

export const chatModel = cerebras(CEREBRAS_MODEL);
