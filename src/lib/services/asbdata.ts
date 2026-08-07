/**
 * ASBDATA VTU API
 * Docs: https://documenter.getpostman.com/view/12429346/UVe9QUS8
 * Base: https://asbdata.com
 *
 * Auth: Authorization: Token <token>
 * Airtime: POST /api/topup/
 * Data:    POST /api/data/
 * Plans:   GET  /api/network/
 * Bills:   POST /api/billpayment/
 * Cable:   POST /api/cablesub/
 *
 * Ported from onlinedatasub monorepo.
 */
import { Agent, fetch as undiciFetch } from "undici";
import { formatPlanPrice, nairaToKobo } from "@/lib/money";
import { normalizePlanType } from "./plan-type";

export type Network = "MTN" | "Airtel" | "Glo" | "9mobile";
export const NETWORKS: Network[] = ["MTN", "Airtel", "Glo", "9mobile"];

export type AsbDataPlan = {
  network: Network;
  variationCode: string;
  size: string;
  validity: string;
  priceKobo: number;
  /** Vendor wholesale price before any operator margin. */
  costKobo: number;
  name: string;
  planType: string;
};

export type AsbResult = {
  success: boolean;
  requestId: string;
  providerReference?: string;
  message?: string;
  token?: string;
  raw?: unknown;
};

export type AsbBalanceResult = {
  provider: "asbdata";
  configured: boolean;
  success: boolean;
  balanceKobo?: number;
  message?: string;
  raw?: unknown;
};

const asbAgent = new Agent({
  connect: { family: 4, timeout: 25_000 },
  headersTimeout: 60_000,
  bodyTimeout: 60_000,
  keepAliveTimeout: 10_000,
});

const MAX_ATTEMPTS = 3;

const NETWORK_IDS: Record<Network, number> = {
  MTN: 1,
  Glo: 2,
  "9mobile": 3,
  Airtel: 4,
};

const NETWORK_FROM_ID: Record<number, Network> = {
  1: "MTN",
  2: "Glo",
  3: "9mobile",
  4: "Airtel",
};

type PlanCache = {
  expiresAt: number;
  plans: AsbDataPlan[];
  byCode: Map<string, { networkId: number; planId: number; wholesaleNgn: number }>;
};

let planCache: PlanCache | null = null;
const PLAN_TTL_MS = 5 * 60 * 1000;

function getConfig() {
  return {
    baseUrl: (process.env.ASBDATA_BASE_URL || "https://asbdata.com").replace(/\/$/, ""),
    token: process.env.ASBDATA_TOKEN || process.env.ASBDATA_API_TOKEN || "",
    balancePath: process.env.ASBDATA_BALANCE_PATH || "/api/user/",
    platformMarkupNgn: Number(process.env.ASBDATA_PLATFORM_MARKUP_NGN ?? 0),
    airtimeType: process.env.ASBDATA_AIRTIME_TYPE || "VTU",
  };
}

export function isAsbdataConfigured(): boolean {
  const token = process.env.ASBDATA_TOKEN || process.env.ASBDATA_API_TOKEN || "";
  return Boolean(token && token.trim().length > 10);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function readNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function findBalanceNgn(value: unknown): number | null {
  if (!isRecord(value)) return readNumber(value);

  for (const key of [
    "balance",
    "Balance",
    "account_balance",
    "Account_Balance",
    "wallet_balance",
    "Wallet_Balance",
    "amount",
    "available_balance",
    "ledger_balance",
  ]) {
    const found = readNumber(value[key]);
    if (found != null) return found;
  }

  for (const nestedKey of ["data", "user", "account", "wallet", "profile"]) {
    const nested = value[nestedKey];
    if (isRecord(nested)) {
      const found = findBalanceNgn(nested);
      if (found != null) return found;
    }
  }

  return null;
}

function isTransportError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENETUNREACH|EAI_AGAIN|UND_ERR|socket|timeout/i.test(
    `${msg} ${code}`,
  );
}

