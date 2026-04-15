import { Pinecone } from "@pinecone-database/pinecone";

const globalForPinecone = globalThis as unknown as { pinecone: Pinecone };

export const pinecone =
  globalForPinecone.pinecone ??
  new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

if (process.env.NODE_ENV !== "production") globalForPinecone.pinecone = pinecone;

export function getIndex() {
  return pinecone.index(process.env.PINECONE_INDEX || "rag-knowledge-base");
}
