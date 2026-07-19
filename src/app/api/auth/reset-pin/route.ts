import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin, verifyResetToken } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phone = normalizePhone(String(body.phone || ""));
  const pin = String(body.pin || "");
  const resetToken = String(body.resetToken || "");

  if (!phone || pin.length !== 4 || !resetToken) {
    return NextResponse.json(
      { error: "phone, 4-digit pin, and resetToken are required" },
      { status: 400 },
    );
  }

  const verified = verifyResetToken(resetToken);
  if (!verified || normalizePhone(verified.phone) !== phone) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const pinHash = await hashPin(pin);
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash, phoneVerifiedAt: user.phoneVerifiedAt ?? new Date() },
  });

  return NextResponse.json({ ok: true });
}
