"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowDownRight, ArrowUpRight, Copy, Check, Building2, Shield, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  useAppCache,
  type FundingProviderId,
  type WalletSnapshot,
  type WalletTransaction,
} from "@/components/app/AppCacheProvider";
import { useLiveWallet } from "@/hooks/useLiveWallet";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

type Account = {
  provider?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountReference: string;
  kycIncomplete?: boolean;
};

const PROVIDER_META: Record<
  FundingProviderId,
  { label: string; short: string; createLabel: string }
> = {
  palmpay: {
    label: "PalmPay",
    short: "PalmPay",
    createLabel: "Create PalmPay account",
  },
  flutterwave: {
    label: "Flutterwave",
    short: "Flutterwave",
    createLabel: "Create Flutterwave account",
  },
};

function applySnapshotLocal(
  snapshot: WalletSnapshot,
  setters: {
    setBalanceKobo: (v: number) => void;
    setTransactions: (v: WalletTransaction[]) => void;
    setAccount: (v: Account | null) => void;
    setKycReady: (v: boolean) => void;
    setConfigured: (v: boolean) => void;
    setFundingProvider: (v: FundingProviderId) => void;
    setProviders: (v: WalletSnapshot["providers"]) => void;
  },
) {
  setters.setBalanceKobo(snapshot.balanceKobo);
  setters.setTransactions(snapshot.transactions || []);
  setters.setAccount(snapshot.account ? { ...snapshot.account } : null);
  setters.setKycReady(snapshot.kycReady);
  setters.setConfigured(snapshot.configured);
  if (snapshot.fundingProvider) setters.setFundingProvider(snapshot.fundingProvider);
  if (snapshot.providers) setters.setProviders(snapshot.providers);
}

