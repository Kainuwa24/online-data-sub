/**
 * PalmPay virtual account funding — ported from onlinedatasub / MafitaPay.
 *
 * Create VA: POST /api/v2/virtual/account/label/create
 * Auth: Bearer APP_ID + Signature (RSA-SHA1 over MD5 of sorted payload)
 * Webhook: verify `sign` with PalmPay public key, orderStatus 1 = success
 */
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  type KeyObject,
  randomBytes,
} from "node:crypto";
import { Agent, fetch as undiciFetch } from "undici";

const palmAgent = new Agent({
  connect: { family: 4, timeout: 25_000 },
  headersTimeout: 45_000,
  bodyTimeout: 45_000,
});

export type PalmPayVirtualAccountResult = {
  provider: "palmpay";
  reference: string;
  status: "pending" | "failed";
  providerReference?: string;
  rawStatus?: string;
  reason?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  accountReference?: string;
  payload?: Record<string, unknown>;
};

function getPalmConfig() {
  const env = (process.env.PALMPAY_ENV ?? "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
  const defaultBase =
    env === "live"
      ? "https://open-gw-prod.palmpay-inc.com"
      : "https://open-gw-sandbox.palmpay-inc.com";
  return {
    env,
    baseUrl: (process.env.PALMPAY_BASE_URL || defaultBase).replace(/\/$/, ""),
    appId: process.env.PALMPAY_APP_ID || process.env.PALMPAY_AUTH_TOKEN || "",
    merchantPrivateKey: process.env.PALMPAY_MERCHANT_PRIVATE_KEY || "",
    publicKey: process.env.PALMPAY_PUBLIC_KEY || "",
    merchantPublicKey: process.env.PALMPAY_MERCHANT_PUBLIC_KEY || "",
    countryCode: process.env.PALMPAY_COUNTRY_CODE || "NG",
    bankName: process.env.PALMPAY_BANK_NAME || "PalmPay",
    isDev: process.env.NODE_ENV !== "production",
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeKeyInput(key: string) {
  return key.trim().replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n");
}

function toPem(key: string, label: "PRIVATE KEY" | "PUBLIC KEY") {
  const trimmed = normalizeKeyInput(key);
  if (!trimmed) return "";
  if (trimmed.includes("BEGIN")) return trimmed;
  const lines = trimmed.replace(/\s+/g, "").match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

function normalizeSignatureValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function buildSignatureBase(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([, value]) => normalizeSignatureValue(value) !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${normalizeSignatureValue(value)}`)
    .join("&");
}

function buildSignatureDigest(payload: Record<string, unknown>) {
  return createHash("md5").update(buildSignatureBase(payload), "utf8").digest("hex").toUpperCase();
}

function resolvePrivateKey(input: string): KeyObject {
  const normalized = normalizeKeyInput(input);
  const compactBase64 = normalized.includes("BEGIN")
    ? normalized
        .replace(/-----BEGIN [A-Z ]+-----/g, "")
        .replace(/-----END [A-Z ]+-----/g, "")
        .replace(/\s+/g, "")
    : normalized.replace(/\s+/g, "");
  const derBuffer = compactBase64 ? Buffer.from(compactBase64, "base64") : null;
  const candidates: Array<() => KeyObject> = [
    () => createPrivateKey(normalized),
    () => createPrivateKey(toPem(normalized, "PRIVATE KEY")),
    () => {
      if (!derBuffer) throw new Error("empty der");
      return createPrivateKey({ key: derBuffer, format: "der", type: "pkcs8" });
    },
    () => {
      if (!derBuffer) throw new Error("empty der");
      return createPrivateKey({ key: derBuffer, format: "der", type: "pkcs1" });
    },
  ];

  let lastError: Error | null = null;
  for (const candidate of candidates) {
    try {
      return candidate();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unable to decode private key");
    }
  }
  throw lastError ?? new Error("Unable to decode PalmPay private key");
}

function resolvePublicKey(input: string): KeyObject {
  const normalized = normalizeKeyInput(input);
  const compactBase64 = normalized.includes("BEGIN")
    ? normalized
        .replace(/-----BEGIN [A-Z ]+-----/g, "")
        .replace(/-----END [A-Z ]+-----/g, "")
        .replace(/\s+/g, "")
    : normalized.replace(/\s+/g, "");
  const derBuffer = compactBase64 ? Buffer.from(compactBase64, "base64") : null;
  const candidates: Array<() => KeyObject> = [
    () => createPublicKey(normalized),
    () => createPublicKey(toPem(normalized, "PUBLIC KEY")),
    () => {
      if (!derBuffer) throw new Error("empty der");
      return createPublicKey({ key: derBuffer, format: "der", type: "spki" });
    },
    () => {
      if (!derBuffer) throw new Error("empty der");
      return createPublicKey({ key: derBuffer, format: "der", type: "pkcs1" });
    },
  ];

  let lastError: Error | null = null;
  for (const candidate of candidates) {
    try {
      return candidate();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unable to decode public key");
    }
  }
  throw lastError ?? new Error("Unable to decode PalmPay public key");
}

function decodePalmPaySignature(signature: string) {
  if (!signature) return "";
  try {
    return decodeURIComponent(signature);
  } catch {
    return signature;
  }
}

function signPalmPayPayload(payload: Record<string, unknown>) {
  const cfg = getPalmConfig();
  if (!cfg.merchantPrivateKey) {
    throw new Error("PalmPay merchant private key is not configured.");
  }
  const signer = createSign("RSA-SHA1");
  signer.update(buildSignatureDigest(payload));
  signer.end();
  return signer.sign(resolvePrivateKey(cfg.merchantPrivateKey), "base64");
}

export function isPalmPayEnabled() {
  const cfg = getPalmConfig();
  return Boolean(cfg.appId && cfg.merchantPrivateKey);
}

export function getPalmPayConfigState() {
  const cfg = getPalmConfig();
  return {
    enabled: isPalmPayEnabled(),
    appIdConfigured: Boolean(cfg.appId),
    privateKeyConfigured: Boolean(cfg.merchantPrivateKey),
    publicKeyConfigured: Boolean(cfg.publicKey),
    baseUrl: cfg.baseUrl,
    bankName: cfg.bankName,
    env: cfg.env,
  };
}

/** orderStatus: 1 success, 2 failed, 0|3 pending */
export function mapPalmPayOrderStatus(
  rawStatus: unknown,
): "success" | "failed" | "pending" | null {
  const normalized = Number(rawStatus);
  if (normalized === 1) return "success";
  if (normalized === 2) return "failed";
  if (normalized === 0 || normalized === 3) return "pending";
  return null;
}

export function verifyPalmPayWebhook(rawBody: string): boolean {
  const cfg = getPalmConfig();
  if (!cfg.publicKey) {
    if (cfg.isDev) {
      console.warn(
        "[palmpay] webhook signature skipped — PALMPAY_PUBLIC_KEY not set (dev only)",
      );
      return true;
    }
    return false;
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    const body = isRecord(parsed) ? parsed : {};
    const signature = decodePalmPaySignature(readString(body.sign));
    if (!signature) return false;
    const { sign: _sign, ...rest } = body;
    const verifier = createVerify("RSA-SHA1");
    verifier.update(buildSignatureDigest(rest));
    verifier.end();
    return verifier.verify(resolvePublicKey(cfg.publicKey), signature, "base64");
  } catch {
    return false;
  }
}

function normalizePalmPayAccountName(value: string, fallback: string) {
  const normalized = readString(value).replace(/\s*\([^)]*\)\s*$/u, "").trim();
  return normalized || fallback;
}

function resolvePalmPayBankName(data: Record<string, unknown>) {
  const cfg = getPalmConfig();
  return (
    readString(data.bankName) ||
    readString(data.bank) ||
    readString(data.bank_name) ||
    cfg.bankName ||
    "PalmPay"
  );
}

export async function createPalmPayVirtualAccount(input: {
  reference: string;
  email: string;
  customerName: string;
  virtualAccountName: string;
  accountReference?: string;
  identityType?: "personal" | "personal_nin" | "company";
  licenseNumber?: string;
}): Promise<PalmPayVirtualAccountResult> {
  const cfg = getPalmConfig();
  if (!isPalmPayEnabled()) {
    return {
      provider: "palmpay",
      reference: input.reference,
      status: "failed",
      rawStatus: "NOT_CONFIGURED",
      reason: "PalmPay is not configured (APP_ID + private key required).",
    };
  }

  const payload: Record<string, unknown> = {
    requestTime: Date.now(),
    version: "V2.0",
    nonceStr: randomBytes(16).toString("hex"),
    virtualAccountName: input.virtualAccountName,
    email: input.email,
    customerName: input.customerName,
    accountReference: input.accountReference || input.reference,
  };

  if (input.identityType && input.licenseNumber) {
    payload.identityType = input.identityType;
    payload.licenseNumber = input.licenseNumber;
  }

  try {
    const res = await undiciFetch(`${cfg.baseUrl}/api/v2/virtual/account/label/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.appId}`,
        Signature: signPalmPayPayload(payload),
        countryCode: cfg.countryCode,
        "Content-Type": "application/json;charset=UTF-8",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      dispatcher: palmAgent,
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
    const status = body.status === true;
    const respCode = readString(body.respCode);
    const respMsg = readString(body.respMsg);
    const accountNumber = readString(data.virtualAccountNo);
    const accountName = normalizePalmPayAccountName(
      readString(data.virtualAccountName),
      input.virtualAccountName,
    );
    const bankName = resolvePalmPayBankName(data);
    const accountReference =
      readString(data.accountReference) || input.accountReference || input.reference;

    if (!res.ok || !status || respCode !== "00000000" || !accountNumber) {
      const reason = humanizePalmPayError(respMsg, respCode);
      console.warn("[palmpay] create VA failed", { httpStatus: res.status, respCode, respMsg });
      return {
        provider: "palmpay",
        reference: input.reference,
        status: "failed",
        providerReference: accountReference || undefined,
        rawStatus: respCode || "FAILED",
        reason,
        payload: body,
      };
    }

    return {
      provider: "palmpay",
      reference: input.reference,
      status: "pending",
      providerReference: accountReference || undefined,
      rawStatus: readString(data.status) || "Enabled",
      bankName,
      accountNumber,
      accountName,
      accountReference,
      payload: body,
    };
  } catch (error) {
    return {
      provider: "palmpay",
      reference: input.reference,
      status: "failed",
      rawStatus: "REQUEST_ERROR",
      reason: error instanceof Error ? error.message : "PalmPay virtual account request failed.",
    };
  }
}

function humanizePalmPayError(respMsg: string, respCode: string): string {
  const msg = (respMsg || "").toLowerCase();
  if (msg.includes("ip") && (msg.includes("white") || msg.includes("list"))) {
    return (
      "PalmPay rejected this server IP (not on the IP whitelist). " +
      "Add your production/server public IP in the PalmPay merchant dashboard, then try again."
    );
  }
  if (msg.includes("license") || msg.includes("identity") || msg.includes("bvn") || msg.includes("nin")) {
    return (
      respMsg ||
      "PalmPay requires KYC identity (BVN or NIN). Add it under Profile, then try again."
    );
  }
  return respMsg || `PalmPay virtual account creation failed${respCode ? ` (${respCode})` : ""}.`;
}
