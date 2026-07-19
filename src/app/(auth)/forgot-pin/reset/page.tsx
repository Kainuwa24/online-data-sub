"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PinDots, NumPad } from "@/components/ui/PinPad";
import { Button } from "@/components/ui/Button";

function ResetPinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") || "";
  const resetToken = params.get("token") || "";

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"pin" | "confirm">("pin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function press(d: string) {
    if (step === "pin") {
      if (pin.length < 4) {
        const next = pin + d;
        setPin(next);
        if (next.length === 4) setStep("confirm");
      }
    } else if (confirm.length < 4) {
      const next = confirm + d;
      setConfirm(next);
      if (next.length === 4) submit(next);
    }
  }

  function backspace() {
    if (step === "confirm") {
      if (confirm.length === 0) {
        setStep("pin");
        setPin(pin.slice(0, -1));
      } else setConfirm(confirm.slice(0, -1));
    } else setPin(pin.slice(0, -1));
  }

  async function submit(fullConfirm: string) {
    if (pin !== fullConfirm) {
      setError("PINs do not match");
      setConfirm("");
      setStep("pin");
      setPin("");
      return;
    }
    if (!resetToken) {
      setError("Missing reset token. Verify OTP again.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin, resetToken }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not reset PIN");
      setPin("");
      setConfirm("");
      setStep("pin");
      return;
    }
    router.push("/login");
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-sm mx-auto">
      <div className="text-lg font-display font-bold mt-5">
        {step === "pin" ? "Create a new PIN" : "Confirm new PIN"}
      </div>
      <div className="text-sm text-gray-500 font-body mt-2 mb-6">
        {step === "pin"
          ? `Choose a new 4-digit PIN for ${phone}`
          : "Enter the same PIN again to confirm"}
      </div>
      <PinDots length={4} filled={step === "pin" ? pin.length : confirm.length} />
      <NumPad onPress={press} onBackspace={backspace} />
      {error && <div className="text-center text-red-600 text-xs font-body mt-4">{error}</div>}
      {loading && <div className="text-center text-xs font-body mt-4">Saving…</div>}
      <div className="mt-6">
        <Button variant="secondary" onClick={() => router.push("/login")}>
          Back to login
        </Button>
      </div>
    </div>
  );
}

export default function ResetPinPage() {
  return (
    <Suspense fallback={null}>
      <ResetPinForm />
    </Suspense>
  );
}
