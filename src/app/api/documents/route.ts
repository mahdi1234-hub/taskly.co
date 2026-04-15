import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDocumentsIndex, generateSimpleVector } from "@/lib/pinecone";
import { cerebras } from "@/lib/cerebras";
import { generateText } from "ai";
import { NextResponse } from "next/server";

// Try to import Trigger.dev task for background processing
let triggerAvailable = false;
let processDocumentTask: any = null;
try {
  const mod = require("@/trigger/process-document");
  processDocumentTask = mod.processDocumentTask;
  triggerAvailable = true;
} catch {
  // Trigger.dev not available, will use inline processing
}

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

  // Use Trigger.dev if available, otherwise process inline
  if (triggerAvailable && processDocumentTask) {
    try {
      await processDocumentTask.trigger({
        docId: doc.id,
        text: text.slice(0, 50000), // Limit payload size
        userId: session.user.id,
      });
    } catch {
      // Fallback to inline processing
      processDocumentInline(doc.id, text, session.user.id).catch(console.error);
    }
  } else {
    processDocumentInline(doc.id, text, session.user.id).catch(console.error);
  }

  return NextResponse.json(doc);
}

async function processDocumentInline(docId: string, text: string, userId: string) {
  try {
    const truncatedText = text.slice(0, 8000);

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

    const docVector = generateSimpleVector(text);
    const docsIndex = getDocumentsIndex(userId);
    const docTitle = (await prisma.document.findUnique({ where: { id: docId } }))?.title || "";

    await docsIndex.upsert([{
      id: docId,
      values: docVector,
      metadata: { docId, title: docTitle, text: truncatedText.slice(0, 4000), category, tags: tags.join(","), summary },
    }] as any);

    await prisma.document.update({
      where: { id: docId },
      data: { status: "COMPLETED", summary, category, tags, vectorId: docId },
    });
  } catch (error) {
    console.error("Document processing error:", error);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } });
  }
}
