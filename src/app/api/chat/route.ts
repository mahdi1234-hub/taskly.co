import { auth } from "@/lib/auth";
import { cerebras } from "@/lib/cerebras";
import { prisma } from "@/lib/prisma";
import { getIndex } from "@/lib/pinecone";
import { streamText, tool } from "ai";
import { z } from "zod";

export const maxDuration = 60;

function generateSimpleVector(text: string): number[] {
  const dim = 1536;
  const vector = new Array(dim).fill(0);
  const normalized = text.toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vector[code % dim] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((s: number, v: number) => s + v * v, 0));
  if (magnitude > 0) for (let i = 0; i < dim; i++) vector[i] /= magnitude;
  return vector;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();
  const userId = session.user.id;

  const docCount = await prisma.document.count({ where: { userId } });
  const recentDocs = await prisma.document.findMany({
    where: { userId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, title: true, category: true, summary: true },
  });

  const docContext = recentDocs.length > 0
    ? `\nRecent documents:\n${recentDocs.map((d) => `- "${d.title}" (${d.category || "uncategorized"}): ${(d.summary || "").slice(0, 100)}`).join("\n")}`
    : "";

  const systemPrompt = `You are Taskly's AI document analyst. You help users understand, search, and analyze their documents.

## User context
- Total documents: ${docCount}
${docContext}

## Rules
1. NEVER invent or guess document contents. Every data point must come from a tool call.
2. Be concise and professional. No emojis, no filler.
3. When presenting 3+ items, use markdown tables.
4. Make document names clickable using: [Document Name](#doc:DOCUMENT_ID)
5. After tools return, present results directly. No preamble.`;

  const result = streamText({
    model: cerebras("llama-4-scout-17b-16e-instruct"),
    system: systemPrompt,
    messages,
    maxSteps: 5,
    tools: {
      search_documents: tool({
        description: "Search across all user documents using a text query.",
        parameters: z.object({
          query: z.string().describe("The search query"),
        }),
        execute: async ({ query }) => {
          try {
            const queryVector = generateSimpleVector(query);
            const index = getIndex();
            const results = await index.query({
              vector: queryVector,
              topK: 5,
              filter: { userId: { $eq: userId } },
              includeMetadata: true,
            });
            return {
              results: results.matches.map((m) => ({
                docId: String(m.metadata?.docId || m.id),
                title: String(m.metadata?.title || "Unknown"),
                category: String(m.metadata?.category || "other"),
                text: String(m.metadata?.text || "").slice(0, 300),
                score: m.score,
              })),
            };
          } catch {
            return { results: [] };
          }
        },
      }),
      list_documents: tool({
        description: "List the user's documents with optional filtering by category",
        parameters: z.object({
          category: z.string().optional().describe("Filter by category"),
        }),
        execute: async ({ category }) => {
          const where: Record<string, unknown> = { userId };
          if (category) where.category = category;
          const docs = await prisma.document.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, title: true, fileName: true, fileSize: true, status: true, category: true, tags: true, summary: true, createdAt: true },
          });
          return { documents: docs, total: docs.length };
        },
      }),
      get_document: tool({
        description: "Get full details about a specific document by ID",
        parameters: z.object({
          documentId: z.string().describe("The document ID"),
        }),
        execute: async ({ documentId }) => {
          const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
          if (!doc) return { error: "Document not found" };
          return { id: doc.id, title: doc.title, fileName: doc.fileName, status: doc.status, category: doc.category, tags: doc.tags, summary: doc.summary };
        },
      }),
      get_analytics: tool({
        description: "Get analytics about the user's document collection",
        parameters: z.object({}),
        execute: async () => {
          const [total, byStatus, byCategory] = await Promise.all([
            prisma.document.count({ where: { userId } }),
            prisma.document.groupBy({ by: ["status"], where: { userId }, _count: true }),
            prisma.document.groupBy({ by: ["category"], where: { userId }, _count: true }),
          ]);
          return {
            total,
            byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
            byCategory: byCategory.map((c) => ({ category: c.category || "uncategorized", count: c._count })),
          };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
