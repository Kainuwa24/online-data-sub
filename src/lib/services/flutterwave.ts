/**
 * Flutterwave permanent virtual account funding — ported from MafitaPay.
 *
 * Create static VA: POST /v3/virtual-account-numbers (is_permanent + bvn|nin)
 * Webhook: verif-hash / flutterwave-signature vs FLUTTERWAVE_SECRET_HASH
 * Credit: charge.completed + payment_type bank_transfer, tx_ref static_va_*
 */
import { createHmac } from "node:crypto";
import { Agent, fetch as undiciFetch } from "undici";

const flwAgent = new Agent({
  connect: { family: 4, timeout: 25_000 },
  headersTimeout: 45_000,
  bodyTimeout: 45_000,
});

export type FlutterwaveVirtualAccountResult = {
  provider: "flutterwave";
  reference: string;
  status: "pending" | "failed";
  providerReference?: string;
  rawStatus?: string;
  reason?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  note?: string;
  payload?: Record<string, unknown>;
};

export type FlutterwaveVerifiedTransaction = {
  id: string;
  reference: string;
  providerReference?: string;
  status: string;
  amount?: number;
  chargedAmount?: number;
  amountSettled?: number;
  appFee?: number;
  merchantFee?: number;
  currency?: string;
  paymentType?: string;
  payload: Record<string, unknown>;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getFlutterwaveSecretKey() {
  return (
    readString(process.env.FLUTTERWAVE_SECRET_KEY) ||
    readString(process.env.MAFITAPAY_FLUTTERWAVE_SECRET_KEY)
  );
}

function getFlutterwaveSecretHash() {
  return (
    readString(process.env.FLUTTERWAVE_SECRET_HASH) ||
    readString(process.env.MAFITAPAY_FLUTTERWAVE_SECRET_HASH)
  );
}

function getFlutterwaveBaseUrl() {
  const explicit =
    readString(process.env.FLUTTERWAVE_BASE_URL) ||
    readString(process.env.MAFITAPAY_FLUTTERWAVE_BASE_URL);
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://api.flutterwave.com/v3";
}

export function isFlutterwaveEnabled() {
  return Boolean(getFlutterwaveSecretKey());
}

export function getFlutterwaveConfigState() {
  const secretKey = getFlutterwaveSecretKey();
  const secretHash = getFlutterwaveSecretHash();
  return {
    enabled: Boolean(secretKey),
    secretKeyConfigured: Boolean(secretKey),
    secretHashConfigured: Boolean(secretHash),
    webhooksEnabled: Boolean(secretHash),
    baseUrl: getFlutterwaveBaseUrl(),
  };
}

/** orderStatus: successful/success → success */
export function mapFlutterwaveChargeStatus(
  rawStatus: string,
): "success" | "failed" | null {
  const normalized = rawStatus.trim().toLowerCase();
  if (normalized === "successful" || normalized === "success") return "success";
  if (normalized === "failed" || normalized === "failure") return "failed";
  return null;
}

/**
 * Flutterwave webhooks send `verif-hash` (legacy secret match) or
 * `flutterwave-signature` (HMAC-SHA256 base64 of body with secret hash).
 */
export function verifyFlutterwaveWebhook(
  rawBody: string,
  signature: string | null,
): boolean {
  const secretHash = getFlutterwaveSecretHash();
  if (!secretHash) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[flutterwave] webhook signature skipped — FLUTTERWAVE_SECRET_HASH not set (dev only)",
      );
      return true;
    }
    return false;
  }
  if (!signature) return false;
  const computed = createHmac("sha256", secretHash).update(rawBody).digest("base64");
  return computed === signature || signature === secretHash;
}

