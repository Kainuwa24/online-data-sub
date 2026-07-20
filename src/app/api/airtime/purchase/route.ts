import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateTxnReference } from "@/lib/auth";
import { purchaseAirtime } from "@/lib/services/asbdata";
import { debitWallet, refundWallet, markTxnFailed } from "@/lib/wallet";
import { validateNgPhone } from "@/lib/phone";
import { verifyUserPin } from "@/lib/pin";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const network = String(body.network || "");
  const amountKobo = Number(body.amountKobo);
  const phoneCheck = validateNgPhone(String(body.recipientPhone || body.phone || ""), {
    label: "Recipient number",
  });

  const pinError = await verifyUserPin(user, body.pin);
  if (pinError) {
    return NextResponse.json({ error: pinError }, { status: 401 });
  }

  if (!network || !amountKobo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (amountKobo < 5000) {
    return NextResponse.json({ error: "Minimum airtime is ₦50" }, { status: 400 });
  }
  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
  }
  const recipientPhone = phoneCheck.phone;

  const reference = generateTxnReference();
  const debit = await debitWallet({
    userId: user.id,
    amountKobo,
    category: "airtime",
    label: `${network} airtime`,
    reference,
    meta: { network, recipientPhone },
  });

  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error },
      { status: debit.code === "INSUFFICIENT_FUNDS" ? 402 : 400 },
    );
  }

  const result = await purchaseAirtime({
    network,
    phone: recipientPhone,
    amountKobo,
    requestId: reference,
  });

  if (!result.success) {
    await refundWallet({
      userId: user.id,
      amountKobo,
      category: "airtime",
      label: "Refund: airtime purchase failed",
      originalReference: reference,
      meta: { provider: result.raw },
    });
    await markTxnFailed(reference, { provider: result.raw, message: result.message });
    return NextResponse.json({
      success: false,
      error: result.message || "Airtime purchase failed",
      reference,
    });
  }

  return NextResponse.json({
    success: true,
    reference,
    providerReference: result.providerReference,
  });
}
