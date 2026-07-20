import { NextRequest, NextResponse } from "next/server";
import { getCachedDataPlans } from "@/lib/plans-cache";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const network = req.nextUrl.searchParams.get("network") || undefined;
  let plans = await getCachedDataPlans();
  if (network) {
    plans = plans.filter((p) => p.network === network);
  }

  return NextResponse.json(
    {
      plans,
      mocked: !process.env.ASBDATA_TOKEN,
      cached: true,
    },
    {
      headers: {
        // Browser + CDN can reuse; still revalidate in background
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
