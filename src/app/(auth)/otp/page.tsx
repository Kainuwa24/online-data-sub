"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PinDots, NumPad } from "@/components/ui/PinPad";
import { AuthShell } from "@/components/auth/AuthShell";
import { formatPhoneDisplay } from "@/lib/phone";

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") || "";
  const purpose = params.get("purpose") || "signup";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function submit(fullCode: string) {
    setError("");
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: fullCode, purpose }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Invalid code");
      setCode("");
      return;
    }
    if (purpose === "signup") {
      router.push("/complete-profile");
      return;
    }
    const token = encodeURIComponent(data.resetToken || "");
    router.push(`/forgot-pin/reset?phone=${encodeURIComponent(phone)}&token=${token}`);
  }

  function press(d: string) {
    if (code.length >= 6) return;
    const next = code + d;
    setCode(next);
    if (next.length === 6) submit(next);
  }

  return (
    <AuthShell
      eyebrow="Verification"
      title="Enter the code"
      subtitle={
        <>
          Sent to{" "}
          <span className="font-semibold text-brand-ink">
            {formatPhoneDisplay(phone)}
          </span>
        </>
      }
    >
      <PinDots length={6} filled={code.length} />
      <NumPad onPress={press} onBackspace={() => setCode(code.slice(0, -1))} />
      {error && (
        <div className="text-center text-brand-red text-xs font-body mt-4 font-medium">{error}</div>
      )}
    </AuthShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpForm />
    </Suspense>
  );
}
