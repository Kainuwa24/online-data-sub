"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/ui/PhoneField";
import { PinDots, NumPad } from "@/components/ui/PinPad";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { formatPhoneDisplay, isValidNgPhone } from "@/lib/phone";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error") || "";

  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(oauthError);

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

  if (step === "pin") {
    return (
      <AuthShell
        eyebrow="Secure login"
        title="Enter your PIN"
        subtitle={`Confirm the 4-digit PIN for ${formatPhoneDisplay(phone)}`}
      >
        <PinDots length={4} filled={pin.length} />
        <NumPad
          onPress={press}
          onBackspace={() => {
            setPin(pin.slice(0, -1));
            setError("");
          }}
        />
        {error && (
          <div className="text-center text-brand-red text-xs font-body mt-4 font-medium">{error}</div>
        )}
        <div className="text-center mt-5 space-y-2">
          <a href="/forgot-pin" className="block text-brand-blue text-xs font-semibold font-body">
            Forgot PIN?
          </a>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setPin("");
              setError("");
            }}
            className="text-brand-muted text-xs font-body"
          >
            ← Use a different number
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Google, email magic link, or phone + PIN."
      footer={
        <>
          New here?{" "}
          <a href="/signup" className="text-brand-blue font-semibold">
            Create an account
          </a>
        </>
      }
    >
      <GoogleButton label="Continue with Google" />

      <div className="divider-or">
        <span className="text-[11px] text-brand-muted font-body shrink-0">or magic link</span>
      </div>
      <MagicLinkForm />

      <div className="divider-or">
        <span className="text-[11px] text-brand-muted font-body shrink-0">or phone</span>
      </div>

      <PhoneField label="Phone number" value={phone} onChange={setPhone} />
      <Button
        onClick={() => {
          if (!isValidNgPhone(phone)) {
            setError("Enter a valid Nigerian mobile number");
            return;
          }
          setError("");
          setStep("pin");
        }}
        disabled={!isValidNgPhone(phone)}
      >
        Continue with PIN
      </Button>
      {error && (
        <div className="text-center text-brand-red text-xs font-body mt-3 font-medium">{error}</div>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