function digitsOnly(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("234")) return `0${d.slice(3)}`;
  if (d.length === 11 && d.startsWith("0")) return d;
  return d;
}

function transportMessage(err: unknown): string {
  if (isTransportError(err)) {
    return "Could not reach ASBDATA right now. Check connection and try again.";
  }
  return err instanceof Error ? err.message : "ASBDATA request failed";
}

async function request(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; json: unknown; text: string }> {
  const cfg = getConfig();
  const url = `${cfg.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await undiciFetch(url, {
        method,
        headers: {
          Authorization: `Token ${cfg.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        dispatcher: asbAgent,
      });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text };
      }
      return { status: res.status, json, text };
    } catch (err) {
      lastErr = err;
      if (!isTransportError(err) || attempt === MAX_ATTEMPTS) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function mapPurchaseResult(
  status: number,
  json: unknown,
  text: string,
  requestId: string,
): AsbResult {
  const rec = isRecord(json) ? json : {};
  const statusText = (
    readString(rec.Status) ||
    readString(rec.status) ||
    readString(rec.status_code) ||
    ""
  ).toLowerCase();
  const apiCode =
    readNumber(rec.status) ?? readNumber(rec.Status) ?? readNumber(rec.code) ?? null;

  const message =
    readString(rec.api_response) ||
    readString(rec.message) ||
    readString(rec.msg) ||
    readString(rec.error) ||
    (text && text.length < 200 ? text : "") ||
    (status >= 400 ? `ASBDATA HTTP ${status}` : "OK");

  const providerReference =
    readString(rec.ident) ||
    readString(rec.reference) ||
    readString(rec.transid) ||
    readString(rec.transaction_id) ||
    readString(rec.id) ||
    readString(isRecord(rec.data) ? rec.data.ident : undefined) ||
    undefined;

  const successHint =
    statusText.includes("success") ||
    statusText === "ok" ||
    statusText === "delivered" ||
    apiCode === 1 ||
    apiCode === 200 ||
    rec.success === true ||
    rec.Status === true ||
    readString(rec.api_response).toLowerCase().includes("success");

  const failHint =
    status >= 400 ||
    statusText.includes("fail") ||
    statusText.includes("error") ||
    statusText.includes("insufficient") ||
    rec.success === false;

  const success = !failHint && (successHint || (status < 400 && !statusText));

  return {
    success,
    requestId,
    providerReference,
    message: message || (success ? "delivered" : "ASBDATA purchase failed"),
    raw: json,
  };
}

function extractPlanRows(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json.filter(isRecord);
  if (!isRecord(json)) return [];

  const asbKeys = Object.keys(json).filter((k) => /_PLAN$/i.test(k));
  if (asbKeys.length) {
    const rows: Record<string, unknown>[] = [];
    for (const k of asbKeys) {
      const arr = json[k];
      if (Array.isArray(arr)) rows.push(...arr.filter(isRecord));
    }
    if (rows.length) return rows;
  }

  for (const key of ["data", "plans", "results", "Plan", "network", "Dataplans"]) {
    const v = json[key];
    if (Array.isArray(v)) return v.filter(isRecord);
    if (isRecord(v)) {
      const nested: Record<string, unknown>[] = [];
      for (const val of Object.values(v)) {
        if (Array.isArray(val)) nested.push(...val.filter(isRecord));
      }
      if (nested.length) return nested;
    }
  }
  return [];
}

function networkIdFromName(name: string): number | null {
  const n = name.toUpperCase().replace(/\s+/g, "");
  if (n.includes("MTN")) return 1;
  if (n.includes("GLO")) return 2;
  if (n.includes("9MOBILE") || n.includes("ETISALAT")) return 3;
  if (n.includes("AIRTEL")) return 4;
  return null;
}

function normalizeSize(size: string): string {
  const s = size.trim();
  if (!s) return "Data";
  if (/gb|mb/i.test(s)) return s.replace(/\s+/g, "");
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n >= 1) return `${n}GB`;
    return `${Math.round(n * 1000)}MB`;
  }
  return s;
}

