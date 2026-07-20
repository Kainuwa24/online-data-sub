import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") || 100), 100);
  const type = searchParams.get("type") || searchParams.get("direction"); // CREDIT | DEBIT
  const category = searchParams.get("category") || undefined;

  const where: {
    userId: string;
    type?: "CREDIT" | "DEBIT";
    category?: string;
  } = { userId: user.id };

  if (type === "CREDIT" || type === "DEBIT") {
    where.type = type;
  }
  if (category) {
    where.category = category;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Number.isFinite(limit) && limit > 0 ? limit : 100,
  });

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      label: t.label,
      category: t.category,
      type: t.type,
      credit: t.type === "CREDIT",
      amountKobo: t.amountKobo,
      amountFormatted: (t.amountKobo / 100).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      status: t.status,
      reference: t.reference,
      meta: t.meta,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
