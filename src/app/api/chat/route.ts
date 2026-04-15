import { auth } from "@/lib/auth";
import { cerebras } from "@/lib/cerebras";
import { prisma } from "@/lib/prisma";
import { getDocumentsIndex, getMemoryIndex, generateSimpleVector } from "@/lib/pinecone";
import { streamText, tool } from "ai";
import { z } from "zod";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, chatId } = await req.json();
  const userId = session.user.id;

  // Persist user message to DB
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
  if (chatId && lastUserMsg) {
    await prisma.chatMessage.create({
      data: { chatId, role: "user", content: lastUserMsg.content },
    }).catch(() => {});
  }

  // Retrieve relevant memories for context
  let memoryContext = "";
  if (lastUserMsg?.content) {
    try {
      const memoryIdx = getMemoryIndex(userId);
      const queryVec = generateSimpleVector(lastUserMsg.content);
      const memResults = await memoryIdx.query({
        vector: queryVec,
        topK: 5,
        includeMetadata: true,
      });
      const memories = memResults.matches
        .filter((m) => (m.score || 0) > 0.3)
        .map((m) => `[${m.metadata?.timestamp || ""}] ${m.metadata?.text || ""}`);
      if (memories.length > 0) {
        memoryContext = `\n\n## Conversation memory (from previous sessions)\n${memories.join("\n")}`;
      }
    } catch {
      // Memory retrieval is non-critical
    }
  }

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

  const systemPrompt = `You are Taskly's AI document analyst. You help users understand, search, and analyze their documents. You remember previous conversations.

## User context
- Total documents: ${docCount}
${docContext}
${memoryContext}

## Rules
1. NEVER invent or guess document contents. Every data point must come from a tool call.
2. Be concise and professional. No emojis, no filler.
3. When presenting 3+ items, use markdown tables.
4. Make document names clickable using: [Document Name](#doc:DOCUMENT_ID)
5. After tools return, present results directly. No preamble.
6. If you recall something from memory, mention it naturally.
7. Use **bold** for important values, headers with ## for sections.`;

  const result = streamText({
    model: cerebras("qwen-3-235b-a22b-instruct-2507"),
    system: systemPrompt,
    messages,
    maxSteps: 5,
    tools: {
      search_documents: tool({
        description: "Search across all user documents using a text query. Returns matching documents with relevant text snippets.",
        parameters: z.object({
          query: z.string().describe("The search query"),
        }),
        execute: async ({ query }) => {
          try {
            const queryVector = generateSimpleVector(query);
            const docsIdx = getDocumentsIndex(userId);
            const results = await docsIdx.query({
              vector: queryVector,
              topK: 5,
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
      remember: tool({
        description: "Save an important fact or user preference to long-term memory for future conversations",
        parameters: z.object({
          fact: z.string().describe("The fact or preference to remember"),
        }),
        execute: async ({ fact }) => {
          try {
            const memIdx = getMemoryIndex(userId);
            const vec = generateSimpleVector(fact);
            const id = `mem-${Date.now()}`;
            await memIdx.upsert([{
              id,
              values: vec,
              metadata: {
                text: fact,
                timestamp: new Date().toISOString(),
                type: "memory",
              },
            }] as any);
            return { saved: true, id };
          } catch {
            return { saved: false };
          }
        },
      }),
      recall_memory: tool({
        description: "Search long-term memory for relevant past conversations and facts",
        parameters: z.object({
          query: z.string().describe("What to search for in memory"),
        }),
        execute: async ({ query }) => {
          try {
            const memIdx = getMemoryIndex(userId);
            const vec = generateSimpleVector(query);
            const results = await memIdx.query({
              vector: vec,
              topK: 10,
              includeMetadata: true,
            });
            return {
              memories: results.matches
                .filter((m) => (m.score || 0) > 0.2)
                .map((m) => ({
                  text: String(m.metadata?.text || ""),
                  timestamp: String(m.metadata?.timestamp || ""),
                  score: m.score,
                })),
            };
          } catch {
            return { memories: [] };
          }
        },
      }),
    },
    onFinish: async (result) => {
      // Persist assistant response to DB
      if (chatId && result.text) {
        await prisma.chatMessage.create({
          data: { chatId, role: "assistant", content: result.text },
        }).catch(() => {});
      }

      // Auto-save conversation summary to memory
      if (lastUserMsg?.content && result.text) {
        try {
          const summary = `User asked: "${lastUserMsg.content.slice(0, 100)}". Assistant responded about: ${result.text.slice(0, 150)}`;
          const memIdx = getMemoryIndex(userId);
          const vec = generateSimpleVector(summary);
          await memIdx.upsert([{
            id: `auto-${Date.now()}`,
            values: vec,
            metadata: {
              text: summary,
              timestamp: new Date().toISOString(),
              type: "auto-summary",
            },
          }] as any);
        } catch {
          // Non-critical
        }
      }
    },
  });

  return result.toDataStreamResponse();
}
