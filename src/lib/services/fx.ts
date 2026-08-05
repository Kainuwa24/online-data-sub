/**
 * Foreign currencies → Naira (informational mid-market style quotes).
 * Primary: open.er-api.com (free, no key). Fallback static table if offline.
 */

export type FxCurrencyCode = "USD" | "GBP" | "EUR" | "SAR" | "AED" | "GHS" | "XOF";

export type FxRate = {
  code: FxCurrencyCode;
  name: string;
  /** Display short label (e.g. Dollar, Pound) */
  shortName: string;
  symbol: string;
  /** How many NGN for 1 unit of this currency */
  rateToNgn: number;
};

export type FxSnapshot = {
  rates: FxRate[];
  mocked: boolean;
  source: string;
  asOf: string;
  /** When the upstream feed publishes its next refresh, if it tells us. */
  nextUpdateAt?: string;
};

export const FX_CURRENCIES: Array<{
  code: FxCurrencyCode;
  name: string;
  shortName: string;
  symbol: string;
}> = [
  { code: "USD", name: "US Dollar", shortName: "Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", shortName: "Pound", symbol: "£" },
  { code: "EUR", name: "Euro", shortName: "Euro", symbol: "€" },
  { code: "SAR", name: "Saudi Riyal", shortName: "Riyal", symbol: "﷼" },
  { code: "AED", name: "UAE Dirham", shortName: "Dirham", symbol: "د.إ" },
  { code: "GHS", name: "Ghanaian Cedi", shortName: "Cedi", symbol: "₵" },
  { code: "XOF", name: "West African CFA", shortName: "CFA (XOF)", symbol: "CFA" },
];

/**
 * Parallel-market ("street"/BDC) rates used only when live FX is unreachable.
 * Snapshot taken 2026-08-05 from Lagos BDC reporting. USD/GBP/EUR are observed
 * quotes; SAR, AED and XOF are derived from their USD/EUR pegs, and GHS from
 * the USD cross — street trackers rarely quote those directly.
 *
 * These are deliberately the parallel rate, not the CBN/interbank rate, so they
 * match what a user is quoted by a dealer. Re-check when materially stale;
 * the naira can move faster than this table.
 */
const FALLBACK_TO_NGN: Record<FxCurrencyCode, number> = {
  USD: 1415,
  GBP: 1900,
  EUR: 1605,
  SAR: 377.33,
  AED: 385.3,
  GHS: 120.78,
  XOF: 2.4468,
};

/** Date the table above was sampled, surfaced so the UI can admit its age. */
const FALLBACK_AS_OF = "2026-08-05T12:00:00Z";

const CACHE_TTL_MS = 10 * 60 * 1000;
/** Never re-poll faster than this, even if upstream claims it just refreshed. */
const MIN_CACHE_MS = 5 * 60 * 1000;
/** Nor sit on a snapshot longer than this, in case the feed's schedule slips. */
const MAX_CACHE_MS = 6 * 60 * 60 * 1000;
let cache: { expiresAt: number; value: FxSnapshot } | null = null;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim().replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function buildRatesFromUsdBase(usdRates: Record<string, unknown>): FxRate[] | null {
  const usdToNgn = readNumber(usdRates.NGN);
  if (usdToNgn == null) return null;

  const rates: FxRate[] = [];
  for (const meta of FX_CURRENCIES) {
    if (meta.code === "USD") {
      rates.push({
        ...meta,
        rateToNgn: roundRate(usdToNgn),
      });
      continue;
    }
    const perUsd = readNumber(usdRates[meta.code]);
    if (perUsd == null || perUsd <= 0) return null;
    // 1 foreign = (1 / units_per_USD) USD = NGN_per_USD / units_per_USD
    rates.push({
      ...meta,
      rateToNgn: roundRate(usdToNgn / perUsd),
    });
  }
  return rates;
}

