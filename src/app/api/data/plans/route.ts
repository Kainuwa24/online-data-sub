import { NextRequest, NextResponse } from "next/server";
import { listDataPlans } from "@/lib/services/asbdata";

export async function GET(req: NextRequest) {
  const network = req.nextUrl.searchParams.get("network") || undefined;
  const plans = await listDataPlans(network || undefined);
  return NextResponse.json({ plans, mocked: !process.env.ASBDATA_TOKEN });
}
