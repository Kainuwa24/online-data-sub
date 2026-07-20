import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateReferralCode, signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import {
  exchangeGoogleCode,
  getAppUrl,
  googleReferralSeed,
  isProfileComplete,
} from "@/lib/google-oauth";

function redirectWithError(message: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(message)}`, getAppUrl()),
  );
}

async function uniqueReferralCode(name: string, googleSub: string) {
  for (let i = 0; i < 8; i++) {
    const code = i === 0 ? generateReferralCode(name) : generateReferralCode(`${name}${i}`);
    const taken = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!taken) return code;
  }
  return `${googleReferralSeed(googleSub)}${Date.now().toString().slice(-4)}`;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  if (url.searchParams.get("error")) {
    return redirectWithError("Google sign-in was cancelled");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = cookies().get("ods_google_oauth_state")?.value;
  cookies().delete("ods_google_oauth_state");

  if (!code || !state || !savedState || state !== savedState) {
    return redirectWithError("Invalid Google sign-in state. Try again.");
  }

  let profile;
  try {
    profile = await exchangeGoogleCode(code);
  } catch (e) {
    console.error("[google] token/profile error", e);
    return redirectWithError(
      e instanceof Error ? e.message : "Google sign-in failed",
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

  if (!isProfileComplete(user)) {
    return NextResponse.redirect(new URL("/complete-profile", getAppUrl()));
  }
  return NextResponse.redirect(new URL("/home", getAppUrl()));
}
