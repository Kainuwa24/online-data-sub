"use client";

import { useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

type GoogleNativeAuthPlugin = {
  signIn(options?: { forceAccountPicker?: boolean }): Promise<{
    idToken: string;
    email?: string;
    name?: string;
  }>;
};

const GoogleNativeAuth = registerPlugin<GoogleNativeAuthPlugin>("GoogleNativeAuth");

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setError("");

    if (!Capacitor.isNativePlatform()) {
      window.location.href = "/api/auth/google";
      return;
    }

    try {
      const { idToken } = await GoogleNativeAuth.signIn({ forceAccountPicker: true });
      const res = await fetch("/api/auth/google/native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };

      if (!res.ok) {
        throw new Error(data.error || "Could not sign in with Google");
      }

      window.location.assign(data.next || "/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="btn-secondary flex w-full items-center justify-center gap-3 !shadow-none disabled:cursor-not-allowed disabled:opacity-70"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        <span>{busy ? "Connecting..." : label}</span>
      </button>
      {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
    </div>
  );
}