import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chat = await prisma.chat.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(chat);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.chat.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