export async function createFlutterwaveStaticVirtualAccount(input: {
  reference: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  narration: string;
  identityType: "bvn" | "nin";
  identityNumber: string;
}): Promise<FlutterwaveVirtualAccountResult> {
  const secretKey = getFlutterwaveSecretKey();
  if (!secretKey) {
    return {
      provider: "flutterwave",
      reference: input.reference,
      status: "failed",
      rawStatus: "NOT_CONFIGURED",
      reason: "Flutterwave is not configured (FLUTTERWAVE_SECRET_KEY required).",
    };
  }

  try {
    const res = await undiciFetch(`${getFlutterwaveBaseUrl()}/virtual-account-numbers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        tx_ref: input.reference,
        phonenumber: input.phoneNumber,
        firstname: input.firstName,
        lastname: input.lastName,
        narration: input.narration,
        is_permanent: true,
        [input.identityType]: input.identityNumber,
      }),
      dispatcher: flwAgent,
    });

    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    const body = isRecord(parsed) ? parsed : {};
    const data = isRecord(body.data) ? body.data : {};
    const rawStatus = readString(body.status).toLowerCase();
    const providerReference = readString(data.flw_ref) || readString(data.order_ref);
    const bankName = readString(data.bank_name);
    const accountNumber = readString(data.account_number);
    const note = readString(data.note);
    const providerMessage = readString(body.message) || readString(data.response_message);

    if (!res.ok || rawStatus !== "success" || !accountNumber || !bankName) {
      console.warn("[flutterwave] create static VA failed", {
        httpStatus: res.status,
        rawStatus,
        message: providerMessage,
      });
      return {
        provider: "flutterwave",
        reference: input.reference,
        status: "failed",
        providerReference: providerReference || undefined,
        rawStatus: readString(data.response_code) || rawStatus || "FAILED",
        reason: providerMessage || "Flutterwave static virtual account creation failed.",
        payload: body,
      };
    }

    return {
      provider: "flutterwave",
      reference: input.reference,
      status: "pending",
      providerReference: providerReference || undefined,
      rawStatus: readString(data.response_code) || "02",
      reason: providerMessage || undefined,
      bankName,
      accountNumber,
      accountName: input.narration,
      note: note || undefined,
      payload: body,
    };
  } catch (error) {
    return {
      provider: "flutterwave",
      reference: input.reference,
      status: "failed",
      rawStatus: "REQUEST_ERROR",
      reason:
        error instanceof Error
          ? error.message
          : "Flutterwave static virtual account request failed.",
    };
  }
}

export async function verifyFlutterwaveTransaction(
  transactionId: string,
): Promise<FlutterwaveVerifiedTransaction | null> {
  const secretKey = getFlutterwaveSecretKey();
  if (!secretKey) {
    throw new Error("Flutterwave is not configured.");
  }

  const res = await undiciFetch(
    `${getFlutterwaveBaseUrl()}/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      dispatcher: flwAgent,
    },
  );

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    return null;
  }

  const body = isRecord(parsed) ? parsed : {};
  const data = isRecord(body.data) ? body.data : {};
  if (!res.ok || readString(body.status).toLowerCase() !== "success") {
    return null;
  }

  return {
    id: readString(data.id) || String(data.id ?? ""),
    reference: readString(data.tx_ref),
    providerReference: readString(data.flw_ref) || undefined,
    status: readString(data.status),
    amount: readNumber(data.amount),
    chargedAmount: readNumber(data.charged_amount),
    amountSettled: readNumber(data.amount_settled),
    appFee: readNumber(data.app_fee),
    merchantFee: readNumber(data.merchant_fee),
    currency: readString(data.currency) || undefined,
    paymentType: readString(data.payment_type) || undefined,
    payload: body,
  };
}

export async function verifyFlutterwaveTransactionByReference(
  reference: string,
): Promise<FlutterwaveVerifiedTransaction | null> {
  const secretKey = getFlutterwaveSecretKey();
  if (!secretKey) {
    throw new Error("Flutterwave is not configured.");
  }

  const params = new URLSearchParams({ tx_ref: reference });
  const res = await undiciFetch(
    `${getFlutterwaveBaseUrl()}/transactions/verify_by_reference?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      dispatcher: flwAgent,
    },
  );

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    return null;
  }

  const body = isRecord(parsed) ? parsed : {};
  const data = isRecord(body.data) ? body.data : {};
  if (!res.ok || readString(body.status).toLowerCase() !== "success") {
    return null;
  }

  return {
    id: readString(data.id) || String(data.id ?? ""),
    reference: readString(data.tx_ref),
    providerReference: readString(data.flw_ref) || undefined,
    status: readString(data.status),
    amount: readNumber(data.amount),
    chargedAmount: readNumber(data.charged_amount),
    amountSettled: readNumber(data.amount_settled),
    appFee: readNumber(data.app_fee),
    merchantFee: readNumber(data.merchant_fee),
    currency: readString(data.currency) || undefined,
    paymentType: readString(data.payment_type) || undefined,
    payload: body,
  };
}
