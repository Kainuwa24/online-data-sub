import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, signResetToken } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phone = normalizePhone(String(body.phone || ""));
  const code = String(body.code || "");
  const purpose = String(body.purpose || "signup");

  if (!phone || !code || !purpose) {
    return NextResponse.json({ error: "phone, code and purpose are required" }, { status: 400 });
  }

  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.code !== code) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

  if (purpose === "signup") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerifiedAt: new Date() },
    });

    // Referral bonus on verified signup (both sides ₦500 if referred)
    if (user.referredBy) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: user.referredBy } });
      if (referrer) {
        const existing = await prisma.referral.findUnique({ where: { referredId: user.id } });
        if (!existing) {
          const bonusKobo = Number(process.env.REFERRAL_BONUS_KOBO || 50_000);
          await prisma.referral.create({
            data: { referrerId: referrer.id, referredId: user.id, bonusKobo },
          });
          const { creditWallet } = await import("@/lib/wallet");
          await creditWallet({
            userId: referrer.id,
            amountKobo: bonusKobo,
            category: "referral",
            label: "Referral bonus",
            reference: `REF-R-${user.id}`.slice(0, 48),
            meta: { referredId: user.id },
          });
          await creditWallet({
            userId: user.id,
            amountKobo: bonusKobo,
            category: "referral",
            label: "Welcome referral bonus",
            reference: `REF-N-${user.id}`.slice(0, 48),
            meta: { referrerId: referrer.id },
          });
        }
      }
    }

    const token = signSession(user.id);
    setSessionCookie(token);
    return NextResponse.json({ ok: true, userId: user.id });
  }

  // purpose === "reset_pin"
  const resetToken = signResetToken(phone);
  return NextResponse.json({ ok: true, verified: true, resetToken });
}
