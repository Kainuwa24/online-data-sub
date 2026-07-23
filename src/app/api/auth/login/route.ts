import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth";
import { signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { isProfileComplete } from "@/lib/google-oauth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  // Explicit select so a stale Prisma singleton can't silently drop passwordHash
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      googleId: true,
      phone: true,
      pinHash: true,
      bvn: true,
      nin: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Fallback if runtime client ever omits the column from the model result
  let passwordHash = user.passwordHash;
  if (!passwordHash) {
    try {
      const rows = await prisma.$queryRaw<Array<{ passwordHash: string | null }>>`
        SELECT passwordHash FROM User WHERE email = ${email} LIMIT 1
      `;
      passwordHash = rows[0]?.passwordHash ?? null;
    } catch (e) {
      console.error("[auth/login] passwordHash raw fallback failed", e);
    }
  }

  if (!passwordHash) {
    return NextResponse.json(
      {
        error: user.googleId
          ? "This account uses Google sign-in. Continue with Google instead."
          : "This account has no password set. Use Google or create a new account.",
      },
      { status: 400 },
    );
  }

  const valid = await comparePassword(password, passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = signSession(user.id);
  setSessionCookie(token);

  const complete = isProfileComplete(user);
  return NextResponse.json({
    ok: true,
    userId: user.id,
    profileComplete: complete,
    next: complete ? "/home" : "/complete-profile",
  });
}
