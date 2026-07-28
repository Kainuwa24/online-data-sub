"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { useAppCache } from "@/components/app/AppCacheProvider";
import { useToast } from "@/components/ui/Toast";
import {
  clearBiometricSession,
  writeBiometricSetting,
  BIOMETRIC_UNLOCK_KEY,
  BIOMETRIC_TRANSACTION_KEY,
} from "@/lib/native-biometric";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { profile, reset } = useAppCache();
  const { error: toastError, success } = useToast();
  const [confirm, setConfirm] = useState("");
  const [pin, setPin] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm,
          pin: pin || undefined,
          emailConfirm: emailConfirm || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not delete account");
      }

      try {
        writeBiometricSetting(BIOMETRIC_UNLOCK_KEY, false);
        writeBiometricSetting(BIOMETRIC_TRANSACTION_KEY, false);
        clearBiometricSession();
      } catch {
        // ignore
      }
      reset();
      success("Account deleted");
      router.replace("/login");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete account";
      setError(msg);
      toastError(msg);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    confirm.trim().toUpperCase() === "DELETE" &&
    (pin.length === 4 || emailConfirm.trim().length > 3) &&
    !busy;

  return (
    <div className="animate-fade-up pb-28">
      <ScreenHeader title="Delete account" backHref="/profile" />

      <div className="px-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3 mb-5">
          <AlertTriangle size={20} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs font-body text-amber-950 leading-relaxed">
            <p className="font-semibold mb-1">This cannot be undone</p>
            <p>
              Deleting your Online Data Sub account permanently removes your profile,
              wallet, transaction history, virtual accounts, and notifications from our
              systems. Any remaining wallet balance will no longer be accessible.
            </p>
          </div>
        </div>

        <div className="card p-4 mb-5 text-[13px] font-body text-brand-muted leading-relaxed space-y-2">
          <p>
            <span className="font-semibold text-brand-ink">What is deleted:</span> name,
            phone, email, PIN, KYC fields, wallet, transactions, funding accounts,
            notifications, and referral links tied to this account.
          </p>
          <p>
            <span className="font-semibold text-brand-ink">What may remain:</span>{" "}
            anonymized payment-provider records required for fraud prevention, accounting,
            or law (not used to identify you in the app).
          </p>
          {profile?.email ? (
            <p>
              Signed in as{" "}
              <span className="font-semibold text-brand-ink">{profile.email}</span>
            </p>
          ) : null}
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
          Type DELETE to confirm
        </label>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input-premium mb-4"
          placeholder="DELETE"
          autoCapitalize="characters"
          autoComplete="off"
        />

        <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
          4-digit PIN (if you have one)
        </label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="input-premium mb-4"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          autoComplete="off"
        />

        <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
          Or confirm account email (if you have no PIN)
        </label>
        <input
          value={emailConfirm}
          onChange={(e) => setEmailConfirm(e.target.value)}
          className="input-premium mb-5"
          type="email"
          placeholder={profile?.email || "you@example.com"}
          autoComplete="off"
        />

        {error ? (
          <div className="text-brand-red text-xs font-body font-medium mb-4">{error}</div>
        ) : null}

        <Button
          onClick={() => void deleteAccount()}
          disabled={!canSubmit}
          className="!bg-brand-red !shadow-none"
        >
          {busy ? "Deleting…" : "Permanently delete account"}
        </Button>

        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="w-full mt-3 text-center text-sm font-semibold text-brand-muted font-body py-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
