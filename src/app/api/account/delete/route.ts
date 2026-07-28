import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, clearSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { verifyUserPin } from "@/lib/pin";

/**
 * Permanently delete the signed-in account and associated user data.
 * Requires the user's 4-digit PIN (Google-only users without PIN must set one first,
 * or we accept confirm phrase + email match for password/Google accounts without PIN).
 *
 * Play Console: in-app account deletion path.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const confirm = String(body.confirm || "").trim().toUpperCase();
  if (confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Type DELETE to confirm permanent account deletion' },
      { status: 400 },
    );
  }

  // Prefer PIN when set; otherwise require matching email confirmation for Google/password users
  if (user.pinHash) {
    const pinError = await verifyUserPin(user, body.pin);
    if (pinError) {
      return NextResponse.json({ error: pinError }, { status: 401 });
    }
  } else {
    const emailConfirm = String(body.emailConfirm || "")
      .trim()
      .toLowerCase();
    if (!user.email || emailConfirm !== user.email.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            "Confirm with your account email, or set a PIN in Security & PIN first",
        },
        { status: 400 },
      );
    }
  }

  const userId = user.id;
  const phone = user.phone;
  const email = user.email;

  try {
    await prisma.$transaction(async (tx) => {
      // Referral rows are not cascaded from User
      await tx.referral.deleteMany({
        where: {
          OR: [{ referrerId: userId }, { referredId: userId }],
        },
      });

      if (phone) {
        await tx.otpCode.deleteMany({ where: { phone } });
      }
      if (email) {
        await tx.magicLinkToken.deleteMany({ where: { email } });
      }

      // Cascades: wallet, transactions, notifications, virtualAccounts
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (e) {
    console.error("[account/delete]", e);
    return NextResponse.json(
      { error: "Could not delete account. Please try again or contact support." },
      { status: 500 },
    );
  }

  clearSessionCookie();

  return NextResponse.json({
    ok: true,
    message: "Your account and associated data have been permanently deleted.",
  });
}
