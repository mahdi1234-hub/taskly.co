import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const chats = await prisma.chat.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(chats);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json().catch(() => ({ title: null }));

  const chat = await prisma.chat.create({
    data: {
      title: title || "New conversation",
      userId: session.user.id,
    },
  });

  return NextResponse.json(chat);
}
