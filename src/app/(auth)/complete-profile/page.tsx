"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { PinDots, NumPad } from "@/components/ui/PinPad";
import { AuthShell } from "@/components/auth/AuthShell";
import { isValidNgPhone, validateNgPhone } from "@/lib/phone";

/**
 * First-time setup for every signup path (Google, email/password).
 * Step 1: details (name, phone, BVN/NIN)
 * Step 2: create transaction PIN
 */
export default function CompleteProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "pin">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) {
          router.replace("/login");
          return;
        }
        if (d.profileComplete) {
          router.replace("/home");
          return;
        }
        setName(d.name || "");
        setPhone(d.phone || "");
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  function press(d: string) {
    if (pin.length >= 4 || loading) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) void submit(next);
  }

  function detailsValid() {
    const kycOk =
      bvn.replace(/\D/g, "").length === 11 || nin.replace(/\D/g, "").length === 11;
    return isValidNgPhone(phone) && kycOk && name.trim().length >= 2;
  }

  function goToPin() {
    setError("");
    const phoneCheck = validateNgPhone(phone);
    if (!phoneCheck.ok) {
      setError(phoneCheck.error);
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter your full name");
      return;
    }
    const kycOk =
      bvn.replace(/\D/g, "").length === 11 || nin.replace(/\D/g, "").length === 11;
    if (!kycOk) {
      setError("Enter a valid BVN or NIN (11 digits)");
      return;
    }
    setStep("pin");
  }

  async function submit(fullPin?: string) {
    const pinToSend = fullPin ?? pin;
    if (pinToSend.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || undefined,
        phone,
        pin: pinToSend,
        bvn: bvn || undefined,
        nin: nin || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not save profile");
      setPin("");
      return;
    }
    router.push("/home");
  }

  if (!ready) {
    return (
      <div className="auth-app">
        <div className="auth-app-inner flex items-center justify-center text-sm text-brand-muted font-body">
          Loading…
        </div>
      </div>
    );
  }

  if (step === "details") {
    return (
      <AuthShell
        eyebrow="Step 1 of 2"
        title="Your details"
        subtitle="Phone and identity first. You’ll create your PIN next."
      >
        <TextField label="Full name" placeholder="Your name" value={name} onChange={setName} />
        <PhoneField label="Phone number" value={phone} onChange={setPhone} />

        <div className="text-xs font-semibold text-brand-muted font-body mt-1 mb-2">
          Identity (required for wallet funding)
        </div>
        <TextField
          label="BVN (11 digits)"
          placeholder="Enter BVN"
          value={bvn}
          onChange={setBvn}
          type="tel"
        />
        <div className="text-center text-[11px] text-brand-muted font-body -mt-1 mb-2">or</div>
        <TextField
          label="NIN (11 digits)"
          placeholder="Enter NIN if you prefer"
          value={nin}
          onChange={setNin}
          type="tel"
        />

        {error && (
          <div className="text-center text-brand-red text-xs font-body mt-1 mb-3 font-medium">
            {error}
          </div>
        )}

        <Button onClick={goToPin} disabled={!detailsValid()}>
          Continue to PIN
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Step 2 of 2"
      title="Create your PIN"
      subtitle="4 digits — used to confirm purchases, not for login."
      footer={
        <button
          type="button"
          onClick={() => {
            setStep("details");
            setPin("");
            setError("");
          }}
          className="text-brand-blue font-semibold"
        >
          ← Back to details
        </button>
      }
    >
      <PinDots length={4} filled={pin.length} />
      <NumPad
        onPress={press}
        onBackspace={() => {
          if (!loading) {
            setPin(pin.slice(0, -1));
            setError("");
          }
        }}
      />

      {error && (
        <div className="text-center text-brand-red text-xs font-body mt-4 font-medium">{error}</div>
      )}
      {loading && (
        <div className="text-center text-xs text-brand-muted font-body mt-4">Saving…</div>
      )}
    </AuthShell>
  );
}
