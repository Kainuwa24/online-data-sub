import { NextRequest, NextResponse } from "next/server";
import { handleFlutterwaveWebhook } from "@/lib/funding";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("flutterwave-signature") ?? req.headers.get("verif-hash");

  if (process.env.DEBUG_FLUTTERWAVE === "1") {
    console.log(
      "[flutterwave-webhook] route.received",
      JSON.stringify({
        hasSignature: Boolean(signature),
        bodyLength: rawBody.length,
      }),
    );
  }

  const result = await handleFlutterwaveWebhook({ rawBody, signature });
  return NextResponse.json(result.body, { status: result.status });
}
