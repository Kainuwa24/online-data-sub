import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtpCode } from "@/lib/auth";
import { sendOtpSms } from "@/lib/services/termii";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phone = normalizePhone(String(body.phone || ""));
  const purpose = String(body.purpose || "reset_pin");

  if (!phone || !purpose) {
    return NextResponse.json({ error: "phone and purpose are required" }, { status: 400 });
  }

  if (purpose === "reset_pin" || purpose === "signup") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user && purpose === "reset_pin") {
      return NextResponse.json({ error: "No account found for that phone number" }, { status: 404 });
    }
  }

  const code = generateOtpCode();
  await prisma.otpCode.create({
    data: {
      phone,
      code,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  await sendOtpSms(phone, code);

  return NextResponse.json({ ok: true });
}
