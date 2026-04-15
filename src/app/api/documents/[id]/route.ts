import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDocumentsIndex } from "@/lib/pinecone";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findFirst({ where: { id, userId: session.user.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findFirst({ where: { id, userId: session.user.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (doc.vectorId) {
    try {
      const docsIndex = getDocumentsIndex(session.user.id);
      await docsIndex.deleteMany([doc.vectorId]);
    } catch (e) {
      console.error("Pinecone delete error:", e);
    }
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
