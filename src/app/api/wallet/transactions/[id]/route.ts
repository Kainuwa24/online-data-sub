import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const t = await prisma.transaction.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!t) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  let meta: unknown = t.meta;
  if (typeof t.meta === "string") {
    try {
      meta = JSON.parse(t.meta);
    } catch {
      meta = t.meta;
    }
  }

  return NextResponse.json({
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
    meta,
    createdAt: t.createdAt.toISOString(),
  });
}
