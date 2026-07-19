import { NextResponse } from "next/server";
import { isAsbdataConfigured } from "@/lib/services/asbdata";
import { isPalmPayEnabled } from "@/lib/services/palmpay";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "online-data-sub",
    time: new Date().toISOString(),
    providers: {
      asbdata: isAsbdataConfigured(),
      palmpay: isPalmPayEnabled(),
      termii: Boolean(process.env.TERMII_API_KEY),
      goldapi: Boolean(process.env.GOLDAPI_KEY),
    },
  });
}
