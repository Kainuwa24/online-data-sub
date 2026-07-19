import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateTxnReference } from "@/lib/auth";
import { payBill } from "@/lib/services/asbdata";
import { debitWallet, refundWallet, markTxnFailed } from "@/lib/wallet";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const category = String(body.category || "bill");
  const billerName = String(body.billerName || body.serviceID || "");
  const serviceID = String(body.serviceID || "");
  const accountNumber = String(body.accountNumber || "").replace(/\s/g, "");
  const amountKobo = Number(body.amountKobo);
  const variationCode = body.variationCode ? String(body.variationCode) : undefined;

  if (!serviceID || !accountNumber || !amountKobo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const reference = generateTxnReference();
  const categorySlug = category.toLowerCase().replace(/\s+/g, "_");

  const debit = await debitWallet({
    userId: user.id,
    amountKobo,
    category: categorySlug,
    label: billerName || serviceID,
    reference,
    meta: { serviceID, accountNumber, variationCode },
  });

  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error },
      { status: debit.code === "INSUFFICIENT_FUNDS" ? 402 : 400 },
    );
  }

  const result = await payBill({
    category,
    biller: billerName,
    serviceID,
    account: accountNumber,
    amountKobo,
    variationCode,
    requestId: reference,
  });

  if (!result.success) {
    await refundWallet({
      userId: user.id,
      amountKobo,
      category: categorySlug,
      label: "Refund: bill payment failed",
      originalReference: reference,
      meta: { provider: result.raw },
    });
    await markTxnFailed(reference, { provider: result.raw, message: result.message });
    return NextResponse.json({
      success: false,
      error: result.message || "Payment failed",
      reference,
    });
  }

  return NextResponse.json({
    success: true,
    reference,
    providerReference: result.providerReference,
    token: result.token,
  });
}
