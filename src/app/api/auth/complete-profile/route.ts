import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth";
import { validateNgPhone } from "@/lib/phone";
import { isProfileComplete } from "@/lib/google-oauth";

/**
 * Completes first-time setup: phone + KYC + PIN.
 * PIN is required here for all new users (not collected at signup).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isProfileComplete(user)) {
    return NextResponse.json({ ok: true, alreadyComplete: true });
  }

  const body = await req.json();
  const phoneCheck = validateNgPhone(String(body.phone || user.phone || ""));
  const pin = String(body.pin || "");
  const name = body.name != null ? String(body.name).trim() : undefined;
  const bvn = String(body.bvn || "").replace(/\D/g, "");
  const nin = String(body.nin || "").replace(/\D/g, "");

  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
  }
  const phone = phoneCheck.phone;
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }
  if (bvn && bvn.length !== 11) {
    return NextResponse.json({ error: "BVN must be 11 digits" }, { status: 400 });
  }
  if (nin && nin.length !== 11) {
    return NextResponse.json({ error: "NIN must be 11 digits" }, { status: 400 });
  }
  if (!bvn && !nin) {
    return NextResponse.json(
      { error: "Add your BVN or NIN so you can fund your wallet" },
      { status: 400 },
    );
  }

  const phoneTaken = await prisma.user.findFirst({
    where: { phone, NOT: { id: user.id } },
  });
  if (phoneTaken) {
    return NextResponse.json(
      { error: "That phone number is already on another account" },
      { status: 409 },
    );
  }

  const pinHash = await hashPin(pin);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone,
      pinHash,
      ...(name ? { name } : {}),
      ...(bvn ? { bvn } : {}),
      ...(nin ? { nin } : {}),
      phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
