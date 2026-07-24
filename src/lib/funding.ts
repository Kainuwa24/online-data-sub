import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  createPalmPayVirtualAccount,
  getPalmPayConfigState,
  isPalmPayEnabled,
  mapPalmPayOrderStatus,
  verifyPalmPayWebhook,
} from "@/lib/services/palmpay";
import {
  createFlutterwaveStaticVirtualAccount,
  getFlutterwaveConfigState,
  isFlutterwaveEnabled,
  mapFlutterwaveChargeStatus,
  verifyFlutterwaveTransaction,
  verifyFlutterwaveTransactionByReference,
  verifyFlutterwaveWebhook,
} from "@/lib/services/flutterwave";
import { creditWallet } from "@/lib/wallet";
import { nairaToKobo } from "@/lib/money";

export type FundingProvider = "palmpay" | "flutterwave";

export function normalizeFundingProvider(value: unknown): FundingProvider {
  return value === "palmpay" ? "palmpay" : "flutterwave";
}

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
  const palmpay = getPalmPayConfigState();
  const flutterwave = getFlutterwaveConfigState();
  return {
    requiresKyc: true as const,
    providers: {
      palmpay: {
        id: "palmpay" as const,
        label: "PalmPay",
        ...palmpay,
      },
      flutterwave: {
        id: "flutterwave" as const,
        label: "Flutterwave",
        bankName: "Flutterwave",
        ...flutterwave,
      },
    },
    /** True if at least one funding provider is configured */
    anyEnabled: palmpay.enabled || flutterwave.enabled,
    /** @deprecated use anyEnabled or providers.*.enabled */
    enabled: palmpay.enabled || flutterwave.enabled,
    /** @deprecated prefer providers.palmpay */
    provider: "palmpay" as const,
    // PalmPay top-level fields for older callers
    appIdConfigured: palmpay.appIdConfigured,
    privateKeyConfigured: palmpay.privateKeyConfigured,
    publicKeyConfigured: palmpay.publicKeyConfigured,
    baseUrl: palmpay.baseUrl,
    bankName: palmpay.bankName,
    env: palmpay.env,
  };
}

export async function getFundingAccount(
  userId: string,
  provider: FundingProvider = "flutterwave",
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const existing = await prisma.virtualAccount.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  const hasBvn = Boolean(user?.bvn && user.bvn.replace(/\D/g, "").length === 11);
  const hasNin = Boolean(user?.nin && user.nin.replace(/\D/g, "").length === 11);
  const kycReady = Boolean(resolveIdentity(user ?? { bvn: null, nin: null }));
  const config = getFundingConfig();
  const providerConfig = config.providers[provider];

  if (!existing) {
    return {
      account: null,
      hasBvn,
      hasNin,
      kycReady,
      provider,
      configured: providerConfig.enabled,
    };
  }
  return {
    account: publicAccount(existing),
    hasBvn,
    hasNin,
    kycReady,
    provider,
    configured: providerConfig.enabled,
  };
}

/** @deprecated use getFundingAccount(userId, "palmpay") */
export async function getPalmPayAccount(userId: string) {
  return getFundingAccount(userId, "palmpay");
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
      provider: "palmpay" as const,
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
    provider: "palmpay" as const,
    regenerated: Boolean(opts?.forceRecreate || existingIsDevOnly || (existing && !existingKycOk)),
  };
}

function resolveFlutterwaveIdentity(user: {
  bvn: string | null;
  nin: string | null;
}): { identityType: "bvn" | "nin"; identityNumber: string } | null {
  const bvn = user.bvn?.replace(/\D/g, "").trim() ?? "";
  const nin = user.nin?.replace(/\D/g, "").trim() ?? "";
  if (bvn.length === 11) return { identityType: "bvn", identityNumber: bvn };
  if (nin.length === 11) return { identityType: "nin", identityNumber: nin };
  return null;
}

