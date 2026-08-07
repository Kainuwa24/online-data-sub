import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateTxnReference } from "@/lib/auth";
import { purchaseData } from "@/lib/services/asbdata";
import { debitWallet, refundWallet, markTxnFailed } from "@/lib/wallet";
import { validateNgPhone } from "@/lib/phone";
import { verifyTransactionAuth } from "@/lib/pin";
import { getPlanForPurchase } from "@/lib/plans-cache";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const network = String(body.network || "");
  const variationCode = String(body.variationCode || "");
  const quotedKobo = Number(body.priceKobo);
  const phoneCheck = validateNgPhone(String(body.recipientPhone || ""), {
    label: "Recipient number",
  });

  const pinError = await verifyTransactionAuth(user, body);
  if (pinError) {
    return NextResponse.json({ error: pinError }, { status: 401 });
  }

  if (!network || !variationCode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
  }
  const recipientPhone = phoneCheck.phone;

  // Price server-side. The client's priceKobo is only used to detect that the
  // catalog moved under the user mid-checkout, never to set what we charge.
  const plan = await getPlanForPurchase(network, variationCode);
  if (!plan) {
    return NextResponse.json({ error: "Plan is no longer available" }, { status: 400 });
  }
  const priceKobo = plan.priceKobo;
  const planLabel = plan.size ? `${plan.size} ${plan.validity}`.trim() : plan.name;

  if (Number.isFinite(quotedKobo) && quotedKobo !== priceKobo) {
    return NextResponse.json(
      {
        error: "This plan's price changed. Please review the new price and try again.",
        code: "PRICE_CHANGED",
        priceKobo,
      },
      { status: 409 },
    );
  }

  const reference = generateTxnReference();
  const debit = await debitWallet({
    userId: user.id,
    amountKobo: priceKobo,
    category: "data",
    label: `${network} ${planLabel}`.trim() || "Data purchase",
    reference,
    meta: {
      network,
      variationCode,
      recipientPhone,
      costKobo: plan.costKobo,
      marginKobo: plan.marginKobo,
      pricingRuleId: plan.ruleId,
    },
  });

  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error },
      { status: debit.code === "INSUFFICIENT_FUNDS" ? 402 : 400 },
    );
  }

  const result = await purchaseData({
    network,
    phone: recipientPhone,
    variationCode,
    amountKobo: priceKobo,
    requestId: reference,
  });

  if (!result.success) {
    await refundWallet({
      userId: user.id,
      amountKobo: priceKobo,
      category: "data",
      label: "Refund: data purchase failed",
      originalReference: reference,
      meta: { provider: result.raw },
    });
    await markTxnFailed(reference, { provider: result.raw, message: result.message });
    return NextResponse.json({
      success: false,
      error: result.message || "Data purchase failed",
      reference,
    });
  }

  return NextResponse.json({
    success: true,
    reference,
    providerReference: result.providerReference,
  });
}