function mapDiscoName(biller: string): number {
  const b = biller.toLowerCase();
  const table: [RegExp, number][] = [
    [/ikeja|ikedc/, 1],
    [/eko|ekedc/, 2],
    [/abuja|aedc/, 3],
    [/kano|kedco/, 4],
    [/enugu|eedc/, 5],
    [/port\s*harcourt|phed/, 6],
    [/ibadan|ibedc/, 7],
    [/kaduna|kaedco/, 8],
    [/jos|jed/, 9],
    [/benin|bedc/, 10],
    [/yola|yedc/, 11],
  ];
  for (const [re, id] of table) {
    if (re.test(b)) return id;
  }
  const n = Number(biller);
  return Number.isFinite(n) ? n : 1;
}

async function loadAllPlans(): Promise<PlanCache> {
  if (planCache && planCache.expiresAt > Date.now()) return planCache;
  const cfg = getConfig();

  const { status, json } = await request("GET", "/api/network/");
  if (status >= 400) throw new Error(`ASBDATA plan catalog failed (${status})`);

  const plans: AsbDataPlan[] = [];
  const byCode = new Map<string, { networkId: number; planId: number; wholesaleNgn: number }>();

  for (const row of extractPlanRows(json)) {
    const planId =
      readNumber(row.id) ??
      readNumber(row.dataplan_id) ??
      readNumber(row.plan_id) ??
      readNumber(row.data_id);
    const networkId =
      readNumber(row.network) ??
      readNumber(row.network_id) ??
      networkIdFromName(readString(row.plan_network || row.network_name || row.networkname));
    const amount =
      readNumber(row.plan_amount) ?? readNumber(row.amount) ?? readNumber(row.price);
    if (planId == null || networkId == null || amount == null) continue;

    const net = NETWORK_FROM_ID[networkId];
    if (!net) continue;

    const sizeRaw =
      readString(row.plan) || readString(row.size || row.plan_size || row.data_size) || "Data";
    const size =
      /^\d+$/.test(sizeRaw) && sizeRaw === String(planId) ? "Data" : normalizeSize(sizeRaw);
    const validity =
      readString(row.month_validate || row.validity || row.plan_validity || row.day) || "—";
    const rawType = readString(row.plan_type || row.type || row.category);
    const planType = normalizePlanType(rawType);
    const retailNgn = amount + (cfg.platformMarkupNgn || 0);
    const code = String(planId);

    byCode.set(code, { networkId, planId, wholesaleNgn: amount });
    plans.push({
      network: net,
      variationCode: code,
      size,
      validity,
      priceKobo: nairaToKobo(retailNgn),
      costKobo: nairaToKobo(amount),
      name: rawType ? `${net} ${size} · ${rawType}` : `${net} ${size}`,
      planType,
    });
  }

  planCache = { expiresAt: Date.now() + PLAN_TTL_MS, plans, byCode };
  return planCache;
}

export async function getAsbdataBalance(): Promise<AsbBalanceResult> {
  const cfg = getConfig();
  if (!isAsbdataConfigured()) {
    return {
      provider: "asbdata",
      configured: false,
      success: false,
      message: "ASBDATA token is not configured.",
    };
  }

  try {
    const { status, json, text } = await request("GET", cfg.balancePath);
    if (status >= 400) {
      return {
        provider: "asbdata",
        configured: true,
        success: false,
        message: text && text.length < 200 ? text : `ASBDATA balance failed (${status})`,
        raw: json,
      };
    }

    const balanceNgn = findBalanceNgn(json);
    if (balanceNgn == null) {
      return {
        provider: "asbdata",
        configured: true,
        success: false,
        message: "ASBDATA balance response did not include a recognizable balance field.",
        raw: json,
      };
    }

    return {
      provider: "asbdata",
      configured: true,
      success: true,
      balanceKobo: nairaToKobo(balanceNgn),
      raw: json,
    };
  } catch (err) {
    return {
      provider: "asbdata",
      configured: true,
      success: false,
      message: transportMessage(err),
    };
  }
}

