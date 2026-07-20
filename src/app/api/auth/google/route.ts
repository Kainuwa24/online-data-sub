import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  isGoogleAuthConfigured,
} from "@/lib/google-oauth";

export async function GET() {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      new URL(
        "/login?error=" + encodeURIComponent("Google sign-in is not configured yet"),
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      ),
    );
  }

  const state = createOAuthState();
  cookies().set("ods_google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
