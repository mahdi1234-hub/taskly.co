import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getIndex } from "@/lib/pinecone";
import { cerebras } from "@/lib/cerebras";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = buffer.toString("utf-8");

  // Create document record
  const doc = await prisma.document.create({
    data: {
      title: file.name.replace(/\.[^/.]+$/, ""),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "text/plain",
      status: "PROCESSING",
      userId: session.user.id,
    },
  });

  // Process in background (inline for simplicity)
  processDocument(doc.id, text, session.user.id).catch(console.error);

  return NextResponse.json(doc);
}

async function processDocument(docId: string, text: string, userId: string) {
  try {
    const truncatedText = text.slice(0, 8000);

    // Generate summary and category with AI
    const { text: aiResult } = await generateText({
      model: cerebras("llama-4-scout-17b-16e-instruct"),
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

    // Generate embedding and store in Pinecone
    // Use a simple hash-based approach for the vector since Cerebras may not have embeddings
    const simpleVector = generateSimpleVector(text);

    const index = getIndex();
    await index.upsert({
      records: [{
        id: docId,
        values: simpleVector,
        metadata: {
          userId,
          docId,
          title: (await prisma.document.findUnique({ where: { id: docId } }))?.title || "",
          text: truncatedText.slice(0, 4000),
          category,
          tags: tags.join(","),
        },
      }],
    });

    await prisma.document.update({
      where: { id: docId },
      data: {
        status: "COMPLETED",
        summary,
        category,
        tags,
        vectorId: docId,
      },
    });
  } catch (error) {
    console.error("Document processing error:", error);
    await prisma.document.update({
      where: { id: docId },
      data: { status: "FAILED" },
    });
  }
}

// Generate a simple vector representation using character frequency
function generateSimpleVector(text: string): number[] {
  const dim = 1536; // Match common embedding dimensions
  const vector = new Array(dim).fill(0);
  const normalized = text.toLowerCase();

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const idx = code % dim;
    vector[idx] += 1;
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum: number, v: number) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}
