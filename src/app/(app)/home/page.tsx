"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Zap,
  Receipt,
  Tv,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ArrowLeftRight,
  Plus,
  Clock3,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import {
  useAppCache,
  type WalletTransaction,
} from "@/components/app/AppCacheProvider";
import { useLiveWallet } from "@/hooks/useLiveWallet";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const QUICK_ACTIONS = [
  { icon: Smartphone, label: "Buy data", href: "/data", tint: "bg-blue-50 text-brand-blue" },
  { icon: Zap, label: "Airtime", href: "/data?tab=airtime", tint: "bg-amber-50 text-amber-700" },
  { icon: Receipt, label: "Electricity", href: "/bills", tint: "bg-emerald-50 text-emerald-700" },
  { icon: Tv, label: "Cable TV", href: "/bills", tint: "bg-violet-50 text-violet-700" },
] as const;

export default function HomePage() {
  const { profile, wallet, setProfile, setWallet, setHistory } = useAppCache();
  // Only the live server bits skeleton — shell UI always stays up.
  const [refreshing, setRefreshing] = useState(!(profile && wallet));
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // Keep home balance/transactions fresh after bank funding webhooks
  useLiveWallet({ intervalMs: 8_000, toastOnCredit: true });

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    let cancelled = false;

    async function load() {
      // Quiet revalidate when we already have a cached shell
      const hasShell = Boolean(profile && wallet);
      if (!hasShell) setRefreshing(true);
      setError(null);

      try {
        const [profileRes, balanceRes, accountRes] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/wallet/balance", { cache: "no-store" }),
          fetch("/api/wallet/funding/account", { cache: "no-store" }),
        ]);

        const [profileData, balanceData, accountData] = await Promise.all([
          profileRes.json(),
          balanceRes.json(),
          accountRes.json(),
        ]);

        if (cancelled) return;
        if (!profileRes.ok) throw new Error(profileData.error || "Failed to load profile");
        if (!balanceRes.ok) throw new Error(balanceData.error || "Failed to load wallet");
        if (!accountRes.ok && accountData.error !== "Not authenticated") {
          throw new Error(accountData.error || "Failed to load funding account");
        }

        setProfile({
          name: profileData.name || "",
          phone: profileData.phone || "",
          email: profileData.email || null,
          bvnMasked: profileData.bvnMasked || null,
          ninMasked: profileData.ninMasked || null,
        });

        const nextTransactions: WalletTransaction[] = balanceData.transactions || [];
        setWallet({
          balanceKobo: balanceData.balanceKobo ?? 0,
          transactions: nextTransactions,
          account: accountData.account
            ? {
                bankName: accountData.account.bankName,
                accountNumber: accountData.account.accountNumber,
                accountName: accountData.account.accountName,
                accountReference: accountData.account.accountReference,
                kycIncomplete: accountData.account.kycIncomplete,
              }
            : null,
          kycReady: Boolean(accountData.kycReady),
          configured: Boolean(accountData.configured),
        });
        setHistory("ALL", nextTransactions);
      } catch (e) {
        if (!cancelled) {
          // Keep showing cached shell; surface a soft error only when empty
          if (!hasShell) {
            setError(e instanceof Error ? e.message : "Failed to load dashboard");
          }
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount — cache + live wallet handle later updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = (profile?.name || "there").split(" ")[0];
  const initial = firstName.charAt(0);
  const hasBalance = typeof wallet?.balanceKobo === "number";
  const balanceKobo = wallet?.balanceKobo ?? 0;
  const transactions = wallet?.transactions?.slice(0, 5) ?? [];
  const showBalanceSkeleton = refreshing && !hasBalance;
  const showActivitySkeleton = refreshing && !wallet;

  return (
    <div className="animate-fade-up">
      <TopBar subtitle={greeting()} title={firstName} initial={initial} />

      {error ? (
        <div className="mx-5 mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 font-body">
          {error}
        </div>
      ) : null}

      {/* Wallet hero — always mounted; only the amount may shimmer */}
      <div className="mx-5 mt-2 rounded-2xl p-5 text-white relative overflow-hidden shadow-glow bg-wallet-card">
        <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-white/70 font-body font-medium">
            <Sparkles size={12} />
            Wallet balance
            {refreshing && hasBalance ? (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" aria-hidden />
            ) : null}
          </div>
          {showBalanceSkeleton ? (
            <div className="mt-3 h-9 w-40 rounded-lg bg-white/20 animate-pulse" />
          ) : (
            <div className="text-[32px] leading-none font-display font-extrabold mt-3 tracking-tight">
              {naira(balanceKobo)}
            </div>
          )}
          <div className="flex gap-2.5 mt-5">
            <Link
              href="/wallet"
              className="flex flex-1 items-center justify-center gap-1.5 bg-white text-brand-blue rounded-xl py-3 text-xs font-bold text-center font-body shadow-soft active:scale-[0.98] transition-transform"
            >
              <Plus size={14} strokeWidth={2.25} />
              Fund wallet
            </Link>
            <Link
              href="/history"
              className="flex flex-1 items-center justify-center gap-1.5 bg-white/12 border border-white/25 rounded-xl py-3 text-xs font-semibold text-center font-body backdrop-blur-sm active:scale-[0.98] transition-transform"
            >
              <Clock3 size={14} strokeWidth={2} />
              History
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions — always tappable, never gated on server */}
      <div className="px-5 pt-7">
        <div className="section-label mb-3">Quick actions</div>
        <div className="grid grid-cols-4 gap-2.5">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className={`h-12 w-12 rounded-xl ${a.tint} border border-white/70 shadow-soft flex items-center justify-center transition-transform group-active:scale-95`}
                >
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <span className="text-[11px] text-brand-muted font-body text-center font-medium leading-tight">
                  {a.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Watch banners — gold/stocks + FX */}
      <div className="px-5 pt-5 space-y-2.5">
        <Link
          href="/watch"
          className="gold-watch-card flex items-center justify-between rounded-2xl px-4 py-3.5 active:scale-[0.99] transition-transform shadow-soft"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="gold-watch-icon h-10 w-10 rounded-xl shadow-soft flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-brand-gold" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-brand-gold font-body">
                Watch · preview
              </div>
              <div className="text-sm font-display font-bold text-brand-ink mt-0.5 truncate">
                Gold & markets — watch only
              </div>
            </div>
          </div>
          <ChevronRight size={18} className="text-brand-gold shrink-0" />
        </Link>

        <Link
          href="/exchange"
          className="gold-watch-card flex items-center justify-between rounded-2xl px-4 py-3.5 active:scale-[0.99] transition-transform shadow-soft"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="gold-watch-icon h-10 w-10 rounded-xl shadow-soft flex items-center justify-center shrink-0">
              <ArrowLeftRight size={18} className="text-brand-gold" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-brand-gold font-body">
                FX · to naira
              </div>
              <div className="text-sm font-display font-bold text-brand-ink mt-0.5 truncate">
                USD, GBP, EUR & more → ₦
              </div>
            </div>
          </div>
          <ChevronRight size={18} className="text-brand-gold shrink-0" />
        </Link>
      </div>

      {/* Recent activity — only this section waits on the server */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">Recent activity</div>
          <Link href="/history" className="text-[11px] font-semibold text-brand-blue font-body">
            See all
          </Link>
        </div>

        <div className="card overflow-hidden">
          {showActivitySkeleton ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  index !== 3 ? "border-b border-brand-line/70" : ""
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
            <div className="text-sm text-brand-muted font-body py-10 text-center px-4">
              No transactions yet. Fund your wallet to get started.
            </div>
          ) : (
            transactions.map((t, i) => (
              <Link
                key={t.id}
                href={`/history/${t.id}`}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i !== transactions.length - 1 ? "border-b border-brand-line/70" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      t.type === "CREDIT" ? "bg-brand-blueSoft" : "bg-brand-redSoft"
                    }`}
                  >
                    {t.type === "CREDIT" ? (
                      <ArrowDownRight size={16} className="text-brand-blue" />
                    ) : (
                      <ArrowUpRight size={16} className="text-brand-red" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold font-body text-brand-ink truncate">
                      {t.label}
                    </div>
                    <div className="text-[11px] text-brand-muted font-body mt-0.5">
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-[13px] font-mono font-semibold shrink-0 ml-2 ${
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
