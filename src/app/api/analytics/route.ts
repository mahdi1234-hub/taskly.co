import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { subDays, format } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [total, byStatus, byCategory, recentDocs] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.document.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
    prisma.document.groupBy({
      by: ["category"],
      where: { userId },
      _count: true,
    }),
    prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  // Build activity data for last 14 days
  const activityMap: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const date = format(subDays(new Date(), i), "MMM dd");
    activityMap[date] = 0;
  }

  for (const doc of recentDocs) {
    const date = format(new Date(doc.createdAt), "MMM dd");
    if (date in activityMap) {
      activityMap[date]++;
    }
  }

  const recentActivity = Object.entries(activityMap).map(([date, count]) => ({
    date,
    count,
  }));

  return NextResponse.json({
    total,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    byCategory: byCategory.map((c) => ({
      category: c.category || "uncategorized",
      count: c._count,
    })),
    recentActivity,
  });
}
