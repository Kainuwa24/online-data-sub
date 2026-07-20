import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/google-oauth";
import { sendMagicLinkEmail } from "@/lib/services/email";

const TTL_MS = 15 * 60 * 1000;

export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAndSendMagicLink(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { ok: false as const, error: "Enter a valid email address" };
  }

  // Invalidate unused prior tokens for this email
  await prisma.magicLinkToken.updateMany({
    where: { email, consumed: false },
    data: { consumed: true },
  });

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.magicLinkToken.create({
    data: { email, tokenHash, expiresAt },
  });

  const link = `${getAppUrl()}/api/auth/magic/verify?token=${token}`;
  const result = await sendMagicLinkEmail(email, link);

  return {
    ok: true as const,
    email,
    simulated: result.simulated === true,
    // Only return link in non-production so UI can show a dev hint (optional)
    devLink: process.env.NODE_ENV !== "production" && result.simulated ? link : undefined,
  };
}

export async function consumeMagicLinkToken(rawToken: string) {
  if (!rawToken || rawToken.length < 20) return null;

  const tokenHash = hashToken(rawToken);
  const row = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!row || row.consumed || row.expiresAt < new Date()) {
    return null;
  }

  await prisma.magicLinkToken.update({
    where: { id: row.id },
    data: { consumed: true },
  });

  return { email: row.email };
}
