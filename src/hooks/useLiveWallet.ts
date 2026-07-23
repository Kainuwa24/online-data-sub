"use client";

import { useEffect, useRef } from "react";
import { useAppCache } from "@/components/app/AppCacheProvider";
import { useToast } from "@/components/ui/Toast";

type Options = {
  /** Poll interval while the tab is visible (default 8s). */
  intervalMs?: number;
  /** Show a toast when balance increases (funding / refund). */
  toastOnCredit?: boolean;
  /** Skip polling (e.g. while another full refresh is running). */
  enabled?: boolean;
};

/**
 * Keeps wallet balance + recent transactions fresh without a full page reload.
 * Pauses when the tab is hidden; refreshes immediately on focus/visibility.
 */
export function useLiveWallet(opts: Options = {}) {
  const { intervalMs = 8_000, toastOnCredit = false, enabled = true } = opts;
  const { updateWallet } = useAppCache();
  const { success } = useToast();
  const lastBalanceRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function pull() {
      if (cancelled || document.hidden || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await fetch("/api/wallet/balance", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const nextBalance = Number(data.balanceKobo ?? 0);
        const nextTxns = Array.isArray(data.transactions) ? data.transactions : undefined;

        const prev = lastBalanceRef.current;
        updateWallet((current) => ({
          balanceKobo: nextBalance,
          transactions: nextTxns ?? current?.transactions ?? [],
          account: current?.account ?? null,
          kycReady: current?.kycReady ?? false,
          configured: current?.configured ?? false,
          fundingProvider: current?.fundingProvider,
          providers: current?.providers,
        }));

        if (
          toastOnCredit &&
          prev != null &&
          Number.isFinite(prev) &&
          nextBalance > prev
        ) {
          const delta = nextBalance - prev;
          success(
            `Wallet credited ₦${(delta / 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}`,
          );
        }
        lastBalanceRef.current = nextBalance;
      } catch {
        // Silent — manual refresh still available
      } finally {
        inFlightRef.current = false;
      }
    }

    void pull();
    const timer = window.setInterval(() => void pull(), intervalMs);

    const onVisible = () => {
      if (!document.hidden) void pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, intervalMs, toastOnCredit, updateWallet, success]);
}
