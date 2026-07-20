"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { PinDots, NumPad } from "@/components/ui/PinPad";

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
