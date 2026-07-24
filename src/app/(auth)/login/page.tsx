"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  authenticateBiometric,
  BIOMETRIC_UNLOCK_KEY,
  getBiometricAvailability,
  readBiometricSetting,
} from "@/lib/native-biometric";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(oauthError);
  const [loading, setLoading] = useState(false);
  const [biometricLoginAvailable, setBiometricLoginAvailable] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadBiometric() {
      const availability = await getBiometricAvailability();
      if (cancelled) return;
      setBiometricLoginAvailable(
        availability.available && readBiometricSetting(BIOMETRIC_UNLOCK_KEY, false),
      );
    }
    void loadBiometric();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = email.includes("@") && password.length >= 1 && !loading;

  async function biometricUnlock() {
    if (!biometricLoginAvailable || biometricBusy) return;
    setBiometricBusy(true);
    setError("");
    const verified = await authenticateBiometric({
      title: "Unlock Online Data Sub",
      subtitle: "Use biometrics or your device lock to continue",
    });
    setBiometricBusy(false);
    if (!verified) return;
    router.push("/home");
    router.refresh();
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not sign in");
        return;
      }
      router.push(data.next || "/home");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Google or email — same account on web and in the app."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-brand-blue font-semibold">
            Create an account
          </Link>
        </>
      }
    >
      {biometricLoginAvailable && (
        <div className="mb-3">
          <Button type="button" variant="secondary" onClick={() => void biometricUnlock()} disabled={biometricBusy}>
            <span className="inline-flex items-center justify-center gap-2">
              <Fingerprint size={18} />
              {biometricBusy ? "Verifying..." : "Unlock with biometrics"}
            </span>
          </Button>
        </div>
      )}

      <GoogleButton label="Continue with Google" />

      <div className="divider-or">
        <span className="text-[11px] text-brand-muted font-body shrink-0">or email</span>
      </div>

      <form onSubmit={(e) => void submit(e)} className="space-y-0">
        <TextField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
        />

        <div className="mb-6">
          <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="input-premium pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-center text-brand-red text-xs font-body mb-4 font-medium">{error}</div>
        )}

        <div className="pt-1">
          <Button type="submit" disabled={!canSubmit}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
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
