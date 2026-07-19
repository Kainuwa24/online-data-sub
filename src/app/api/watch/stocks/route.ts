import { NextResponse } from "next/server";

// TODO: wire to a real NGX feed — see PROVIDERS.md for the cost/reliability
// trade-offs between official NGX pricing and cheaper unofficial feeds.
// Mock data below matches the shape the Watch screen expects so the UI can
// be built against this now and swapped later without a frontend change.
const MOCK_STOCKS = [
  { ticker: "MTNN", name: "MTN Nigeria", priceKobo: 2185000, changePercent: 1.4 },
  { ticker: "DANGCEM", name: "Dangote Cement", priceKobo: 41200000, changePercent: -0.6 },
  { ticker: "GTCO", name: "GTCO", priceKobo: 562000, changePercent: 2.1 },
  { ticker: "ZENITHBANK", name: "Zenith Bank", priceKobo: 448500, changePercent: 0.3 },
  { ticker: "BUAFOODS", name: "BUA Foods", priceKobo: 3899000, changePercent: -1.1 },
];

export async function GET() {
  return NextResponse.json({ stocks: MOCK_STOCKS, mocked: true });
}
