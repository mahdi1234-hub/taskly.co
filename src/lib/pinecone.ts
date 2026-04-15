import { Pinecone } from "@pinecone-database/pinecone";

const globalForPinecone = globalThis as unknown as { pinecone: Pinecone };

export const pinecone =
  globalForPinecone.pinecone ??
  new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

if (process.env.NODE_ENV !== "production") globalForPinecone.pinecone = pinecone;

const INDEX_NAME = process.env.PINECONE_INDEX || "rag-knowledge-base";

// The index dimension is 384
export const VECTOR_DIMENSION = 384;

export function getDocumentsIndex(userId: string) {
  return pinecone.index(INDEX_NAME).namespace(`docs-${userId}`);
}

export function getMemoryIndex(userId: string) {
  return pinecone.index(INDEX_NAME).namespace(`memory-${userId}`);
}

/**
 * Generate a vector with dimension matching the Pinecone index (384).
 */
export function generateSimpleVector(text: string): number[] {
  const dim = VECTOR_DIMENSION;
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
  if (magnitude > 0) {
    for (let i = 0; i < dim; i++) vector[i] /= magnitude;
  }
  return vector;
}
