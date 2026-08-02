// GoldAPI.io - https://www.goldapi.io/dashboard
// Primary path asks GoldAPI for XAU/NGN directly. If the account/currency route
// fails, we fall back to XAU/USD plus a live USD/NGN quote before using env fallback.

type GoldQuote = {
  pricePerGramNgn: number;
  changePercent: number;
  mocked: boolean;
  source: string;
  asOf?: string;
};

type JsonRecord = Record<string, unknown>;

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { expiresAt: number; value: GoldQuote } | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim().replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchGoldApi(currency: "NGN" | "USD") {
  const apiKey = process.env.GOLDAPI_KEY;
  if (!apiKey) return null;

  const res = await fetch(`https://www.goldapi.io/api/XAU/${currency}`, {
    headers: { "x-access-token": apiKey, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(data)) return null;

  const pricePerGram = readNumber(data.price_gram_24k);
  if (pricePerGram == null) return null;

  return {
    pricePerGram,
    changePercent: readNumber(data.chp) ?? 0,
    timestamp: readNumber(data.timestamp),
  };
}

async function fetchFreeGoldUsd() {
  const res = await fetch("https://api.gold-api.com/price/XAU", {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(data)) return null;

  const ouncePrice = readNumber(data.price) ?? readNumber(data.ask) ?? readNumber(data.bid);
  if (ouncePrice == null) return null;

  return {
    pricePerGram: ouncePrice / 31.1034768,
    changePercent: readNumber(data.chp) ?? readNumber(data.change_percent) ?? 0,
    timestamp: readNumber(data.timestamp),
  };
}

async function fetchUsdNgnRate() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { Accept: "application/json" },
    next: { revalidate: 900 },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(data)) return null;
  const rates = isRecord(data.rates) ? data.rates : {};
  return readNumber(rates.NGN);
}

function asOf(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString();
}

export async function getGoldPriceNgnPerGram(): Promise<GoldQuote> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  const fallbackRate = Number(process.env.USD_NGN_FALLBACK_RATE || 1600);

  try {
    const ngn = await fetchGoldApi("NGN");
    if (ngn) {
      const value = {
        pricePerGramNgn: Math.round(ngn.pricePerGram),
        changePercent: Number(ngn.changePercent.toFixed(2)),
        mocked: false,
        source: "goldapi:xau-ngn",
        asOf: asOf(ngn.timestamp),
      };
      cache = { expiresAt: Date.now() + CACHE_TTL_MS, value };
      return value;
    }

    const usd = (await fetchGoldApi("USD")) ?? (await fetchFreeGoldUsd());
    const usdNgn = (await fetchUsdNgnRate()) ?? fallbackRate;
    if (usd) {
      const value = {
        pricePerGramNgn: Math.round(usd.pricePerGram * usdNgn),
        changePercent: Number(usd.changePercent.toFixed(2)),
        mocked: false,
        source: "gold-usd-live-fx",
        asOf: asOf(usd.timestamp),
      };
      cache = { expiresAt: Date.now() + CACHE_TTL_MS, value };
      return value;
    }
  } catch (error) {
    console.warn("[gold] live quote failed", error);
  }

  const value = {
    pricePerGramNgn: 127340,
    changePercent: 0,
    mocked: true,
    source: "fallback",
    asOf: new Date().toISOString(),
  };
  cache = { expiresAt: Date.now() + 60_000, value };
  return value;
}
