import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const bonusKobo = Number(process.env.REFERRAL_BONUS_KOBO || 50_000);
  const bonusNaira = Math.round(bonusKobo / 100);

  const referred = await prisma.user.findMany({
    where: { referredBy: user.referralCode },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, createdAt: true },
  });

  const earnings = await prisma.transaction.aggregate({
    where: {
      userId: user.id,
      category: "referral",
      type: "CREDIT",
      status: "SUCCESS",
    },
    _sum: { amountKobo: true },
  });

  const earnedKobo = earnings._sum.amountKobo ?? 0;

  return NextResponse.json({
    code: user.referralCode,
    bonusNaira,
    bonusFormatted: `₦${bonusNaira.toLocaleString("en-NG")}`,
    tagline: `Give ₦${bonusNaira.toLocaleString("en-NG")}, get ₦${bonusNaira.toLocaleString("en-NG")}`,
    friendsJoined: referred.length,
    earnedKobo,
    earnedFormatted: `₦${(earnedKobo / 100).toLocaleString("en-NG", {
      maximumFractionDigits: 0,
    })}`,
    invites: referred.map((r) => ({
      id: r.id,
      name: r.name,
      status: `Joined · earned ₦${bonusNaira.toLocaleString("en-NG")}`,
      done: true,
      joinedAt: r.createdAt.toISOString(),
    })),
  });
}
