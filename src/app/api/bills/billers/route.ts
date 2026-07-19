import { NextResponse } from "next/server";
import { listBillers } from "@/lib/services/asbdata";

export async function GET() {
  return NextResponse.json({ billers: listBillers() });
}
