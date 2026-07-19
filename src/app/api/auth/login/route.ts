import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePin, signSession, generateOtpCode } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";
import { sendOtpSms } from "@/lib/services/termii";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phone = normalizePhone(String(body.phone || ""));
  const pin = String(body.pin || "");

  if (!phone || !pin) {
    return NextResponse.json({ error: "phone and pin are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json({ error: "No account found for that phone number" }, { status: 404 });
  }

  const valid = await comparePin(pin, user.pinHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  if (!user.phoneVerifiedAt) {
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
    return NextResponse.json(
      {
        error: "Phone not verified. We sent a new code.",
        needsOtp: true,
        phone,
      },
      { status: 403 },
    );
  }

  const token = signSession(user.id);
  setSessionCookie(token);

  return NextResponse.json({ ok: true, userId: user.id });
}
