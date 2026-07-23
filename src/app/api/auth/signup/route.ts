import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateReferralCode,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  signSession,
  validatePassword,
} from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

/**
 * Email + password signup.
 * Phone, BVN/NIN, and transaction PIN are collected on /complete-profile.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");
  const referralCodeIn = body.referralCode
    ? String(body.referralCode).trim().toUpperCase()
    : null;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 },
    );
  }

  let referredBy: string | null = null;
  if (referralCodeIn) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: referralCodeIn } });
    if (referrer) referredBy = referrer.referralCode;
  }

  const passwordHash = await hashPassword(password);
  const referralCode = generateReferralCode(name);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone: null,
      pinHash: null,
      referralCode,
      referredBy,
      wallet: { create: { balanceKobo: 0 } },
    },
  });

  setSessionCookie(signSession(user.id));

  return NextResponse.json({
    ok: true,
    userId: user.id,
    profileComplete: false,
    next: "/complete-profile",
  });
}
