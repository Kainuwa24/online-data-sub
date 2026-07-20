import { NextRequest, NextResponse } from "next/server";
import { createAndSendMagicLink } from "@/lib/magic-link";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "");

  try {
    const result = await createAndSendMagicLink(email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Always return generic success (don't leak whether email exists)
    return NextResponse.json({
      ok: true,
      email: result.email,
      message: result.simulated
        ? "Magic link logged to the server console (email provider not configured)."
        : "Check your email for a sign-in link.",
      // Dev-only convenience when Resend is not set
      ...(result.devLink ? { devLink: result.devLink } : {}),
    });
  } catch (e) {
    console.error("[magic] request failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not send magic link" },
      { status: 500 },
    );
  }
}
