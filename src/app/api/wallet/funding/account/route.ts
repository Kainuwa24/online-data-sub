import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  getFundingAccount,
  getFundingConfig,
  getOrCreateFundingAccount,
  normalizeFundingProvider,
  type FundingProvider,
} from "@/lib/funding";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const provider = normalizeFundingProvider(req.nextUrl.searchParams.get("provider"));
  const config = getFundingConfig();
  const info = await getFundingAccount(user.id, provider);

  return NextResponse.json({
    requiresKyc: true,
    providers: {
      palmpay: {
        enabled: config.providers.palmpay.enabled,
        label: config.providers.palmpay.label,
      },
      flutterwave: {
        enabled: config.providers.flutterwave.enabled,
        label: config.providers.flutterwave.label,
      },
    },
    anyProviderEnabled: config.enabled,
    // info includes: account, hasBvn, hasNin, kycReady, provider, configured
    ...info,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const forceRecreate = Boolean(body?.forceRecreate);
  const provider: FundingProvider = normalizeFundingProvider(body?.provider);

  const result = await getOrCreateFundingAccount(user.id, provider, { forceRecreate });
  if ("error" in result && result.error) {
    return NextResponse.json(
      { error: result.error, code: "code" in result ? result.code : undefined, provider },
      { status: result.status || 400 },
    );
  }

  const ok = result as {
    existing: boolean;
    account: {
      provider: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
      kycIncomplete?: boolean;
    };
    regenerated?: boolean;
    provider: FundingProvider;
  };

  const label = provider === "flutterwave" ? "Flutterwave" : "PalmPay";

  return NextResponse.json({
    success: true,
    existing: ok.existing,
    regenerated: ok.regenerated ?? false,
    provider: ok.provider,
    account: ok.account,
    instructions: ok.account.kycIncomplete
      ? "Do not transfer yet — complete KYC and regenerate this account first."
      : `Transfer any amount from your bank app to this ${label} account. Your wallet updates after ${label} confirms the payment.`,
  });
}
