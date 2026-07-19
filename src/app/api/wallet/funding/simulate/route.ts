import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { simulateFunding } from "@/lib/funding";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0 || amount > 500_000) {
    return NextResponse.json({ error: "Invalid amount (1–500000 naira)" }, { status: 400 });
  }

  const result = await simulateFunding(user.id, amount);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 });
  }
  return NextResponse.json(result);
}
