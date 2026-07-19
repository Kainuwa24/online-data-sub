"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { PinDots, NumPad } from "@/components/ui/PinPad";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function submitPin(fullPin: string) {
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin: fullPin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.needsOtp) {
        router.push(`/otp?phone=${encodeURIComponent(data.phone || phone)}&purpose=signup`);
        return;
      }
      setError(data.error || "Something went wrong");
      setPin("");
      return;
    }
    router.push("/home");
  }

  function press(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submitPin(next);
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-sm mx-auto">
      <div className="text-2xl font-display font-extrabold mt-5">
        {step === "phone" ? "Welcome back" : "Enter your PIN"}
      </div>
      <div className="text-sm text-gray-500 font-body mt-1">
        {step === "phone"
          ? "Log in to keep buying data, airtime and paying bills."
          : `Confirm the PIN for ${phone}`}
      </div>

      {step === "phone" ? (
        <div className="mt-7">
          <TextField label="Phone number" placeholder="080X XXX XXXX" value={phone} onChange={setPhone} />
          <Button onClick={() => setStep("pin")} disabled={phone.length < 10}>
            Continue
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex-1 flex flex-col">
          <PinDots length={4} filled={pin.length} />
          <NumPad onPress={press} onBackspace={() => setPin(pin.slice(0, -1))} />
          {error && <div className="text-center text-red-600 text-xs font-body mt-4">{error}</div>}
          <div className="text-center mt-4">
            <a href="/forgot-pin" className="text-brand-blue text-xs font-semibold font-body">
              Forgot PIN?
            </a>
          </div>
        </div>
      )}

      <div className="flex-1" />
      <div className="text-center text-xs text-gray-500 font-body">
        New here?{" "}
        <a href="/signup" className="text-brand-blue font-semibold">
          Create an account
        </a>
      </div>
    </div>
  );
}
