import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Landmark, PieChart, ShieldAlert, Users, Wallet } from "lucide-react";
import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getAsbdataBalance } from "@/lib/services/asbdata";
import { getFlutterwaveBalance } from "@/lib/services/flutterwave";

type SearchParams = { range?: string };
type Tone = "blue" | "emerald" | "amber" | "red" | "slate";

const tones: Record<Tone, { icon: string; bar: string; text: string }> = {
  blue: { icon: "bg-brand-blueSoft text-brand-blue", bar: "bg-brand-blue", text: "text-brand-blue" },
  emerald: { icon: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600", text: "text-emerald-700" },
  amber: { icon: "bg-amber-50 text-amber-700", bar: "bg-amber-500", text: "text-amber-700" },
  red: { icon: "bg-brand-redSoft text-brand-red", bar: "bg-brand-red", text: "text-brand-red" },
  slate: { icon: "bg-slate-100 text-slate-700", bar: "bg-slate-500", text: "text-slate-700" },
};

function getRangeStart(range: string) {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 3650 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

function metric(label: string, value: string | number, caption: string, Icon: typeof BarChart3, tone: Tone) {
  const color = tones[tone];

  return (
    <div className="relative overflow-hidden rounded-lg border border-brand-line bg-white p-4 shadow-soft">
      <div className={`absolute inset-x-0 top-0 h-1 ${color.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand-muted">{label}</div>
          <div className="mt-2 break-words text-2xl font-bold text-brand-ink sm:text-[1.7rem]">{value}</div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color.icon}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-2 text-xs leading-relaxed text-brand-muted">{caption}</div>
    </div>
  );
}

function percent(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function formatCount(value: number) {
  return value.toLocaleString("en-NG");
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const range = searchParams.range || "30d";
  const start = getRangeStart(range);

  const [
    transactions,
    usersInRange,
    totalUsers,
    walletAggregate,
    virtualAccounts,
    providerEvents,
    asbdataBalance,
    flutterwaveBalance,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { createdAt: { gte: start } },
      orderBy: { createdAt: "desc" },
      select: { type: true, category: true, status: true, amountKobo: true, createdAt: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: start } } }),
    prisma.user.count(),
    prisma.wallet.aggregate({ _sum: { balanceKobo: true }, _avg: { balanceKobo: true } }),
    prisma.virtualAccount.count(),
    prisma.providerEvent.findMany({
      where: { createdAt: { gte: start } },
      select: { provider: true, status: true, processedAt: true },
    }),
    getAsbdataBalance(),
    getFlutterwaveBalance("NGN"),
  ]);

  const successful = transactions.filter((txn) => txn.status === "SUCCESS");
  const failed = transactions.filter((txn) => txn.status === "FAILED");
  const pending = transactions.filter((txn) => txn.status === "PENDING");
  const credits = successful.filter((txn) => txn.type === "CREDIT");
  const debits = successful.filter((txn) => txn.type === "DEBIT");
  const grossCredit = credits.reduce((sum, txn) => sum + txn.amountKobo, 0);
  const grossDebit = debits.reduce((sum, txn) => sum + txn.amountKobo, 0);
  const walletLiabilityKobo = walletAggregate._sum.balanceKobo || 0;
  const providerFloatKobo = asbdataBalance.success ? asbdataBalance.balanceKobo || 0 : null;
  const fundingBalanceKobo = flutterwaveBalance.success ? flutterwaveBalance.balanceKobo || 0 : null;
  const availableLiquidityKobo = providerFloatKobo ?? fundingBalanceKobo;
  const liquidityGapKobo = availableLiquidityKobo == null ? null : availableLiquidityKobo - walletLiabilityKobo;
  const liquidityCoverage = walletLiabilityKobo > 0 && availableLiquidityKobo != null
    ? Math.round((availableLiquidityKobo / walletLiabilityKobo) * 100)
    : availableLiquidityKobo != null
      ? 100
      : null;
  const liquidityTone: Tone = liquidityGapKobo == null ? "amber" : liquidityGapKobo >= 0 ? "emerald" : "red";
  const successRate = percent(successful.length, transactions.length);
  const averageTxn = successful.length
    ? Math.round(successful.reduce((sum, txn) => sum + txn.amountKobo, 0) / successful.length)
    : 0;

  const byCategory = new Map<string, { count: number; amountKobo: number; failed: number }>();
  for (const txn of transactions) {
    const current = byCategory.get(txn.category) || { count: 0, amountKobo: 0, failed: 0 };
    current.count += 1;
    if (txn.status === "SUCCESS") current.amountKobo += txn.amountKobo;
    if (txn.status === "FAILED") current.failed += 1;
    byCategory.set(txn.category, current);
  }
  const categories = Array.from(byCategory.entries())
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.amountKobo - a.amountKobo)
    .slice(0, 8);
  const topCategoryAmount = Math.max(...categories.map((item) => item.amountKobo), 1);

  const byProvider = new Map<string, { count: number; processed: number; failed: number }>();
  for (const event of providerEvents) {
    const current = byProvider.get(event.provider) || { count: 0, processed: 0, failed: 0 };
    current.count += 1;
    if (event.processedAt) current.processed += 1;
    if (event.status === "FAILED") current.failed += 1;
    byProvider.set(event.provider, current);
  }
  const providers = Array.from(byProvider.entries()).map(([provider, value]) => ({ provider, ...value }));

  const daily = new Map<string, { count: number; amountKobo: number }>();
  for (const txn of successful) {
    const key = txn.createdAt.toISOString().slice(0, 10);
    const current = daily.get(key) || { count: 0, amountKobo: 0 };
    current.count += 1;
    current.amountKobo += txn.amountKobo;
    daily.set(key, current);
  }
  const dailyRows = Array.from(daily.entries())
    .map(([date, value]) => ({ date, ...value }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  const topDailyAmount = Math.max(...dailyRows.map((item) => item.amountKobo), 1);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-line bg-white px-4 py-4 shadow-soft sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-ink">Data analytics</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-muted">
              Performance snapshot for transactions, users, wallets, categories, and provider callbacks.
            </p>
          </div>
          <form action="/admin/analytics" className="flex gap-2">
            <select name="range" defaultValue={range} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink outline-none">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Apply</button>
          </form>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metric("Successful volume", formatNaira(grossDebit), `${formatCount(debits.length)} successful debit transactions`, ArrowUpRight, "blue")}
        {metric("Wallet inflow", formatNaira(grossCredit), `${formatCount(credits.length)} successful credit transactions`, ArrowDownRight, "emerald")}
        {metric("Success rate", successRate, `${formatCount(failed.length)} failed, ${formatCount(pending.length)} pending`, Activity, "amber")}
        {metric("Wallet liability", formatNaira(walletLiabilityKobo), `${virtualAccounts} virtual accounts / ${formatNaira(walletAggregate._avg.balanceKobo || 0)} avg`, Wallet, "slate")}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft xl:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Landmark size={18} className="text-brand-blue" />
                <h3 className="font-bold text-brand-ink">Liquidity match</h3>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-muted">
                Compares customer wallet liability with provider-side balances. ASBDATA is the biller float used for data, airtime, and bills; Flutterwave is funding settlement balance.
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${tones[liquidityTone].icon}`}>
              <ShieldAlert size={16} />
              {liquidityGapKobo == null ? "Balance unavailable" : liquidityGapKobo >= 0 ? "Covered" : "Funding gap"}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-brand-muted">Customer liability</div>
              <div className="mt-2 font-mono text-xl font-bold text-brand-ink">{formatNaira(walletLiabilityKobo)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-brand-muted">ASBDATA float</div>
              <div className="mt-2 font-mono text-xl font-bold text-brand-ink">{providerFloatKobo == null ? "Unavailable" : formatNaira(providerFloatKobo)}</div>
              <div className="mt-1 text-xs text-brand-muted">{asbdataBalance.success ? "Live biller balance" : asbdataBalance.message || "Not configured"}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-brand-muted">Flutterwave NGN</div>
              <div className="mt-2 font-mono text-xl font-bold text-brand-ink">{fundingBalanceKobo == null ? "Unavailable" : formatNaira(fundingBalanceKobo)}</div>
              <div className="mt-1 text-xs text-brand-muted">{flutterwaveBalance.success ? "Settlement balance" : flutterwaveBalance.message || "Not configured"}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-brand-muted">Coverage</div>
              <div className={`mt-2 font-mono text-xl font-bold ${tones[liquidityTone].text}`}>
                {liquidityCoverage == null ? "Unknown" : `${liquidityCoverage}%`}
              </div>
              <div className="mt-1 text-xs text-brand-muted">{liquidityGapKobo == null ? "Connect provider balance to calculate gap" : `${formatNaira(Math.abs(liquidityGapKobo))} ${liquidityGapKobo >= 0 ? "surplus" : "short"}`}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <PieChart size={18} className="text-brand-blue" />
            <h3 className="font-bold text-brand-ink">Category performance</h3>
          </div>
          <div className="mt-4 space-y-3">
            {categories.length === 0 ? (
              <div className="py-8 text-center text-sm text-brand-muted">No transaction data in this range.</div>
            ) : (
              categories.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="font-semibold capitalize text-brand-ink">{item.category.replace(/_/g, " ")}</div>
                    <div className="font-mono font-semibold text-brand-ink">{formatNaira(item.amountKobo)}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.max(6, Math.round((item.amountKobo / topCategoryAmount) * 100))}%` }} />
                    </div>
                    <div className="w-28 text-right text-xs text-brand-muted">{item.count} txns / {item.failed} failed</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-700" />
            <h3 className="font-bold text-brand-ink">Customer growth</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-brand-muted">New users</div>
              <div className="mt-2 text-2xl font-bold text-brand-ink">{formatCount(usersInRange)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-brand-muted">Total users</div>
              <div className="mt-2 text-2xl font-bold text-brand-ink">{formatCount(totalUsers)}</div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-brand-blueSoft p-3 text-sm text-brand-blue">
            Average successful transaction: <span className="font-bold">{formatNaira(averageTxn)}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-blue" />
            <h3 className="font-bold text-brand-ink">Daily successful volume</h3>
          </div>
          <div className="mt-4 space-y-3">
            {dailyRows.length === 0 ? (
              <div className="py-8 text-center text-sm text-brand-muted">No daily activity in this range.</div>
            ) : (
              dailyRows.map((item) => (
                <div key={item.date}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="font-semibold text-brand-ink">{new Date(item.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</div>
                    <div className="font-mono font-semibold text-brand-ink">{formatNaira(item.amountKobo)}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(6, Math.round((item.amountKobo / topDailyAmount) * 100))}%` }} />
                    </div>
                    <div className="w-16 text-right text-xs text-brand-muted">{item.count} txns</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-amber-700" />
            <h3 className="font-bold text-brand-ink">Provider callbacks</h3>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-brand-muted">
                <tr>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3">Events</th>
                  <th className="py-2 pr-3">Processed</th>
                  <th className="py-2 pr-3">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {providers.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-brand-muted">No provider callbacks in this range.</td></tr>
                ) : (
                  providers.map((item) => (
                    <tr key={item.provider}>
                      <td className="py-3 pr-3 font-semibold capitalize text-brand-ink">{item.provider}</td>
                      <td className="py-3 pr-3 text-brand-muted">{item.count}</td>
                      <td className="py-3 pr-3 text-emerald-700">{item.processed}</td>
                      <td className="py-3 pr-3 text-brand-red">{item.failed}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}


