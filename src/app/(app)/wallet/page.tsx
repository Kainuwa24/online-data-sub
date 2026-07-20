"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowDownRight, ArrowUpRight, Copy, Check, Building2, Shield } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

type Account = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountReference: string;
  kycIncomplete?: boolean;
};

export default function WalletPage() {
  const { success, error: toastError, info } = useToast();
  const [balanceKobo, setBalanceKobo] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [kycReady, setKycReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simAmount, setSimAmount] = useState("2000");
  const isDev = process.env.NODE_ENV === "development";

  const refresh = useCallback(() => {
    fetch("/api/wallet/balance")
      .then((r) => r.json())
      .then((d) => {
        setBalanceKobo(d.balanceKobo);
        setTransactions(d.transactions || []);
      });
    fetch("/api/wallet/funding/account")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(Boolean(d.configured));
        setAccount(d.account);
        setKycReady(Boolean(d.kycReady));
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createAccount(forceRecreate = false) {
    setLoading(true);
    const res = await fetch("/api/wallet/funding/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceRecreate }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toastError(data.error || "Could not create funding account");
      return;
    }
    setAccount(data.account);
    success(data.instructions || "Funding account ready");
  }

  async function copyNumber() {
    if (!account?.accountNumber) return;
    await navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    info("Account number copied");
    setTimeout(() => setCopied(false), 1500);
  }

  async function simulate() {
    setLoading(true);
    const res = await fetch("/api/wallet/funding/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(simAmount) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toastError(data.error || "Simulate failed");
      return;
    }
    success("Simulated funding successful");
    refresh();
  }

  return (
    <div className="animate-fade-up pb-6">
      <TopBar subtitle="Manage" title="Wallet" initial="W" />
      <div className="px-5">
        <div className="rounded-[28px] p-6 mt-1 text-white relative overflow-hidden shadow-glow bg-wallet-card">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.12em] text-white/70 font-body">
              Available balance
            </div>
            <div className="text-[32px] font-display font-extrabold mt-2 tracking-tight">
              {naira(balanceKobo)}
            </div>
          </div>
        </div>

        <div className="section-label mt-7 mb-3">Fund via bank transfer</div>

        {!kycReady && (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50 p-4 mb-3 flex gap-3">
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
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="text-2xl font-mono font-bold tracking-wider text-brand-ink">
                {account.accountNumber}
              </div>
              <button
                type="button"
                onClick={copyNumber}
                className="flex items-center gap-1.5 rounded-xl bg-brand-blueSoft text-brand-blue px-3 py-2 text-xs font-bold font-body"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="text-[11px] text-brand-muted font-body mt-3">Account name</div>
            <div className="text-sm font-semibold font-body text-brand-ink">{account.accountName}</div>
            <p className="text-[11px] text-brand-muted font-body mt-3 leading-relaxed">
              Transfer any amount from your bank app. Your wallet updates after PalmPay confirms.
            </p>
            {account.kycIncomplete && (
              <button
                type="button"
                onClick={() => createAccount(true)}
                disabled={loading || !kycReady}
                className="mt-4 w-full btn-secondary !py-3"
              >
                Regenerate with KYC
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => createAccount(false)}
            disabled={loading || !kycReady || !configured}
            className="btn-primary mb-3"
          >
            {loading
              ? "Creating account…"
              : !configured
                ? "PalmPay not configured"
                : "Create funding account"}
          </button>
        )}

        {isDev && (
          <div className="rounded-2xl border border-dashed border-brand-line p-4 mb-3 bg-white/60">
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
                onClick={simulate}
                disabled={loading}
                className="rounded-2xl bg-brand-ink text-white px-4 text-xs font-bold font-body"
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
          {transactions.length === 0 && (
            <div className="text-sm text-brand-muted font-body py-10 text-center">
              No transactions yet.
            </div>
          )}
          {transactions.slice(0, 5).map((t, i) => (
            <Link
              key={t.id}
              href={`/history/${t.id}`}
              className={`flex items-center justify-between px-4 py-3.5 ${
                i !== Math.min(transactions.length, 5) - 1 ? "border-b border-brand-line/70" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
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
          ))}
        </div>
      </div>
    </div>
  );
}