function roundRate(value: number) {
  if (value >= 100) return Math.round(value * 100) / 100;
  if (value >= 10) return Math.round(value * 1000) / 1000;
  return Math.round(value * 10000) / 10000;
}

function fallbackSnapshot(): FxSnapshot {
  return {
    rates: FX_CURRENCIES.map((meta) => ({
      ...meta,
      rateToNgn: FALLBACK_TO_NGN[meta.code],
    })),
    mocked: true,
    source: "fallback",
    // The sample date, not now — else a months-old table reads as "set today".
    asOf: FALLBACK_AS_OF,
  };
}

async function fetchOpenErApi(): Promise<FxSnapshot | null> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { Accept: "application/json" },
    next: { revalidate: 600 },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(data)) return null;
  if (readString(data.result) && data.result !== "success") return null;

  const ratesObj = isRecord(data.rates) ? data.rates : null;
  if (!ratesObj) return null;

  const rates = buildRatesFromUsdBase(ratesObj);
  if (!rates) return null;

  return {
    rates,
    mocked: false,
    source: "open.er-api",
    asOf: readTimestamp(data.time_last_update_unix, data.time_last_update_utc),
    nextUpdateAt:
      readTimestamp(data.time_next_update_unix, data.time_next_update_utc, null) ?? undefined,
  };
}

/**
 * The feed gives both a unix seconds field and an RFC-1123 string; prefer the
 * former. Returns `fallback` (now, by default) when neither parses.
 */
function readTimestamp<T extends string | null>(
  unix: unknown,
  utc: unknown,
  fallback: T = new Date().toISOString() as T,
): string | T {
  if (typeof unix === "number" && Number.isFinite(unix) && unix > 0) {
    return new Date(unix * 1000).toISOString();
  }
  const text = readString(utc);
  if (text && !Number.isNaN(Date.parse(text))) return new Date(text).toISOString();
  return fallback;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** Secondary free endpoint (same math, different host). */
async function fetchExchangeRateApi(): Promise<FxSnapshot | null> {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
    headers: { Accept: "application/json" },
    next: { revalidate: 600 },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(data)) return null;
  const ratesObj = isRecord(data.rates) ? data.rates : null;
  if (!ratesObj) return null;

  const rates = buildRatesFromUsdBase(ratesObj);
  if (!rates) return null;

  // This host exposes a real unix stamp; fall back to noon on `date` only if absent.
  const date = readString(data.date);
  const dateNoon = date ? `${date}T12:00:00Z` : null;
  return {
    rates,
    mocked: false,
    source: "exchangerate-api",
    asOf: readTimestamp(data.time_last_updated, dateNoon),
  };
}

/**
 * Hold a snapshot until the feed says it will publish again — polling a
 * once-daily feed every 10 minutes just re-fetches identical numbers.
 */
function cacheExpiryFor(snapshot: FxSnapshot) {
  const now = Date.now();
  if (!snapshot.nextUpdateAt) return now + CACHE_TTL_MS;
  const next = Date.parse(snapshot.nextUpdateAt);
  if (Number.isNaN(next)) return now + CACHE_TTL_MS;
  // Re-poll just after the announced refresh, clamped either side.
  const target = next + 60_000;
  return Math.min(Math.max(target, now + MIN_CACHE_MS), now + MAX_CACHE_MS);
}

export async function getFxRatesToNgn(): Promise<FxSnapshot> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  try {
    const live = (await fetchOpenErApi()) ?? (await fetchExchangeRateApi());
    if (live) {
      cache = { expiresAt: cacheExpiryFor(live), value: live };
      return live;
    }
  } catch (error) {
    console.warn("[fx] live rates failed", error);
  }

  const value = fallbackSnapshot();
  cache = { expiresAt: Date.now() + 60_000, value };
  return value;
}

export function convertToNgn(amount: number, rateToNgn: number) {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  if (!Number.isFinite(rateToNgn) || rateToNgn <= 0) return 0;
  return amount * rateToNgn;
}
