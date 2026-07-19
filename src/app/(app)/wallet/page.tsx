"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowDownRight, ArrowUpRight, Copy, Check } from "lucide-react";

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
  const [balanceKobo, setBalanceKobo] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [kycReady, setKycReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
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
    setStatus(null);
    const res = await fetch("/api/wallet/funding/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceRecreate }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error || "Could not create funding account");
      return;
    }
    setAccount(data.account);
    setStatus(data.instructions || "Funding account ready");
  }

  async function copyNumber() {
    if (!account?.accountNumber) return;
    await navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
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
      setStatus(data.error || "Simulate failed");
      return;
    }
    setStatus("Simulated funding successful");
    refresh();
  }

  return (
    <div>
      <TopBar subtitle="Manage" title="Wallet" />
      <div className="px-5">
        <div
          className="rounded-[20px] p-5 mt-2 text-white"
          style={{ background: "linear-gradient(145deg, #2C5AA0, #1E4478)" }}
        >
          <div className="text-xs text-white/75 font-body">Available balance</div>
          <div className="text-2xl font-display font-extrabold mt-1.5">{naira(balanceKobo)}</div>
        </div>

        <div className="text-xs font-semibold text-gray-500 font-body mt-6 mb-2">
          Fund via bank transfer (PalmPay)
        </div>

        {!kycReady && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3.5 mb-3 text-xs font-body text-amber-900 dark:text-amber-100">
            Add your BVN or NIN under{" "}
            <Link href="/profile" className="underline font-semibold">
              Profile
            </Link>{" "}
            before creating a funding account. Banks reject transfers without KYC.
          </div>
        )}

        {account ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-3">
            <div className="text-[11px] text-gray-500 font-body">Bank</div>
            <div className="text-sm font-body font-semibold">{account.bankName}</div>
            <div className="text-[11px] text-gray-500 font-body mt-2">Account number</div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-lg font-mono font-bold tracking-wide">{account.accountNumber}</div>
              <button
                type="button"
                onClick={copyNumber}
                className="flex items-center gap-1 text-xs text-brand-blue font-body font-semibold"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="text-[11px] text-gray-500 font-body mt-2">Account name</div>
            <div className="text-sm font-body">{account.accountName}</div>
            <p className="text-[11px] text-gray-400 font-body mt-3">
              Transfer any amount from your bank app. Your wallet updates after PalmPay confirms.
            </p>
            {account.kycIncomplete && (
              <button
                type="button"
                onClick={() => createAccount(true)}
                disabled={loading || !kycReady}
                className="mt-3 w-full rounded-xl border border-brand-blue text-brand-blue py-2 text-xs font-bold font-body"
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
            className="w-full rounded-2xl bg-brand-blue text-white py-3.5 text-sm font-bold font-body disabled:bg-gray-300 disabled:text-gray-500 mb-3"
          >
            {loading
              ? "Creating account…"
              : !configured
                ? "PalmPay not configured"
                : "Create funding account"}
          </button>
        )}

        {isDev && (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-3.5 mb-3">
            <div className="text-[11px] text-gray-500 font-body mb-2">Dev: simulate funding (₦)</div>
            <div className="flex gap-2">
              <input
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                type="number"
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm font-mono outline-none"
              />
              <button
                type="button"
                onClick={simulate}
                disabled={loading}
                className="rounded-xl bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-3 text-xs font-bold font-body"
              >
                Credit
              </button>
            </div>
          </div>
        )}

        {status && <div className="text-center text-xs font-body mb-3 text-gray-600 dark:text-gray-300">{status}</div>}

        <div className="text-xs font-semibold text-gray-500 font-body mt-4 mb-2">All transactions</div>
        <div className="pb-24">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    t.type === "CREDIT" ? "bg-blue-50 dark:bg-blue-950" : "bg-red-50 dark:bg-red-950"
                  }`}
                >
                  {t.type === "CREDIT" ? (
                    <ArrowDownRight size={15} className="text-brand-blue" />
                  ) : (
                    <ArrowUpRight size={15} className="text-brand-red" />
                  )}
                </div>
                <div>
                  <div className="text-[13.5px] font-medium font-body">{t.label}</div>
                  <div className="text-[11.5px] text-gray-400 font-body">
                    {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div
                className={`text-[13px] font-mono ${
                  t.type === "CREDIT" ? "text-brand-blue" : "text-brand-red"
                }`}
              >
                {t.type === "CREDIT" ? "+" : "-"}
                {naira(t.amountKobo)}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-xs text-gray-400 font-body py-6 text-center">No transactions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
