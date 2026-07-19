import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Transaction } from "@prisma/client";
import { TopBar } from "@/components/layout/TopBar";
import { Smartphone, Zap, Receipt, Tv, Wifi, ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
  const transactions = await prisma.transaction.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const quickActions = [
    { icon: Smartphone, label: "Buy data", href: "/data" },
    { icon: Zap, label: "Airtime", href: "/data?tab=airtime" },
    { icon: Receipt, label: "Electricity", href: "/bills" },
    { icon: Tv, label: "Cable TV", href: "/bills" },
    { icon: Wifi, label: "Internet", href: "/bills" },
  ];

  return (
    <div>
      <TopBar subtitle="Good evening" title={user!.name.split(" ")[0]} />

      <div className="mx-5 mt-4 rounded-[22px] p-5 text-white" style={{ background: "linear-gradient(145deg, #2C5AA0, #1E4478)" }}>
        <div className="text-xs text-white/75 font-body">Wallet balance</div>
        <div className="text-3xl font-display font-extrabold mt-1.5">{naira(wallet?.balanceKobo ?? 0)}</div>
        <div className="flex gap-2.5 mt-4">
          <Link href="/wallet" className="flex-1 bg-white text-brand-blue rounded-xl py-2.5 text-xs font-bold text-center font-body">
            + Fund wallet
          </Link>
          <div className="flex-1 bg-white/10 border border-white/30 rounded-xl py-2.5 text-xs font-semibold text-center font-body">
            Send / share
          </div>
        </div>
      </div>

      <div className="flex gap-3.5 px-5 pt-5 overflow-x-auto">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.label} href={a.href} className="flex flex-col items-center gap-2 min-w-[64px]">
              <div className="h-13 w-13 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <Icon size={20} className="text-brand-blue" />
              </div>
              <span className="text-[11px] text-gray-500 font-body text-center">{a.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="px-5 pt-6 pb-8">
        <div className="text-xs font-semibold text-gray-500 font-body mb-2">Recent activity</div>
        {transactions.length === 0 && (
          <div className="text-xs text-gray-400 font-body py-6 text-center">No transactions yet.</div>
        )}
        {transactions.map((t: Transaction) => (
          <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${t.type === "CREDIT" ? "bg-blue-50 dark:bg-blue-950" : "bg-red-50 dark:bg-red-950"}`}>
                {t.type === "CREDIT" ? <ArrowDownRight size={15} className="text-brand-blue" /> : <ArrowUpRight size={15} className="text-brand-red" />}
              </div>
              <div>
                <div className="text-[13.5px] font-medium font-body">{t.label}</div>
                <div className="text-[11.5px] text-gray-400 font-body">{new Date(t.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div className={`text-[13px] font-mono ${t.type === "CREDIT" ? "text-brand-blue" : "text-brand-red"}`}>
              {t.type === "CREDIT" ? "+" : "-"}{naira(t.amountKobo)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
