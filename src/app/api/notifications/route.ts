import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    notifications: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      unread: !n.read,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
