// GoldAPI.io — https://www.goldapi.io/dashboard
// Returns a naira-per-gram price. The USD->NGN conversion uses a fallback
// rate from .env for now — swap in a real forex source before this goes
// live, since a stale FX rate will visibly drift from the real price.

export async function getGoldPriceNgnPerGram() {
  const apiKey = process.env.GOLDAPI_KEY;
  const fallbackRate = Number(process.env.USD_NGN_FALLBACK_RATE || 1600);

  if (!apiKey) {
    console.warn("[goldapi] no API key set — returning mock gold price");
    return { pricePerGramNgn: 127340, changePercent: 0.8, mocked: true };
  }

  const res = await fetch("https://www.goldapi.io/api/XAU/USD", {
    headers: { "x-access-token": apiKey },
  });
  const data = await res.json();

  const pricePerGramUsd = data.price_gram_24k as number;
  const pricePerGramNgn = Math.round(pricePerGramUsd * fallbackRate);
  const changePercent = data.chp as number;

  return { pricePerGramNgn, changePercent, mocked: false };
}
