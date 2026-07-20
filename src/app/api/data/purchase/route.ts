import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateTxnReference } from "@/lib/auth";
import { purchaseData } from "@/lib/services/asbdata";
import { debitWallet, refundWallet, markTxnFailed } from "@/lib/wallet";
import { validateNgPhone } from "@/lib/phone";
import { verifyUserPin } from "@/lib/pin";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const network = String(body.network || "");
  const variationCode = String(body.variationCode || "");
  const planLabel = String(body.planLabel || "");
  const priceKobo = Number(body.priceKobo);
  const phoneCheck = validateNgPhone(String(body.recipientPhone || ""), {
    label: "Recipient number",
  });

  const pinError = await verifyUserPin(user, body.pin);
  if (pinError) {
    return NextResponse.json({ error: pinError }, { status: 401 });
  }

  if (!network || !variationCode || !priceKobo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
  }
  const recipientPhone = phoneCheck.phone;

  const reference = generateTxnReference();
  const debit = await debitWallet({
    userId: user.id,
    amountKobo: priceKobo,
    category: "data",
    label: `${network} ${planLabel}`.trim() || "Data purchase",
    reference,
    meta: { network, variationCode, recipientPhone },
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