/** Static fallback plans when ASBDATA is not configured. */
const FALLBACK_PLANS: AsbDataPlan[] = [
  { network: "MTN", variationCode: "demo-mtn-1gb", size: "1GB", validity: "30 days", priceKobo: 45000, costKobo: 45000, name: "MTN 1GB", planType: "STANDARD" },
  { network: "MTN", variationCode: "demo-mtn-2gb", size: "2GB", validity: "30 days", priceKobo: 90000, costKobo: 90000, name: "MTN 2GB", planType: "STANDARD" },
  { network: "Airtel", variationCode: "demo-airtel-1gb", size: "1GB", validity: "30 days", priceKobo: 45000, costKobo: 45000, name: "Airtel 1GB", planType: "STANDARD" },
  { network: "Glo", variationCode: "demo-glo-1.5gb", size: "1.5GB", validity: "30 days", priceKobo: 50000, costKobo: 50000, name: "Glo 1.5GB", planType: "STANDARD" },
  { network: "9mobile", variationCode: "demo-9m-1gb", size: "1GB", validity: "30 days", priceKobo: 45000, costKobo: 45000, name: "9mobile 1GB", planType: "STANDARD" },
];

export async function listDataPlans(network?: string): Promise<AsbDataPlan[]> {
  if (!isAsbdataConfigured()) {
    console.warn("[asbdata] no token — returning fallback plans");
    return network
      ? FALLBACK_PLANS.filter((p) => p.network === network)
      : FALLBACK_PLANS;
  }

  try {
    const all = await loadAllPlans();
    if (network) {
      return all.plans.filter((p) => p.network === network);
    }
    return all.plans;
  } catch (e) {
    console.error("[asbdata] listDataPlans failed", e);
    return network
      ? FALLBACK_PLANS.filter((p) => p.network === network)
      : FALLBACK_PLANS;
  }
}

export async function purchaseData(params: {
  network: string;
  phone: string;
  variationCode: string;
  amountKobo: number;
  requestId: string;
}): Promise<AsbResult> {
  if (!isAsbdataConfigured()) {
    console.warn("[asbdata] no token — simulating data purchase");
    return { success: true, requestId: params.requestId, providerReference: `SIM-${params.requestId}`, message: "simulated" };
  }

  const network = params.network as Network;
  const networkId = NETWORK_IDS[network];
  if (!networkId) {
    return { success: false, requestId: params.requestId, message: `Unsupported network ${params.network}` };
  }

  const planId = Number(params.variationCode);
  if (!Number.isFinite(planId)) {
    return { success: false, requestId: params.requestId, message: "Invalid plan id" };
  }

  try {
    const { status, json, text } = await request("POST", "/api/data/", {
      network: networkId,
      mobile_number: digitsOnly(params.phone),
      plan: planId,
      Ported_number: true,
    });
    return mapPurchaseResult(status, json, text, params.requestId);
  } catch (err) {
    return { success: false, requestId: params.requestId, message: transportMessage(err) };
  }
}

