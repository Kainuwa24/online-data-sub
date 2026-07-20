import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  createPalmPayVirtualAccount,
  getPalmPayConfigState,
  isPalmPayEnabled,
  mapPalmPayOrderStatus,
  verifyPalmPayWebhook,
} from "@/lib/services/palmpay";
import { creditWallet } from "@/lib/wallet";
import { nairaToKobo } from "@/lib/money";

function syntheticEmail(phone: string | null | undefined, userId: string) {
  const digits = (phone || "").replace(/\D/g, "").slice(-11) || userId.slice(-8);
  return `user${digits}@onlinedatasub.app`;
}

function fundingAccountName(name: string) {
  const base = name.trim() || "Online Data Sub";
  return `${base} ODS`.slice(0, 50);
}

function resolveIdentity(user: {
  bvn: string | null;
  nin: string | null;
}): { identityType: "personal" | "personal_nin"; licenseNumber: string } | null {
  const bvn = user.bvn?.replace(/\D/g, "").trim() ?? "";
  const nin = user.nin?.replace(/\D/g, "").trim() ?? "";
  if (bvn.length === 11) return { identityType: "personal", licenseNumber: bvn };
  if (nin.length === 11) return { identityType: "personal_nin", licenseNumber: nin };
  return null;
}

function parseJsonField(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function publicAccount(account: {
  provider: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountReference: string;
  isPermanent: boolean;
  status: string;
  raw?: string | null;
}) {
  const raw = parseJsonField(account.raw);
  const kycIncomplete = !(raw.kycAttached === true || Boolean(raw.identityType));
  return {
    provider: account.provider,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    accountReference: account.accountReference,
    isPermanent: account.isPermanent,
    status: account.status,
    kycIncomplete,
  };
}

export function getFundingConfig() {
  return {
    provider: "palmpay" as const,
    ...getPalmPayConfigState(),
    requiresKyc: true as const,
  };
}

export async function getPalmPayAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const existing = await prisma.virtualAccount.findUnique({
    where: { userId_provider: { userId, provider: "palmpay" } },
  });
  const hasBvn = Boolean(user?.bvn && user.bvn.replace(/\D/g, "").length === 11);
  const hasNin = Boolean(user?.nin && user.nin.replace(/\D/g, "").length === 11);
  const kycReady = Boolean(resolveIdentity(user ?? { bvn: null, nin: null }));

  if (!existing) {
    return { account: null, hasBvn, hasNin, kycReady };
  }
  return {
    account: publicAccount(existing),
    hasBvn,
    hasNin,
    kycReady,
  };
}

