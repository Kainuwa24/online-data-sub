"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PinDots, NumPad } from "@/components/ui/PinPad";
import {
  authenticateBiometric,
  BIOMETRIC_TRANSACTION_KEY,
  BIOMETRIC_UNLOCK_KEY,
  getBiometricAvailability,
  readBiometricSetting,
  writeBiometricSetting,
} from "@/lib/native-biometric";

type Step = "current" | "new" | "confirm";

export default function SecurityPinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricUnlock, setBiometricUnlock] = useState(false);
  const [biometricTransaction, setBiometricTransaction] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadBiometricSettings() {
      const availability = await getBiometricAvailability();
      if (cancelled) return;
      setBiometricAvailable(availability.available);
      setBiometricUnlock(readBiometricSetting(BIOMETRIC_UNLOCK_KEY, false));
      setBiometricTransaction(readBiometricSetting(BIOMETRIC_TRANSACTION_KEY, false));
    }
    void loadBiometricSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const activePin =
    step === "current" ? currentPin : step === "new" ? newPin : confirmPin;
  const setActivePin =
    step === "current"
      ? setCurrentPin
      : step === "new"
        ? setNewPin
        : setConfirmPin;

  const title =
    step === "current"
      ? "Current PIN"
      : step === "new"
        ? "New PIN"
        : "Confirm new PIN";

  async function submitChange(confirmed: string) {
    setBusy(true);
    setError(null);
    try {
      if (confirmed !== newPin) throw new Error("PINs do not match");
      const res = await fetch("/api/auth/pin/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not change PIN");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change PIN");
      setStep("current");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } finally {
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy || done) return;
    if (activePin.length >= 4) return;
    const next = activePin + d;
    setActivePin(next);
    setError(null);
    if (next.length < 4) return;
    if (step === "current") {
      setTimeout(() => setStep("new"), 120);
      return;
    }
    if (step === "new") {
      setTimeout(() => setStep("confirm"), 120);
      return;
    }
    void submitChange(next);
  }

  async function toggleBiometric(key: string, enabled: boolean, setter: (value: boolean) => void) {
    if (!biometricAvailable || biometricBusy) return;
    setBiometricBusy(true);
    const verified = await authenticateBiometric({
      title: enabled ? "Enable biometrics" : "Turn off biometrics",
      subtitle: "Verify with biometrics to update this setting",
    });
    setBiometricBusy(false);
    if (!verified) return;
    writeBiometricSetting(key, enabled);
    setter(enabled);
  }

  function handleHeaderBack() {
    if (done) {
      router.push("/profile");
      return;
    }
    if (step === "confirm") {
      setConfirmPin("");
      setStep("new");
      return;
    }
    if (step === "new") {
      setNewPin("");
      setStep("current");
      return;
    }
    router.push("/profile");
  }

  return (
    <div className="animate-fade-up pb-28">
      <ScreenHeader title="Security & PIN" onBack={handleHeaderBack} />
      <div className="px-5">
        <div className="card p-5 mb-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-brand-blueSoft flex items-center justify-center shrink-0">
              <Fingerprint size={20} className="text-brand-blue" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-display font-bold text-brand-ink">Biometric security</div>
              <p className="text-xs text-brand-muted font-body mt-1 leading-relaxed">
                Use fingerprint or face unlock where your phone supports it.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className={`flex items-center justify-between gap-3 ${!biometricAvailable ? "opacity-60" : ""}`}>
              <span>
                <span className="block text-sm font-semibold text-brand-ink font-body">Unlock app</span>
                <span className="block text-xs text-brand-muted font-body mt-0.5">Ask for biometrics when opening the logged-in app.</span>
              </span>
              <input
                type="checkbox"
                checked={biometricUnlock}
                disabled={!biometricAvailable || biometricBusy}
                onChange={(e) => void toggleBiometric(BIOMETRIC_UNLOCK_KEY, e.target.checked, setBiometricUnlock)}
                className="h-5 w-5 accent-brand-blue"
              />
            </label>

            <label className={`flex items-center justify-between gap-3 ${!biometricAvailable ? "opacity-60" : ""}`}>
              <span>
                <span className="block text-sm font-semibold text-brand-ink font-body">Verify transactions</span>
                <span className="block text-xs text-brand-muted font-body mt-0.5">Require biometrics before a purchase is submitted.</span>
              </span>
              <input
                type="checkbox"
                checked={biometricTransaction}
                disabled={!biometricAvailable || biometricBusy}
                onChange={(e) => void toggleBiometric(BIOMETRIC_TRANSACTION_KEY, e.target.checked, setBiometricTransaction)}
                className="h-5 w-5 accent-brand-blue"
              />
            </label>
          </div>

          {!biometricAvailable && (
            <div className="mt-4 text-xs text-brand-muted font-body">
              Biometric security is available only inside the Android app on a device with fingerprint or face unlock set up.
            </div>
          )}
        </div>

        <p className="text-sm text-brand-muted font-body mb-6 leading-relaxed">
          {done
            ? "Your PIN was updated. Use it next time you log in."
            : "Change the 4-digit PIN used to log in."}
        </p>

        {done ? (
          <Button onClick={() => router.push("/profile")}>Done</Button>
        ) : (
          <div className="auth-panel">
            <div className="text-center text-[15px] font-display font-bold text-brand-ink mb-1">
              {title}
            </div>
            <PinDots length={4} filled={activePin.length} />
            <NumPad
              onPress={press}
              onBackspace={() => {
                if (!busy) setActivePin(activePin.slice(0, -1));
              }}
            />
            {error && (
              <div className="text-center text-brand-red text-xs font-body font-medium mt-4">
                {error}
              </div>
            )}
            {busy && (
              <div className="text-center text-xs text-brand-muted font-body mt-4">
                Updating…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
