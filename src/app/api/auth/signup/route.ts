import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, generateReferralCode } from "@/lib/auth";
import { sendOtpSms } from "@/lib/services/termii";
import { validateNgPhone } from "@/lib/phone";

/**
 * Phone signup step 1: name + phone only.
 * PIN and BVN/NIN are collected later on /complete-profile (never here).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const phoneCheck = validateNgPhone(String(body.phone || ""));
  const referralCodeIn = body.referralCode
    ? String(body.referralCode).trim().toUpperCase()
    : null;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
  }
  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
  }
  const phone = phoneCheck.phone;

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

  const referralCode = generateReferralCode(name);

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      pinHash: null, // set on complete-profile step 2
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
