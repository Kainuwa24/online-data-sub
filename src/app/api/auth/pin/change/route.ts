import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { comparePin, hashPin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const currentPin = String(body.currentPin || "");
  const newPin = String(body.newPin || "");

  if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }
  if (currentPin === newPin) {
    return NextResponse.json(
      { error: "New PIN must be different from current PIN" },
      { status: 400 },
    );
  }
  if (!user.pinHash) {
    return NextResponse.json({ error: "No PIN set on this account" }, { status: 400 });
  }

  const ok = await comparePin(currentPin, user.pinHash);
  if (!ok) {
    return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
  }

  const pinHash = await hashPin(newPin);
  await prisma.user.update({ where: { id: user.id }, data: { pinHash } });

  return NextResponse.json({ ok: true, message: "PIN updated successfully" });
}