export async function getOrCreatePalmPayAccount(
  userId: string,
  opts?: { forceRecreate?: boolean },
) {
  if (!isPalmPayEnabled()) {
    return {
      error: "PalmPay funding is not configured. Set PALMPAY_APP_ID and PALMPAY_MERCHANT_PRIVATE_KEY.",
      status: 400 as const,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found", status: 404 as const };

  const identity = resolveIdentity(user);
  if (!identity) {
    return {
      error:
        "Complete KYC first: add your BVN or NIN under Profile, then create your funding account again.",
      code: "KYC_REQUIRED",
      status: 400 as const,
    };
  }

  const existing = await prisma.virtualAccount.findUnique({
    where: { userId_provider: { userId, provider: "palmpay" } },
  });
  const raw = parseJsonField(existing?.raw);
  const existingIsDevOnly = raw.dev === true;
  const existingKycOk = raw.kycAttached === true || Boolean(raw.identityType);

  if (
    existing &&
    existing.status === "ACTIVE" &&
    !existingIsDevOnly &&
    existingKycOk &&
    !opts?.forceRecreate
  ) {
    return {
      existing: true as const,
      account: publicAccount(existing),
      kycRequired: false as const,
    };
  }

  const email = user.email?.trim() || syntheticEmail(user.phone, user.id);
  const reference = `ods_va_${randomBytes(8).toString("hex")}`;
  const customerName = user.name.trim() || "ODS User";
  const virtualAccountName = fundingAccountName(customerName);

  const result = await createPalmPayVirtualAccount({
    reference,
    email,
    customerName,
    virtualAccountName,
    accountReference: reference,
    identityType: identity.identityType,
    licenseNumber: identity.licenseNumber,
  });

  if (result.status === "failed" || !result.accountNumber || !result.bankName) {
    return {
      error: result.reason || "Unable to create PalmPay funding account.",
      status: 400 as const,
    };
  }

  const rawPayload = {
    ...(result.payload ?? {}),
    kycAttached: true,
    identityType: identity.identityType,
  };

  const rawJson = JSON.stringify(rawPayload);
  const account = await prisma.virtualAccount.upsert({
    where: { userId_provider: { userId, provider: "palmpay" } },
    create: {
      userId,
      provider: "palmpay",
      accountNumber: result.accountNumber,
      bankName: result.bankName,
      accountName: result.accountName || virtualAccountName,
      accountReference: result.accountReference || reference,
      isPermanent: true,
      status: "ACTIVE",
      raw: rawJson,
    },
    update: {
      accountNumber: result.accountNumber,
      bankName: result.bankName,
      accountName: result.accountName || virtualAccountName,
      accountReference: result.accountReference || reference,
      status: "ACTIVE",
      raw: rawJson,
    },
  });

  if (!user.email) {
    await prisma.user.update({ where: { id: userId }, data: { email } });
  }

  return {
    existing: false as const,
    account: publicAccount(account),
    kycRequired: false as const,
    regenerated: Boolean(opts?.forceRecreate || existingIsDevOnly || (existing && !existingKycOk)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** PalmPay webhook handler — returns status + plain-text body. */
export async function handlePalmPayWebhook(rawBody: string): Promise<{
  status: number;
  body: string;
}> {
  if (!verifyPalmPayWebhook(rawBody)) {
    return { status: 401, body: "Unauthorized webhook request." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: "Invalid JSON." };
  }

  const body = isRecord(parsed) ? parsed : {};
  const orderNo = readString(body.orderNo);
  const orderStatus = mapPalmPayOrderStatus(body.orderStatus);
  const accountReference = readString(body.accountReference);
  const virtualAccountNo = readString(body.virtualAccountNo);
  const orderAmountMinor = readNumber(body.orderAmount);

  if (!orderNo || !orderStatus) {
    return { status: 400, body: "Invalid PalmPay webhook payload." };
  }

  try {
    await prisma.providerEvent.create({
      data: {
        externalEventId: orderNo,
        provider: "palmpay",
        reference: orderNo,
        status: orderStatus,
        failureReason:
          orderStatus === "failed" ? "PalmPay virtual account funding failed." : null,
        payload: JSON.stringify(body),
      },
    });
  } catch {
    // Already processed
    return { status: 200, body: "success" };
  }

  if (orderStatus !== "success") {
    return { status: 200, body: "success" };
  }

  const va =
    (accountReference
      ? await prisma.virtualAccount.findUnique({ where: { accountReference } })
      : null) ??
    (virtualAccountNo
      ? await prisma.virtualAccount.findFirst({
          where: { accountNumber: virtualAccountNo, provider: "palmpay" },
        })
      : null);

  if (!va) {
    console.warn("[palmpay-webhook] no VA match", { orderNo, accountReference, virtualAccountNo });
    return { status: 404, body: "User match failed." };
  }

  // PalmPay orderAmount is kobo (minor units)
  const creditKobo =
    orderAmountMinor != null && orderAmountMinor > 0 ? Math.round(orderAmountMinor) : null;

  if (creditKobo == null || creditKobo <= 0) {
    return { status: 400, body: "Invalid PalmPay deposit amount." };
  }

  await creditWallet({
    userId: va.userId,
    amountKobo: creditKobo,
    category: "wallet_funding",
    label: "PalmPay bank transfer",
    reference: orderNo,
    meta: {
      provider: "palmpay",
      accountNumber: virtualAccountNo || va.accountNumber,
      bankName: va.bankName,
      accountReference: accountReference || va.accountReference,
      payerAccountNo: readString(body.payerAccountNo) || undefined,
      payerAccountName: readString(body.payerAccountName) || undefined,
      amountNaira: creditKobo / 100,
    },
  });

  await prisma.providerEvent.update({
    where: { externalEventId: orderNo },
    data: { processedAt: new Date() },
  });

  console.log("[palmpay-webhook] credited", {
    orderNo,
    userId: va.userId,
    amountKobo: creditKobo,
  });

  return { status: 200, body: "success" };
}

export async function simulateFunding(userId: string, amountNaira: number) {
  if (process.env.NODE_ENV === "production") {
    return { error: "Not available in production", status: 404 as const };
  }
  if (amountNaira <= 0) return { error: "Amount must be positive", status: 400 as const };

  const ref = `SIM-PP-${Date.now()}`;
  const result = await creditWallet({
    userId,
    amountKobo: nairaToKobo(amountNaira),
    category: "wallet_funding",
    label: "Wallet funding (simulated)",
    reference: ref,
    meta: { provider: "simulate", simulated: true },
  });

  if (!result.ok) return { error: result.error, status: 400 as const };
  return { success: true, ...result };
}
