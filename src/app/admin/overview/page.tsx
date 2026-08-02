import { Activity, ArrowDownRight, ArrowUpRight, Bell, Landmark, Users, Wallet } from "lucide-react";
import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type MetricTone = "blue" | "emerald" | "amber" | "slate";

const metricTone: Record<MetricTone, { icon: string; accent: string }> = {
  blue: { icon: "bg-brand-blueSoft text-brand-blue", accent: "bg-brand-blue" },
  emerald: { icon: "bg-emerald-50 text-emerald-700", accent: "bg-emerald-600" },
  amber: { icon: "bg-amber-50 text-amber-700", accent: "bg-amber-500" },
  slate: { icon: "bg-slate-100 text-slate-700", accent: "bg-slate-500" },
};

function metric(label: string, value: string | number, caption: string, Icon: typeof Users, tone: MetricTone) {
  const colors = metricTone[tone];

  return (
    <div className="relative overflow-hidden rounded-lg border border-brand-line bg-white p-4 shadow-soft">
      <div className={`absolute inset-x-0 top-0 h-1 ${colors.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand-muted">{label}</div>
          <div className="mt-2 break-words text-2xl font-bold text-brand-ink sm:text-[1.7rem]">{value}</div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-2 text-xs leading-relaxed text-brand-muted">{caption}</div>
    </div>
  );
}

function miniMetric(label: string, value: string, Icon: typeof Bell, tone: MetricTone) {
  const colors = metricTone[tone];

  return (
    <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand-muted">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.icon}`}>
          <Icon size={15} />
        </span>
        {label}
      </div>
      <div className="mt-3 text-xl font-bold text-brand-ink">{value}</div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    userCount,
    usersToday,
    walletAggregate,
    transactionCount,
    pendingTransactions,
    failedTransactions,
    todayCredit,
    todayDebit,
    unreadNotifications,
    virtualAccountCount,
    providerEventsPending,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.wallet.aggregate({ _sum: { balanceKobo: true } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: "PENDING" } }),
    prisma.transaction.count({ where: { status: "FAILED" } }),
    prisma.transaction.aggregate({
      where: { type: "CREDIT", createdAt: { gte: today }, status: "SUCCESS" },
      _sum: { amountKobo: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "DEBIT", createdAt: { gte: today }, status: "SUCCESS" },
      _sum: { amountKobo: true },
    }),
    prisma.notification.count({ where: { read: false } }),
    prisma.virtualAccount.count(),
    prisma.providerEvent.count({ where: { processedAt: null } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-line bg-white px-4 py-4 shadow-soft sm:px-5">
        <h2 className="text-xl font-bold text-brand-ink">Overview</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-muted">
          High-level operational health across customers, wallets, transactions, and funding providers.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metric("Users", userCount, `${usersToday} joined today`, Users, "blue")}
        {metric("Wallet liability", formatNaira(walletAggregate._sum.balanceKobo || 0), "Total customer wallet balance", Wallet, "emerald")}
        {metric("Transactions", transactionCount, `${pendingTransactions} pending, ${failedTransactions} failed`, Activity, "amber")}
        {metric("Virtual accounts", virtualAccountCount, `${providerEventsPending} unprocessed provider events`, Landmark, "slate")}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {miniMetric("Today successful credits", formatNaira(todayCredit._sum.amountKobo || 0), ArrowDownRight, "blue")}
        {miniMetric("Today successful debits", formatNaira(todayDebit._sum.amountKobo || 0), ArrowUpRight, "amber")}
        {miniMetric("Unread notifications", String(unreadNotifications), Bell, "emerald")}
      </section>
    </div>
  );
}
