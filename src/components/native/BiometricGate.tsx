"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  authenticateBiometric,
  BIOMETRIC_UNLOCK_KEY,
  getBiometricAvailability,
  readBiometricSetting,
  writeBiometricSetting,
} from "@/lib/native-biometric";

type GateState = "checking" | "open" | "locked" | "unavailable";

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [busy, setBusy] = useState(false);

  async function unlock() {
    setBusy(true);
    const verified = await authenticateBiometric({
      title: "Unlock Online Data Sub",
      subtitle: "Use biometrics or your device lock to continue",
    });
    setBusy(false);
    if (verified) setState("open");
  }

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const enabled = readBiometricSetting(BIOMETRIC_UNLOCK_KEY, false);
      if (!enabled) {
        setState("open");
        return;
      }
      const availability = await getBiometricAvailability();
      if (cancelled) return;
      if (!availability.available) {
        setState("unavailable");
        return;
      }
      setState("locked");
      void unlock();
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "open") return <>{children}</>;

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-brand-muted">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 flex items-center justify-center bg-brand-bg">
      <div className="w-full max-w-sm text-center auth-panel">
        <div className="mx-auto h-14 w-14 rounded-full bg-brand-blueSoft flex items-center justify-center mb-4">
          {state === "unavailable" ? (
            <LockKeyhole size={28} className="text-brand-blue" />
          ) : (
            <Fingerprint size={30} className="text-brand-blue" />
          )}
        </div>
        <h1 className="text-xl font-display font-extrabold text-brand-ink">
          {state === "unavailable" ? "Device lock unavailable" : "Unlock app"}
        </h1>
        <p className="text-sm text-brand-muted font-body mt-2 mb-6 leading-relaxed">
          {state === "unavailable"
            ? "Turn off biometric unlock in Security & PIN after signing in, or set up biometrics/device lock on this phone."
            : "Verify with your fingerprint, face, or device lock to continue."}
        </p>
        {state === "unavailable" ? (
          <Button
            onClick={() => {
              writeBiometricSetting(BIOMETRIC_UNLOCK_KEY, false);
              setState("open");
            }}
          >
            Continue
          </Button>
        ) : (
          <Button onClick={() => void unlock()} disabled={busy}>
            {busy ? "Verifying..." : "Unlock"}
          </Button>
        )}
      </div>
    </div>
  );
}
