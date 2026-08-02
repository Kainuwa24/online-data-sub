export type StockQuote = {
  ticker: string;
  symbol: string;
  name: string;
  priceKobo: number;
  changePercent: number;
  source: string;
  asOf?: string;
};

type YahooResult = {
  meta?: {
    symbol?: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice?: number;
    chartPreviousClose?: number;
    previousClose?: number;
    regularMarketTime?: number;
  };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{ close?: Array<number | null> }>;
  };
};

type YahooResponse = {
  chart?: {
    result?: YahooResult[];
    error?: unknown;
  };
};

const DEFAULT_SYMBOLS = [
  "MTNN.LG",
  "DANGCEM.LG",
  "GTCO.LG",
  "ZENITHBANK.LG",
  "BUAFOODS.LG",
];

const FALLBACK_STOCKS: StockQuote[] = [
  { ticker: "MTNN", symbol: "MTNN.LG", name: "MTN Nigeria", priceKobo: 2185000, changePercent: 0, source: "fallback" },
  { ticker: "DANGCEM", symbol: "DANGCEM.LG", name: "Dangote Cement", priceKobo: 41200000, changePercent: 0, source: "fallback" },
  { ticker: "GTCO", symbol: "GTCO.LG", name: "GTCO", priceKobo: 562000, changePercent: 0, source: "fallback" },
  { ticker: "ZENITHBANK", symbol: "ZENITHBANK.LG", name: "Zenith Bank", priceKobo: 448500, changePercent: 0, source: "fallback" },
  { ticker: "BUAFOODS", symbol: "BUAFOODS.LG", name: "BUA Foods", priceKobo: 3899000, changePercent: 0, source: "fallback" },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { expiresAt: number; value: { stocks: StockQuote[]; mocked: boolean; source: string } } | null = null;

function configuredSymbols() {
  const raw = process.env.NGX_STOCK_SYMBOLS || process.env.STOCK_SYMBOLS || "";
  const symbols = raw
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .map((item) => (item.includes(".") ? item : `${item}.LG`));

  return symbols.length ? symbols : DEFAULT_SYMBOLS;
}

function tickerFromSymbol(symbol: string) {
  return symbol.replace(/\.LG$/i, "");
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function lastClose(result: YahooResult) {
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  for (let i = closes.length - 1; i >= 0; i -= 1) {
    const close = readNumber(closes[i]);
    if (close != null) return close;
  }
  return null;
}

async function fetchYahooQuote(symbol: string): Promise<StockQuote | null> {
  const params = new URLSearchParams({ interval: "1d", range: "5d" });
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`,
    {
      headers: { Accept: "application/json", "User-Agent": "online-data-sub/1.0" },
      next: { revalidate: 300 },
    },
  );
  const data = (await res.json().catch(() => null)) as YahooResponse | null;
  const result = data?.chart?.result?.[0];
  if (!res.ok || !result) return null;

  const meta = result.meta ?? {};
  const price = readNumber(meta.regularMarketPrice) ?? lastClose(result);
  if (price == null) return null;

  const previous = readNumber(meta.chartPreviousClose) ?? readNumber(meta.previousClose);
  const changePercent = previous && previous > 0 ? ((price - previous) / previous) * 100 : 0;
  const timestamp = readNumber(meta.regularMarketTime) ?? result.timestamp?.at(-1) ?? null;

  return {
    ticker: tickerFromSymbol(symbol),
    symbol,
    name: meta.longName || meta.shortName || tickerFromSymbol(symbol),
    priceKobo: Math.round(price * 100),
    changePercent: Number(changePercent.toFixed(2)),
    source: "yahoo-finance",
    asOf: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
  };
}

export async function getNgxStockQuotes() {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  try {
    const quotes = await Promise.all(configuredSymbols().map((symbol) => fetchYahooQuote(symbol)));
    const stocks = quotes.filter((quote): quote is StockQuote => Boolean(quote));
    if (stocks.length) {
      const value = { stocks, mocked: false, source: "yahoo-finance" };
      cache = { expiresAt: Date.now() + CACHE_TTL_MS, value };
      return value;
    }
  } catch (error) {
    console.warn("[stocks] live quotes failed", error);
  }

  const value = { stocks: FALLBACK_STOCKS, mocked: true, source: "fallback" };
  cache = { expiresAt: Date.now() + 60_000, value };
  return value;
}
