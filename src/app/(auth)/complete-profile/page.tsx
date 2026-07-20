"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { PinDots, NumPad } from "@/components/ui/PinPad";
import { isValidNgPhone, validateNgPhone } from "@/lib/phone";

/**
 * First-time setup for every signup path (Google, magic link, phone).
 * Step 1: details (name, phone, BVN/NIN)
 * Step 2: create PIN  ← PIN is never collected before this
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
        // Already fully set up
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
      <div className="min-h-screen px-6 py-10 max-w-sm mx-auto text-sm text-gray-500 font-body">
        Loading…
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="min-h-screen px-5 py-10 max-w-md mx-auto pb-16 animate-fade-up">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-blueDark shadow-glow flex items-center justify-center">
            <span className="text-white text-xs font-display font-extrabold">OD</span>
          </div>
          <span className="font-display font-bold text-sm text-brand-ink">Online Data Sub</span>
        </div>
        <div className="text-[10px] font-body font-semibold uppercase tracking-[0.14em] text-brand-blue">
          Step 1 of 2
        </div>
        <div className="text-[28px] font-display font-extrabold mt-2 tracking-tight text-brand-ink">
          Your details
        </div>
        <div className="text-sm text-brand-muted font-body mt-2 mb-6 leading-relaxed">
          Phone and identity first. You’ll create your PIN next.
        </div>
        <div className="auth-panel">

        <TextField label="Full name" placeholder="Your name" value={name} onChange={setName} />

        <PhoneField label="Phone number" value={phone} onChange={setPhone} />

        <div className="text-xs font-semibold text-gray-500 font-body mt-2 mb-2">
          Identity (required for wallet funding)
        </div>
        <TextField
          label="BVN (11 digits)"
          placeholder="Enter BVN"
          value={bvn}
          onChange={setBvn}
          type="tel"
        />
        <div className="text-center text-[11px] text-gray-400 font-body -mt-1 mb-2">or</div>
        <TextField
          label="NIN (11 digits)"
          placeholder="Enter NIN if you prefer"
          value={nin}
          onChange={setNin}
          type="tel"
        />

        {error && (
          <div className="text-center text-brand-red text-xs font-body mt-3 font-medium">{error}</div>
        )}

        <div className="mt-2">
          <Button onClick={goToPin} disabled={!detailsValid()}>
            Continue to PIN
          </Button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-10 max-w-md mx-auto pb-16 animate-fade-up">
      <button
        type="button"
        onClick={() => {
          setStep("details");
          setPin("");
          setError("");
        }}
        className="text-xs text-brand-muted font-body mb-4"
      >
        ← Back
      </button>
      <div className="text-[10px] font-body font-semibold uppercase tracking-[0.14em] text-brand-blue">
        Step 2 of 2
      </div>
      <div className="text-[28px] font-display font-extrabold mt-2 tracking-tight">Create your PIN</div>
      <div className="text-sm text-brand-muted font-body mt-2 mb-6">
        4 digits — used to sign in with phone later.
      </div>
      <div className="auth-panel">

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
      </div>
    </div>
  );
}
