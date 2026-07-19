import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin, generateOtpCode, generateReferralCode } from "@/lib/auth";
import { sendOtpSms } from "@/lib/services/termii";
import { normalizePhone, isValidNgPhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const phone = normalizePhone(String(body.phone || ""));
  const pin = String(body.pin || "");
  const referralCodeIn = body.referralCode ? String(body.referralCode).trim().toUpperCase() : null;

  if (!name || !phone || !pin || pin.length !== 4) {
    return NextResponse.json(
      { error: "name, phone and a 4-digit pin are required" },
      { status: 400 },
    );
  }
  if (!isValidNgPhone(phone)) {
    return NextResponse.json({ error: "Enter a valid Nigerian phone number" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this phone number already exists" },
      { status: 409 },
    );
  }

  let referredBy: string | null = null;
  if (referralCodeIn) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: referralCodeIn } });
    if (referrer) referredBy = referrer.referralCode;
  }

  const pinHash = await hashPin(pin);
  const referralCode = generateReferralCode(name);

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      pinHash,
      referralCode,
      referredBy,
      wallet: { create: { balanceKobo: 0 } },
    },
  });

  const code = generateOtpCode();
  await prisma.otpCode.create({
    data: {
      phone,
      code,
      purpose: "signup",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  await sendOtpSms(phone, code);

  return NextResponse.json({ userId: user.id, phone });
}
