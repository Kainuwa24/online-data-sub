import { NextResponse } from "next/server";
import { getFxRatesToNgn } from "@/lib/services/fx";

export const dynamic = "force-dynamic";

export async function GET() {
  const fx = await getFxRatesToNgn();
  return NextResponse.json(fx);
}
