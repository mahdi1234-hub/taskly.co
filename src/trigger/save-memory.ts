import { task } from "@trigger.dev/sdk/v3";
import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

function generateSimpleVector(text: string, dim = 384): number[] {
  const vector = new Array(dim).fill(0);
  const normalized = text.toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vector[code % dim] += 1;
    if (i < normalized.length - 1) {
      const bigram = (code * 31 + normalized.charCodeAt(i + 1)) % dim;
      vector[bigram] += 0.5;
    }
  }
  const magnitude = Math.sqrt(vector.reduce((s: number, v: number) => s + v * v, 0));
  if (magnitude > 0) for (let i = 0; i < dim; i++) vector[i] /= magnitude;
  return vector;
}

export const saveMemoryTask = task({
  id: "save-memory",
  maxDuration: 30,
  run: async (payload: { userId: string; text: string; type: string }) => {
    const { userId, text, type } = payload;

    const memoryIndex = pinecone
      .index(process.env.PINECONE_INDEX || "rag-knowledge-base")
      .namespace(`memory-${userId}`);

    const vec = generateSimpleVector(text);
    const id = `${type}-${Date.now()}`;

    await memoryIndex.upsert([{
      id,
      values: vec,
      metadata: {
        text,
        timestamp: new Date().toISOString(),
        type,
      },
    }] as any);

    return { saved: true, id };
  },
});
