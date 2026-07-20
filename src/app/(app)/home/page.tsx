import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Transaction } from "@prisma/client";
import { TopBar } from "@/components/layout/TopBar";
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
} from "lucide-react";
import Link from "next/link";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
  const transactions = await prisma.transaction.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const firstName = (user!.name || "there").split(" ")[0];
  const initial = firstName.charAt(0);

  const quickActions = [
    { icon: Smartphone, label: "Buy data", href: "/data", tint: "bg-blue-50 text-brand-blue" },
    { icon: Zap, label: "Airtime", href: "/data?tab=airtime", tint: "bg-amber-50 text-amber-700" },
    { icon: Receipt, label: "Electricity", href: "/bills", tint: "bg-emerald-50 text-emerald-700" },
    { icon: Tv, label: "Cable TV", href: "/bills", tint: "bg-violet-50 text-violet-700" },
  ];

  return (
    <div className="animate-fade-up">
      <TopBar subtitle={greeting()} title={firstName} initial={initial} />

      {/* Balance card */}
      <div className="mx-5 mt-2 rounded-[28px] p-6 text-white relative overflow-hidden shadow-glow bg-wallet-card">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-black/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-white/70 font-body font-medium">
            <Sparkles size={12} />
            Wallet balance
          </div>
          <div className="text-[34px] leading-none font-display font-extrabold mt-3 tracking-tight">
            {naira(wallet?.balanceKobo ?? 0)}
          </div>
          <div className="flex gap-2.5 mt-6">
            <Link
              href="/wallet"
              className="flex-1 bg-white text-brand-blue rounded-2xl py-3 text-xs font-bold text-center font-body shadow-soft active:scale-[0.98] transition-transform"
            >
              + Fund wallet
            </Link>
            <Link
              href="/history"
              className="flex-1 bg-white/12 border border-white/25 rounded-2xl py-3 text-xs font-semibold text-center font-body backdrop-blur-sm active:scale-[0.98] transition-transform"
            >
              History
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 pt-7">
        <div className="section-label mb-3">Quick actions</div>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className={`h-14 w-14 rounded-2xl ${a.tint} border border-white/60 shadow-soft flex items-center justify-center transition-transform group-active:scale-95`}
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

      {/* Watch banner — same placement as onlinedatasub home */}
      <div className="px-5 pt-5">
        <Link
          href="/watch"
          className="flex items-center justify-between rounded-[18px] border border-brand-gold/25 px-4 py-3.5 active:scale-[0.99] transition-transform"
          style={{
            background:
              "linear-gradient(135deg, #F7F1E3 0%, #FFFFFF 55%, rgba(247, 241, 227, 0.65) 100%)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white border border-brand-gold/20 shadow-soft flex items-center justify-center shrink-0">
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
      </div>

      {/* Activity */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">Recent activity</div>
          <Link href="/history" className="text-[11px] font-semibold text-brand-blue font-body">
            See all
          </Link>
        </div>

        <div className="card overflow-hidden">
          {transactions.length === 0 && (
            <div className="text-sm text-brand-muted font-body py-10 text-center px-4">
              No transactions yet. Fund your wallet to get started.
            </div>
          )}
          {transactions.map((t: Transaction, i) => (
            <Link
              key={t.id}
              href={`/history/${t.id}`}
              className={`flex items-center justify-between px-4 py-3.5 ${
                i !== transactions.length - 1 ? "border-b border-brand-line/70" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
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
          ))}
        </div>
      </div>
    </div>
  );
}
