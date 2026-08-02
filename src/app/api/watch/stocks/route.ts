import { NextResponse } from "next/server";
import { getNgxStockQuotes } from "@/lib/services/stocks";

export const dynamic = "force-dynamic";

export async function GET() {
  const stocks = await getNgxStockQuotes();
  return NextResponse.json(stocks);
}
