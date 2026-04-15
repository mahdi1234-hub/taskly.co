import { task } from "@trigger.dev/sdk/v3";
import { PrismaClient } from "@prisma/client";
import { Pinecone } from "@pinecone-database/pinecone";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const prisma = new PrismaClient();
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const cerebras = createOpenAI({
  apiKey: process.env.CEREBRAS_API_KEY!,
  baseURL: process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1",
});

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

export const processDocumentTask = task({
  id: "process-document",
  maxDuration: 120,
  run: async (payload: { docId: string; text: string; userId: string }) => {
    const { docId, text, userId } = payload;

    try {
      const truncatedText = text.slice(0, 8000);

      // Generate summary and metadata with AI
      const { text: aiResult } = await generateText({
        model: cerebras("qwen-3-235b-a22b-instruct-2507"),
        prompt: `Analyze this document and return a JSON object with:
- "summary": a 2-3 sentence summary
- "category": one of: contract, report, invoice, letter, research, manual, policy, other
- "tags": array of 3-5 relevant keywords

Document text:
${truncatedText}

Return ONLY valid JSON, no other text.`,
      });

      let summary = "Document processed";
      let category = "other";
      let tags: string[] = [];

      try {
        const parsed = JSON.parse(aiResult.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        summary = parsed.summary || summary;
        category = parsed.category || category;
        tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      } catch {
        summary = aiResult.slice(0, 500);
      }

      // Store vector in Pinecone under user's docs namespace
      const docVector = generateSimpleVector(text);
      const index = pinecone.index(process.env.PINECONE_INDEX || "rag-knowledge-base").namespace(`docs-${userId}`);
      const docTitle = (await prisma.document.findUnique({ where: { id: docId } }))?.title || "";

      await index.upsert([{
        id: docId,
        values: docVector,
        metadata: {
          docId,
          title: docTitle,
          text: truncatedText.slice(0, 4000),
          category,
          tags: tags.join(","),
          summary,
        },
      }] as any);

      // Update document in database
      await prisma.document.update({
        where: { id: docId },
        data: { status: "COMPLETED", summary, category, tags, vectorId: docId },
      });

      return { success: true, docId, category, tags };
    } catch (error) {
      console.error("Document processing error:", error);
      await prisma.document.update({
        where: { id: docId },
        data: { status: "FAILED" },
      });
      throw error;
    }
  },
});
