import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReferralCode, signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import {
  googleReferralSeed,
  isProfileComplete,
  verifyGoogleIdToken,
} from "@/lib/google-oauth";

async function uniqueReferralCode(name: string, googleSub: string) {
  for (let i = 0; i < 8; i++) {
    const code = i === 0 ? generateReferralCode(name) : generateReferralCode(`${name}${i}`);
    const taken = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!taken) return code;
  }
  return `${googleReferralSeed(googleSub)}${Date.now().toString().slice(-4)}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const idToken = String(body.idToken || "");

  if (!idToken) {
    return NextResponse.json({ error: "Missing Google ID token" }, { status: 400 });
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (e) {
    console.error("[google-native] token verification error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Google sign-in failed" },
      { status: 401 },
    );
  }

  const email = profile.email.trim().toLowerCase();
  const name = (profile.name || email.split("@")[0] || "User").trim();

  let user =
    (await prisma.user.findUnique({ where: { googleId: profile.sub } })) ||
    (await prisma.user.findUnique({ where: { email } }));

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId || profile.sub,
        email: user.email || email,
        name: user.name || name,
      },
    });
  } else {
    const referralCode = await uniqueReferralCode(name, profile.sub);
    user = await prisma.user.create({
      data: {
        name,
        email,
        googleId: profile.sub,
        phone: null,
        pinHash: null,
        referralCode,
        wallet: { create: { balanceKobo: 0 } },
      },
    });
  }

  setSessionCookie(signSession(user.id));

  const next = isProfileComplete(user) ? "/home" : "/complete-profile";
  return NextResponse.json({ ok: true, userId: user.id, next });
}