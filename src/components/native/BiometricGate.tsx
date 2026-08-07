"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Fingerprint, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  authenticateBiometric,
  BIOMETRIC_UNLOCK_KEY,
  biometricUnavailableHint,
  clearBiometricSession,
  getBiometricAvailability,
  isBiometricSessionUnlocked,
  markBiometricSessionUnlocked,
  readBiometricSetting,
  writeBiometricSetting,
} from "@/lib/native-biometric";

type GateState = "checking" | "open" | "locked" | "unavailable";

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const promptOnLock = useRef(true);

  const unlock = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await authenticateBiometric({
      title: "Unlock Online Data Sub",
      subtitle: "Use fingerprint or face to continue",
    });
    setBusy(false);
    if (result.verified) {
      markBiometricSessionUnlocked();
      setState("open");
      return true;
    }
    if (!result.cancelled && result.message) {
      setError(result.message);
    }
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    async function boot() {
      const enabled = readBiometricSetting(BIOMETRIC_UNLOCK_KEY, false);
      if (!enabled) {
        if (!cancelled) setState("open");
        return;
      }

      if (isBiometricSessionUnlocked()) {
        if (!cancelled) setState("open");
        return;
      }

      const availability = await getBiometricAvailability();
      if (cancelled) return;

      if (!availability.available) {
        setHint(biometricUnavailableHint(availability.statusLabel));
        setState("unavailable");
        return;
      }

      setState("locked");
      if (promptOnLock.current) {
        promptOnLock.current = false;
        void unlock();
      }
    }

    void boot();

    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (!readBiometricSetting(BIOMETRIC_UNLOCK_KEY, false)) return;

          if (!isActive) {
            // Leaving the app — require biometrics again on return
            clearBiometricSession();
            return;
          }

          // Returning to the app
          if (isBiometricSessionUnlocked()) return;
          setState((current) => {
            if (current === "unavailable" || current === "checking") return current;
            return "locked";
          });
          promptOnLock.current = true;
          void (async () => {
            const availability = await getBiometricAvailability();
            if (!availability.available) {
              setHint(biometricUnavailableHint(availability.statusLabel));
              setState("unavailable");
              return;
            }
            if (promptOnLock.current) {
              promptOnLock.current = false;
              void unlock();
            }
          })();
        });
        removeListener = () => {
          void handle.remove();
        };
      } catch {
        // Browser
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [unlock]);

  if (state === "open") return <>{children}</>;

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-brand-muted">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 flex items-center justify-center bg-[#F7F7FB]">
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
        <p className="text-sm text-brand-muted font-body mt-2 mb-4 leading-relaxed">
          {state === "unavailable"
            ? hint ||
              "Turn off biometric unlock in Security & PIN, or set up fingerprint/face unlock on this phone."
            : "Verify with your fingerprint or face to continue."}
        </p>
        {error ? (
          <p className="text-xs text-brand-red font-body mb-4">{error}</p>
        ) : null}
        {state === "unavailable" ? (
          <Button
            onClick={() => {
              writeBiometricSetting(BIOMETRIC_UNLOCK_KEY, false);
              clearBiometricSession();
              setState("open");
            }}
          >
            Continue without biometrics
          </Button>
        ) : (
          <Button onClick={() => void unlock()} disabled={busy}>
            {busy ? "Verifying..." : "Unlock with fingerprint or face"}
          </Button>
        )}
      </div>
    </div>
  );
}
