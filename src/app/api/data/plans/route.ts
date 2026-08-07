import { NextRequest, NextResponse } from "next/server";
import { getPricedDataPlans } from "@/lib/plans-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const network = req.nextUrl.searchParams.get("network") || undefined;
  const priced = await getPricedDataPlans(network);

  // Margin internals stay server-side; customers see the retail price only.
  const plans = priced.map(({ marginKobo, ruleId, costKobo, ...plan }) => plan);

  return NextResponse.json(
    {
      plans,
      mocked: !process.env.ASBDATA_TOKEN,
      cached: true,
    },
    {
      headers: {
        // Pricing is operator-controlled and must not be held in a shared
        // cache — a margin change has to reach customers on the next request.
        "Cache-Control": "private, no-store",
      },
    },
  );
}