export async function purchaseAirtime(params: {
  network: string;
  phone: string;
  amountKobo: number;
  requestId: string;
}): Promise<AsbResult> {
  if (!isAsbdataConfigured()) {
    console.warn("[asbdata] no token — simulating airtime purchase");
    return { success: true, requestId: params.requestId, providerReference: `SIM-${params.requestId}`, message: "simulated" };
  }

  const network = params.network as Network;
  const networkId = NETWORK_IDS[network];
  if (!networkId) {
    return { success: false, requestId: params.requestId, message: `Unsupported network ${params.network}` };
  }

  const amountNgn = Math.round(params.amountKobo / 100);
  if (amountNgn < 50) {
    return { success: false, requestId: params.requestId, message: "Minimum airtime is ₦50" };
  }

  const cfg = getConfig();
  try {
    const { status, json, text } = await request("POST", "/api/topup/", {
      network: networkId,
      amount: amountNgn,
      mobile_number: digitsOnly(params.phone),
      Ported_number: true,
      airtime_type: cfg.airtimeType || "VTU",
    });
    return mapPurchaseResult(status, json, text, params.requestId);
  } catch (err) {
    return { success: false, requestId: params.requestId, message: transportMessage(err) };
  }
}

export async function payBill(params: {
  category: string;
  biller: string;
  serviceID?: string;
  account: string;
  amountKobo: number;
  variationCode?: string;
  requestId: string;
}): Promise<AsbResult> {
  if (!isAsbdataConfigured()) {
    console.warn("[asbdata] no token — simulating bill payment");
    return { success: true, requestId: params.requestId, providerReference: `SIM-${params.requestId}`, message: "simulated" };
  }

  const cat = (params.category || "").toLowerCase();
  try {
    if (cat.includes("cable") || cat.includes("tv") || cat.includes("dstv") || cat.includes("gotv")) {
      const cableId = Number(params.variationCode?.split(":")[0] || params.serviceID || params.biller);
      const planId = Number(params.variationCode?.split(":")[1] || 0);
      const { status, json, text } = await request("POST", "/api/cablesub/", {
        cablename: cableId,
        cableplan: planId,
        smart_card_number: digitsOnly(params.account),
      });
      return mapPurchaseResult(status, json, text, params.requestId);
    }

    const discoId = Number(params.variationCode || params.serviceID || mapDiscoName(params.biller));
    const meterType =
      (params.variationCode || "").toLowerCase().includes("post") || params.variationCode === "2"
        ? 2
        : 1;

    const { status, json, text } = await request("POST", "/api/billpayment/", {
      disco_name: discoId || params.biller,
      amount: Math.round(params.amountKobo / 100),
      meter_number: digitsOnly(params.account),
      MeterType: meterType,
    });
    const result = mapPurchaseResult(status, json, text, params.requestId);
    if (isRecord(json)) {
      const token =
        readString(json.token) ||
        readString(json.Token) ||
        readString(json.purchased_code) ||
        readString(isRecord(json.data) ? json.data.token : undefined);
      if (token) result.token = token;
    }
    return result;
  } catch (err) {
    return { success: false, requestId: params.requestId, message: transportMessage(err) };
  }
}

/** Billers mapped to ASB-friendly service IDs (disco/cable numeric codes where known). */
export function listBillers() {
  return {
    Electricity: [
      { serviceID: "1", name: "Ikeja Electric (IKEDC)", variationCode: "1" },
      { serviceID: "2", name: "Eko Electric (EKEDC)", variationCode: "2" },
      { serviceID: "3", name: "Abuja Electric (AEDC)", variationCode: "3" },
      { serviceID: "4", name: "Kano Electric (KEDCO)", variationCode: "4" },
      { serviceID: "6", name: "Port Harcourt Electric (PHED)", variationCode: "6" },
      { serviceID: "7", name: "Ibadan Electric (IBEDC)", variationCode: "7" },
    ],
    "Cable TV": [
      { serviceID: "dstv", name: "DStv", variationCode: "2:0" },
      { serviceID: "gotv", name: "GOtv", variationCode: "1:0" },
      { serviceID: "startimes", name: "Startimes", variationCode: "3:0" },
    ],
    Internet: [
      { serviceID: "spectranet", name: "Spectranet", variationCode: "spectranet" },
      { serviceID: "smile", name: "Smile", variationCode: "smile" },
    ],
  };
}

// silence unused import if tree-shaken differently
void formatPlanPrice;