export default function WalletPage() {
  const { wallet, setWallet, updateWallet } = useAppCache();
  const { success, error: toastError, info } = useToast();
  const [balanceKobo, setBalanceKobo] = useState(wallet?.balanceKobo ?? 0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(wallet?.transactions ?? []);
  const [account, setAccount] = useState<Account | null>(
    wallet?.account ? { ...wallet.account } : null,
  );
  const [kycReady, setKycReady] = useState(wallet?.kycReady ?? false);
  const [configured, setConfigured] = useState(wallet?.configured ?? false);
  const [fundingProvider, setFundingProvider] = useState<FundingProviderId>(
    wallet?.fundingProvider ?? "flutterwave",
  );
  const [providers, setProviders] = useState(wallet?.providers);
  /** True while account/balance section is resolving (not for create/simulate). */
  const [shellLoading, setShellLoading] = useState(!wallet);
  /** True for explicit user actions (create account, simulate). */
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simAmount, setSimAmount] = useState("2000");
  const isDev = process.env.NODE_ENV === "development";
  const initialLoadDone = useRef(false);
  const hasCachedWallet = Boolean(wallet);

  // Auto-update balance after bank transfers / webhooks (no full page reload)
  useLiveWallet({ intervalMs: 6_000, toastOnCredit: true });

  // Keep local UI in sync when live poll or other screens update the cache
  useEffect(() => {
    if (!wallet) return;
    setBalanceKobo(wallet.balanceKobo);
    setTransactions(wallet.transactions || []);
    if (wallet.account) setAccount({ ...wallet.account });
    setKycReady(wallet.kycReady);
    setConfigured(wallet.configured);
    if (wallet.fundingProvider) setFundingProvider(wallet.fundingProvider);
    if (wallet.providers) setProviders(wallet.providers);
  }, [wallet]);

  const localSetters = {
    setBalanceKobo,
    setTransactions,
    setAccount,
    setKycReady,
    setConfigured,
    setFundingProvider,
    setProviders,
  };

  const loadForProvider = useCallback(
    async (provider: FundingProviderId, opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setShellLoading(true);
      try {
        const [balanceRes, accountRes] = await Promise.all([
          fetch("/api/wallet/balance", { cache: "no-store" }),
          fetch(`/api/wallet/funding/account?provider=${provider}`, { cache: "no-store" }),
        ]);
        const balanceData = await balanceRes.json();
        const accountData = await accountRes.json();
        const nextProvider: FundingProviderId =
          accountData.provider === "flutterwave" ? "flutterwave" : "palmpay";

        const snapshot: WalletSnapshot = {
          balanceKobo: balanceData.balanceKobo ?? 0,
          transactions: balanceData.transactions || [],
          account: accountData.account
            ? {
                provider: accountData.account.provider || nextProvider,
                bankName: accountData.account.bankName,
                accountNumber: accountData.account.accountNumber,
                accountName: accountData.account.accountName,
                accountReference: accountData.account.accountReference,
                kycIncomplete: accountData.account.kycIncomplete,
              }
            : null,
          kycReady: Boolean(accountData.kycReady),
          configured: Boolean(accountData.configured),
          fundingProvider: nextProvider,
          providers: accountData.providers,
        };

        applySnapshotLocal(snapshot, localSetters);
        setWallet(snapshot);
        return snapshot;
      } catch {
        toastError("Could not refresh wallet");
        return null;
      } finally {
        if (!opts?.quiet) setShellLoading(false);
      }
    },
    // local setters are stable useState dispatchers; setWallet stabilized in provider
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setWallet, toastError],
  );

  // One-shot initial load — never re-enter setWallet from a wallet dependency loop
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    if (wallet) {
      applySnapshotLocal(wallet, localSetters);
      setShellLoading(false);
      // Still revalidate quietly so we don't show a stale cached balance after funding
      void loadForProvider(wallet.fundingProvider ?? "flutterwave", { quiet: true });
      return;
    }

    void loadForProvider("flutterwave");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectProvider(provider: FundingProviderId) {
    if (provider === fundingProvider && account) return;
    setFundingProvider(provider);
    setAccount(null);
    await loadForProvider(provider);
  }

  async function refreshAccount() {
    setRefreshing(true);
    try {
      await loadForProvider(fundingProvider, { quiet: true });
      info("Wallet account refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  async function createAccount(forceRecreate = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/funding/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRecreate, provider: fundingProvider }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Could not create funding account");
        return;
      }
      if (data.account) {
        const nextAccount: Account = {
          provider: data.account.provider || fundingProvider,
          bankName: data.account.bankName,
          accountNumber: data.account.accountNumber,
          accountName: data.account.accountName,
          accountReference: data.account.accountReference,
          kycIncomplete: data.account.kycIncomplete,
        };
        setAccount(nextAccount);
        setConfigured(true);
        setKycReady(true);
        updateWallet((current) =>
          current
            ? {
                ...current,
                account: nextAccount,
                configured: true,
                kycReady: true,
                fundingProvider,
              }
            : {
                balanceKobo,
                transactions,
                account: nextAccount,
                configured: true,
                kycReady: true,
                fundingProvider,
                providers,
              },
        );
      }
      success(data.instructions || "Funding account ready");
    } finally {
      setBusy(false);
    }
  }

  async function copyNumber() {
    if (!account?.accountNumber) return;
    await navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    info("Account number copied");
    setTimeout(() => setCopied(false), 1500);
  }

  async function simulate() {
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/funding/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(simAmount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Simulate failed");
        return;
      }
      success("Simulated funding successful");
      await loadForProvider(fundingProvider, { quiet: true });
    } finally {
      setBusy(false);
    }
  }

  const meta = PROVIDER_META[fundingProvider];
  const palmpayEnabled = providers?.palmpay?.enabled ?? true;
  const flutterwaveEnabled = providers?.flutterwave?.enabled ?? false;

  return (
    <div className="animate-fade-up pb-28 relative z-0">
      <TopBar subtitle="Manage" title="Wallet" initial="W" />
      <div className="px-5">
        <div className="rounded-2xl p-5 mt-1 text-white relative overflow-hidden shadow-glow bg-wallet-card">
          <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-white/70 font-body">
              Available balance
              {shellLoading && hasCachedWallet ? (
                <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" aria-hidden />
              ) : null}
            </div>
            {shellLoading && !hasCachedWallet ? (
              <div className="mt-2 h-9 w-40 rounded-lg bg-white/20 animate-pulse" />
            ) : (
              <div className="text-[31px] font-display font-extrabold mt-2 tracking-tight">
                {naira(balanceKobo)}
              </div>
            )}
          </div>
        </div>

        <div className="section-label mt-7 mb-3">Fund via bank transfer</div>
        <div className="flex items-center justify-between gap-2 -mt-1 mb-3">
          <div className="inline-flex rounded-full border border-gray-200 dark:border-gray-700 p-0.5 bg-white/70 dark:bg-gray-900/40">
            {(["flutterwave", "palmpay"] as FundingProviderId[]).map((id) => {
              const enabled = id === "palmpay" ? palmpayEnabled : flutterwaveEnabled;
              const active = fundingProvider === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void selectProvider(id)}
                  disabled={busy || shellLoading}
                  className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    active
                      ? "bg-brand-ink text-white"
                      : "text-gray-600 dark:text-gray-300"
                  } ${!enabled && !active ? "opacity-50" : ""}`}
                >
                  {PROVIDER_META[id].short}
                  {!enabled ? " · off" : ""}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void refreshAccount()}
            disabled={busy || refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {!kycReady && !shellLoading && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50 p-4 mb-3 flex gap-3">
            <Shield size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs font-body text-amber-900 leading-relaxed">
              Add your BVN or NIN under{" "}
              <Link href="/profile" className="underline font-semibold">
                Profile
              </Link>{" "}
              before creating a funding account.
            </div>
          </div>
        )}

        {account ? (
          <div className="card p-5 mb-3">
            <div className="flex items-center gap-2 text-brand-muted text-[11px] font-body mb-1">
              <Building2 size={14} />
              {account.bankName}
              <span className="ml-auto rounded-full bg-brand-blueSoft text-brand-blue px-2 py-0.5 text-[10px] font-bold">
                {meta.label}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="text-2xl font-mono font-bold tracking-wider text-brand-ink">
                {account.accountNumber}
              </div>
              <button
                type="button"
                onClick={() => void copyNumber()}
                className="flex items-center gap-1.5 rounded-lg bg-brand-blueSoft text-brand-blue px-3 py-2 text-xs font-bold font-body"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="text-[11px] text-brand-muted font-body mt-3">Account name</div>
            <div className="text-sm font-semibold font-body text-brand-ink">{account.accountName}</div>
            <p className="text-[11px] text-brand-muted font-body mt-3 leading-relaxed">
              Transfer any amount from your bank app. Your wallet updates after {meta.label} confirms.
            </p>
            {account.kycIncomplete && (
              <button
                type="button"
                onClick={() => void createAccount(true)}
                disabled={busy || !kycReady}
                className="mt-4 w-full btn-secondary !py-3"
              >
                {busy ? "Working…" : "Regenerate with KYC"}
              </button>
            )}
          </div>
        ) : shellLoading ? (
          <div className="card p-5 mb-3 animate-pulse">
            <div className="h-3 w-24 rounded bg-slate-200/80" />
            <div className="mt-3 h-8 w-48 rounded bg-slate-200/80" />
            <div className="mt-4 h-3 w-20 rounded bg-slate-200/70" />
            <div className="mt-2 h-4 w-36 rounded bg-slate-200/70" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void createAccount(false)}
            disabled={busy || !kycReady || !configured}
            className="btn-primary mb-3"
          >
            {busy
              ? "Creating account…"
              : !configured
                ? `${meta.label} not configured`
                : meta.createLabel}
          </button>
        )}

        {isDev && (
          <div className="rounded-xl border border-dashed border-brand-line p-4 mb-3 bg-white/60">
            <div className="text-[11px] text-brand-muted font-body mb-2 font-semibold">
              Dev: simulate funding (₦)
            </div>
            <div className="flex gap-2">
              <input
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                type="number"
                className="input-premium flex-1 !py-2.5"
              />
              <button
                type="button"
                onClick={() => void simulate()}
                disabled={busy}
                className="rounded-xl bg-brand-ink text-white px-4 text-xs font-bold font-body"
              >
                Credit
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 mb-3">
          <div className="section-label">Recent</div>
          <Link href="/history" className="text-[11px] font-semibold text-brand-blue font-body">
            Full history
          </Link>
        </div>
        <div className="card overflow-hidden mb-4">
          {shellLoading && transactions.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  index !== 2 ? "border-b border-brand-line/70" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-slate-200/80 animate-pulse shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="h-3.5 w-2/3 rounded bg-slate-200/80 animate-pulse" />
                    <div className="mt-2 h-3 w-1/3 rounded bg-slate-200/70 animate-pulse" />
                  </div>
                </div>
                <div className="h-3.5 w-16 rounded bg-slate-200/80 animate-pulse shrink-0 ml-2" />
              </div>
            ))
          ) : transactions.length === 0 ? (
            <div className="text-sm text-brand-muted font-body py-10 text-center">
              No transactions yet.
            </div>
          ) : (
            transactions.slice(0, 5).map((t, i) => (
              <Link
                key={t.id}
                href={`/history/${t.id}`}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i !== Math.min(transactions.length, 5) - 1 ? "border-b border-brand-line/70" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      t.type === "CREDIT" ? "bg-brand-blueSoft" : "bg-brand-redSoft"
                    }`}
                  >
                    {t.type === "CREDIT" ? (
                      <ArrowDownRight size={15} className="text-brand-blue" />
                    ) : (
                      <ArrowUpRight size={15} className="text-brand-red" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold font-body truncate">{t.label}</div>
                    <div className="text-[11px] text-brand-muted font-body">
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-[13px] font-mono font-semibold ${
                    t.type === "CREDIT" ? "text-brand-blue" : "text-brand-red"
                  }`}
                >
                  {t.type === "CREDIT" ? "+" : "−"}
                  {naira(t.amountKobo)}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
