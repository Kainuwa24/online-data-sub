"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PinDots, NumPad } from "@/components/ui/PinPad";

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
      router.push("/home");
      return;
    }
    // reset_pin
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
    <div className="min-h-screen px-6 py-10 max-w-sm mx-auto">
      <div className="text-lg font-display font-bold mt-5">Verify phone</div>
      <div className="text-sm text-gray-500 font-body mt-2 mb-6">
        Enter the 6-digit code sent to{" "}
        <span className="text-gray-900 dark:text-white font-semibold">{phone}</span>
      </div>
      <PinDots length={6} filled={code.length} />
      <NumPad onPress={press} onBackspace={() => setCode(code.slice(0, -1))} />
      {error && <div className="text-center text-red-600 text-xs font-body mt-4">{error}</div>}
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpForm />
    </Suspense>
  );
}