export async function getOrCreateFlutterwaveAccount(
  userId: string,
  opts?: { forceRecreate?: boolean },
) {
  if (!isFlutterwaveEnabled()) {
    return {
      error: "Flutterwave funding is not configured. Set FLUTTERWAVE_SECRET_KEY.",
      status: 400 as const,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found", status: 404 as const };

  const identity = resolveFlutterwaveIdentity(user);
  if (!identity) {
    return {
      error:
        "Complete KYC first: add your BVN or NIN under Profile, then create your Flutterwave funding account.",
      code: "KYC_REQUIRED",
      status: 400 as const,
    };
  }

  const existing = await prisma.virtualAccount.findUnique({
    where: { userId_provider: { userId, provider: "flutterwave" } },
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
      provider: "flutterwave" as const,
    };
  }

  const email = user.email?.trim() || syntheticEmail(user.phone, user.id);
  // MafitaPay matches static VA deposits by tx_ref starting with static_va_
  const reference = `static_va_${randomBytes(8).toString("hex")}`;
  const customerName = user.name.trim() || "ODS User";
  const narration = fundingAccountName(customerName).slice(0, 35);
  const [firstName, ...restNames] = customerName.split(/\s+/).filter(Boolean);
  const phoneNumber = (user.phone || "").replace(/\D/g, "") || "08000000000";

  const result = await createFlutterwaveStaticVirtualAccount({
    reference,
    email,
    phoneNumber,
    firstName: firstName || "User",
    lastName: restNames.join(" ") || "ODS",
    narration,
    identityType: identity.identityType,
    identityNumber: identity.identityNumber,
  });

  if (result.status === "failed" || !result.accountNumber || !result.bankName) {
    return {
      error: result.reason || "Unable to create Flutterwave funding account.",
      status: 400 as const,
    };
  }

  const rawPayload = {
    ...(result.payload ?? {}),
    kycAttached: true,
    identityType: identity.identityType,
    flwRef: result.providerReference,
  };

  const rawJson = JSON.stringify(rawPayload);
  const account = await prisma.virtualAccount.upsert({
    where: { userId_provider: { userId, provider: "flutterwave" } },
    create: {
      userId,
      provider: "flutterwave",
      accountNumber: result.accountNumber,
      bankName: result.bankName,
      accountName: result.accountName || narration,
      accountReference: reference,
      isPermanent: true,
      status: "ACTIVE",
      raw: rawJson,
    },
    update: {
      accountNumber: result.accountNumber,
      bankName: result.bankName,
      accountName: result.accountName || narration,
      accountReference: reference,
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
    provider: "flutterwave" as const,
    regenerated: Boolean(opts?.forceRecreate || existingIsDevOnly || (existing && !existingKycOk)),
  };
}

export async function getOrCreateFundingAccount(
  userId: string,
  provider: FundingProvider,
  opts?: { forceRecreate?: boolean },
) {
  if (provider === "flutterwave") {
    return getOrCreateFlutterwaveAccount(userId, opts);
  }
  return getOrCreatePalmPayAccount(userId, opts);
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveVerifiedFlutterwaveDeposit(params: {
  transactionId?: string;
  reference: string;
}) {
  const attempts = 4;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const byId = params.transactionId
      ? await verifyFlutterwaveTransaction(params.transactionId).catch(() => null)
      : null;
    const byReference =
      byId?.amountSettled == null
        ? await verifyFlutterwaveTransactionByReference(params.reference).catch(() => null)
        : null;
    const verified = byId ?? byReference;

    if (verified?.amountSettled != null && verified.amountSettled > 0) {
      return verified;
    }
    // Prefer any successful verification with a positive amount
    if (verified?.amount != null && verified.amount > 0 && attempt === attempts) {
      return verified;
    }

    if (attempt < attempts) {
      await sleep(1500);
    } else if (verified) {
      return verified;
    }
  }
  return null;
}

/**
 * Flutterwave webhook handler for permanent VA deposits.
 * Mirrors MafitaPay static_va_ charge.completed bank_transfer path.
 */
export async function handleFlutterwaveWebhook(input: {
  rawBody: string;
  signature?: string | null;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!verifyFlutterwaveWebhook(input.rawBody, input.signature ?? null)) {
    return { status: 401, body: { error: "Unauthorized webhook request.", success: false } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody);
  } catch {
    return { status: 400, body: { error: "Invalid JSON.", success: false } };
  }

  const body = isRecord(parsed) ? parsed : {};
  const eventType = readString(body.event);
  const data = isRecord(body.data) ? body.data : {};

  // Only handle bank-transfer VA deposits for funding
  if (!(eventType === "charge.completed" && readString(data.payment_type) === "bank_transfer")) {
    return {
      status: 200,
      body: { data: { ignored: true, eventType }, success: true },
    };
  }

  const reference = readString(data.tx_ref);
  const externalEventId =
    readString(data.id) || readString(data.flw_ref) || `${eventType}:${reference}`;
  const providerReference = readString(data.flw_ref) || readString(data.id) || undefined;
  const rawStatus = readString(data.status);
  const status = mapFlutterwaveChargeStatus(rawStatus);
  const failureReason =
    readString(data.processor_response) || readString(data.narration) || undefined;

  if (!reference || !externalEventId || !status) {
    return {
      status: 400,
      body: { error: "Invalid Flutterwave webhook payload.", success: false },
    };
  }

  try {
    await prisma.providerEvent.create({
      data: {
        externalEventId,
        provider: "flutterwave",
        reference: providerReference || reference,
        status,
        failureReason: status === "failed" ? failureReason || "Flutterwave deposit failed." : null,
        payload: JSON.stringify(body),
      },
    });
  } catch {
    // Already processed
    return { status: 200, body: { data: { duplicate: true }, success: true } };
  }

  if (status === "failed") {
    return { status: 200, body: { data: { ignored: true, status }, success: true } };
  }

  const customer = isRecord(data.customer) ? data.customer : {};
  const customerEmail = readString(customer.email);
  const accountNumber = readString(data.account_number);

  // Prefer static VA path (permanent accounts use static_va_ tx_ref)
  const va =
    (reference
      ? await prisma.virtualAccount.findUnique({ where: { accountReference: reference } })
      : null) ??
    (accountNumber
      ? await prisma.virtualAccount.findFirst({
          where: { accountNumber, provider: "flutterwave" },
        })
      : null);

  let userId = va?.userId ?? null;
  if (!userId && customerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: customerEmail },
    });
    userId = user?.id ?? null;
  }

  if (!userId) {
    console.warn("[flutterwave-webhook] no user match", {
      reference,
      externalEventId,
      customerEmail,
      accountNumber,
    });
    return {
      status: 404,
      body: {
        error: "Deposit customer could not be matched to a user.",
        success: false,
      },
    };
  }

  const verifiedTransactionId = readString(data.id);
  const verified = await resolveVerifiedFlutterwaveDeposit({
    transactionId: verifiedTransactionId || undefined,
    reference,
  });

  // Flutterwave amounts are NGN (major units)
  const amountNaira =
    verified?.amountSettled ??
    verified?.amount ??
    readNumber(data.amount_settled) ??
    readNumber(data.amount);

  if (amountNaira == null || amountNaira <= 0) {
    return {
      status: 400,
      body: { error: "Invalid Flutterwave deposit amount.", success: false },
    };
  }

  const creditKobo = nairaToKobo(amountNaira);
  const uniqueReference = (providerReference || reference).slice(0, 48);

  await creditWallet({
    userId,
    amountKobo: creditKobo,
    category: "wallet_funding",
    label: "Flutterwave bank transfer",
    reference: uniqueReference,
    meta: {
      provider: "flutterwave",
      accountNumber: accountNumber || va?.accountNumber,
      bankName: va?.bankName || readString(data.bank_name) || "Flutterwave",
      accountReference: reference,
      txRef: reference,
      flwRef: providerReference,
      amountNaira,
      amountSettled: verified?.amountSettled,
      chargedAmount: verified?.chargedAmount,
      paymentType: "bank_transfer",
    },
  });

  await prisma.providerEvent.update({
    where: { externalEventId },
    data: { processedAt: new Date() },
  });

  console.log("[flutterwave-webhook] credited", {
    reference,
    uniqueReference,
    userId,
    amountKobo: creditKobo,
  });

  return {
    status: 200,
    body: {
      success: true,
      data: { credited: true, reference: uniqueReference, amountKobo: creditKobo },
    },
  };
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
