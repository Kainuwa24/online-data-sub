import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  getFundingConfig,
  getOrCreatePalmPayAccount,
  getPalmPayAccount,
} from "@/lib/funding";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const info = await getPalmPayAccount(user.id);
  return NextResponse.json({
    configured: getFundingConfig().enabled,
    requiresKyc: true,
    ...info,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const forceRecreate = Boolean(body?.forceRecreate);

  const result = await getOrCreatePalmPayAccount(user.id, { forceRecreate });
  if ("error" in result && result.error) {
    return NextResponse.json(
      { error: result.error, code: "code" in result ? result.code : undefined },
      { status: result.status || 400 },
    );
  }

  const ok = result as {
    existing: boolean;
    account: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      kycIncomplete?: boolean;
    };
    regenerated?: boolean;
  };

  return NextResponse.json({
    success: true,
    existing: ok.existing,
    regenerated: ok.regenerated ?? false,
    account: ok.account,
    instructions: ok.account.kycIncomplete
      ? "Do not transfer yet — complete KYC and regenerate this account first."
      : "Transfer any amount from your bank app to this PalmPay account. Your wallet updates after PalmPay confirms the payment.",
  });
}
