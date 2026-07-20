import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReferralCode, signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { getAppUrl, isProfileComplete } from "@/lib/google-oauth";
import { consumeMagicLinkToken } from "@/lib/magic-link";

function redirectError(message: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(message)}`, getAppUrl()),
  );
}

async function uniqueReferralCode(name: string) {
  for (let i = 0; i < 8; i++) {
    const code = generateReferralCode(i === 0 ? name : `${name}${i}`);
    const taken = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!taken) return code;
  }
  return `ML${Date.now().toString().slice(-8)}`;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const consumed = await consumeMagicLinkToken(token);
  if (!consumed) {
    return redirectError("This sign-in link is invalid or has expired. Request a new one.");
  }

  const email = consumed.email;
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const name = email.split("@")[0] || "User";
    const referralCode = await uniqueReferralCode(name);
    user = await prisma.user.create({
      data: {
        name,
        email,
        phone: null,
        pinHash: null,
        referralCode,
        wallet: { create: { balanceKobo: 0 } },
      },
    });
  }

  setSessionCookie(signSession(user.id));

  if (!isProfileComplete(user)) {
    return NextResponse.redirect(new URL("/complete-profile", getAppUrl()));
  }
  return NextResponse.redirect(new URL("/home", getAppUrl()));
}
