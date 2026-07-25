"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useAppCache, type BillersSnapshot, type BillerSnapshot } from "@/components/app/AppCacheProvider";
import { saveCheckout } from "@/lib/checkout";
import { ListRowSkeleton } from "@/components/ui/ListSkeleton";

const BILLER_SKELETON_SECTIONS = ["Electricity", "Cable TV", "Internet"] as const;

export default function BillsPage() {
  const router = useRouter();
  const { info } = useToast();
  const { billers, setBillers } = useAppCache();
  const [billersState, setBillersState] = useState<BillersSnapshot>(billers ?? {});
  const [loading, setLoading] = useState(!billers);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState<{ category: string; biller: BillerSnapshot } | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("5000");

  useEffect(() => {
    if (billers) {
      setBillersState(billers);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Quiet revalidate (or initial load) — shell stays visible with cache
    fetch("/api/bills/billers")
      .then((r) => r.json())
      .then((d) => {
        const next = d.billers || {};
        setBillersState(next);
        setBillers(next);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshBillers(force = false) {
    if (!force && billers) {
      setBillersState(billers);
      setLoading(false);
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch("/api/bills/billers");
      const data = await res.json();
      const next = data.billers || {};
      setBillersState(next);
      setBillers(next);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  function goConfirm() {
    if (!active) return;
    if (!accountNumber.trim()) {
      info("Enter meter / smartcard / account number");
      return;
    }
    const amountKobo = Math.round(Number(amount) * 100);
    if (!amountKobo || amountKobo < 100) {
      info("Enter a valid amount");
      return;
    }
    saveCheckout({
      kind: "bill",
      category: active.category,
      billerName: active.biller.name,
      serviceID: active.biller.serviceID,
      variationCode: active.biller.variationCode,
      accountNumber: accountNumber.trim(),
      amountKobo,
    });
    router.push("/confirm");
  }

  if (active) {
    return (
      <div className="animate-fade-up px-5 pt-6 pb-28">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="text-xs text-brand-muted font-body mb-4"
        >
          ← Back
        </button>
        <div className="text-lg font-display font-bold text-brand-ink mb-4">
          {active.biller.name}
        </div>
        <label className="mb-1.5 block text-[11px] font-semibold text-brand-muted font-body">
          Meter / smartcard / account number
        </label>
        <input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="input-premium mb-3"
        />
        <label className="mb-1.5 block text-[11px] font-semibold text-brand-muted font-body">
          Amount (₦)
        </label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          className="input-premium mb-4"
        />
        <button
          type="button"
          onClick={goConfirm}
          disabled={!accountNumber || !amount}
          className="btn-primary"
        >
          Continue to confirm
        </button>
      </div>
    );
  }

  const categories = Object.entries(billersState);
  const showSkeleton = loading && categories.length === 0;

  return (
    <div className="animate-fade-up">
      <TopBar subtitle="Pay" title="Bills" initial="B" />
      <div className="px-5 pb-28">
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={() => void refreshBillers(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {showSkeleton
          ? BILLER_SKELETON_SECTIONS.map((category) => (
              <div key={category} className="mt-5">
                <div className="section-label mb-2">{category}</div>
                <ListRowSkeleton rows={3} />
              </div>
            ))
          : categories.map(([category, list]) => (
              <div key={category} className="mt-5">
                <div className="section-label mb-2">{category}</div>
                <div className="card overflow-hidden">
                  {list.map((b, i) => (
                    <button
                      key={b.serviceID}
                      type="button"
                      onClick={() => setActive({ category, biller: b })}
                      className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-slate-50 ${
                        i !== list.length - 1 ? "border-b border-brand-line/70" : ""
                      }`}
                    >
                      <span className="text-[13.5px] font-body text-brand-ink">{b.name}</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
