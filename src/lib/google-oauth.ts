import { createHash, randomBytes } from "node:crypto";
import { Agent, fetch as undiciFetch } from "undici";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

// WSL/dual-stack often hits IPv6 ETIMEDOUT to Google; force IPv4.
const googleAgent = new Agent({
  connect: { family: 4, timeout: 25_000 },
  headersTimeout: 45_000,
  bodyTimeout: 45_000,
});

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getGoogleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${getAppUrl()}/api/auth/google/callback`
  );
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export function buildGoogleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }

  const tokenRes = await undiciFetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }).toString(),
    dispatcher: googleAgent,
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      tokenJson.error_description || tokenJson.error || "Google token exchange failed",
    );
  }

  const profileRes = await undiciFetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    dispatcher: googleAgent,
  });
  const profile = (await profileRes.json()) as GoogleProfile & { error?: string };

  if (!profileRes.ok || !profile.sub || !profile.email) {
    throw new Error(profile.error || "Could not load Google profile");
  }

  return profile;
}

/** Stable placeholder referral code for Google-only users before phone is set. */
export function googleReferralSeed(googleSub: string) {
  const hash = createHash("sha256").update(googleSub).digest("hex").slice(0, 6).toUpperCase();
  return `G${hash}`;
}

function hasValidKyc(user: { bvn?: string | null; nin?: string | null }) {
  const bvn = (user.bvn || "").replace(/\D/g, "");
  const nin = (user.nin || "").replace(/\D/g, "");
  return bvn.length === 11 || nin.length === 11;
}

/** Phone + PIN + KYC (BVN or NIN) required before using the main app. */
export function isProfileComplete(user: {
  phone: string | null;
  pinHash: string | null;
  bvn?: string | null;
  nin?: string | null;
}) {
  return Boolean(user.phone && user.pinHash && hasValidKyc(user));
}

