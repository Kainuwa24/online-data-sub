import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    referralCode: user.referralCode,
    hasBvn: Boolean(user.bvn && user.bvn.replace(/\D/g, "").length === 11),
    hasNin: Boolean(user.nin && user.nin.replace(/\D/g, "").length === 11),
    // Masked for display
    bvnMasked: user.bvn ? `*******${user.bvn.slice(-4)}` : null,
    ninMasked: user.nin ? `*******${user.nin.slice(-4)}` : null,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const data: { name?: string; email?: string; bvn?: string; nin?: string } = {};

  if (body.name != null) data.name = String(body.name).trim();
  if (body.email != null) data.email = String(body.email).trim() || undefined;

  if (body.bvn != null) {
    const bvn = String(body.bvn).replace(/\D/g, "");
    if (bvn && bvn.length !== 11) {
      return NextResponse.json({ error: "BVN must be 11 digits" }, { status: 400 });
    }
    data.bvn = bvn || undefined;
  }
  if (body.nin != null) {
    const nin = String(body.nin).replace(/\D/g, "");
    if (nin && nin.length !== 11) {
      return NextResponse.json({ error: "NIN must be 11 digits" }, { status: 400 });
    }
    data.nin = nin || undefined;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json({
    ok: true,
    name: updated.name,
    email: updated.email,
    hasBvn: Boolean(updated.bvn && updated.bvn.replace(/\D/g, "").length === 11),
    hasNin: Boolean(updated.nin && updated.nin.replace(/\D/g, "").length === 11),
  });
}
