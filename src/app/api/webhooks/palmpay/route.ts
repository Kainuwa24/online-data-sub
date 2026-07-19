import { NextRequest, NextResponse } from "next/server";
import { handlePalmPayWebhook } from "@/lib/funding";

// PalmPay requires plain-text body "success" on success.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const result = await handlePalmPayWebhook(rawBody);
  return new NextResponse(result.body, {
    status: result.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
