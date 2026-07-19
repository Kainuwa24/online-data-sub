import { NextResponse } from "next/server";
import { getGoldPriceNgnPerGram } from "@/lib/services/goldapi";

export async function GET() {
  const gold = await getGoldPriceNgnPerGram();
  return NextResponse.json(gold);
}
