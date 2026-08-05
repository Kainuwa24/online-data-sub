"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ListRowSkeleton } from "@/components/ui/ListSkeleton";
import type { FxCurrencyCode, FxRate, FxSnapshot } from "@/lib/services/fx";

function formatNgn(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  })}`;
}

function formatRate(value: number) {
  if (value >= 100) {
    return value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (value >= 10) {
    return value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
  return value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/**
 * The feed publishes about once a day, so show the day it was set — a
 * minute-precision stamp would imply pricing we don't actually have.
 */
function formatAsOf(iso: string) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return then.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default function ExchangePage() {
  const [snapshot, setSnapshot] = useState<FxSnapshot | null>(null);
  const [selected, setSelected] = useState<FxCurrencyCode>("USD");
  const [amount, setAmount] = useState("1");
  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  async function loadFx(force = false) {
    if (!force && snapshot) {
      setBootstrapping(false);
      void (async () => {
        try {
          const res = await fetch("/api/fx", { cache: "no-store" });
          const data = (await res.json()) as FxSnapshot;
          if (data?.rates?.length) setSnapshot(data);
        } catch {
          // keep cached
        }
      })();
      return;
    }

    setRefreshing(true);
    try {
      const res = await fetch("/api/fx", { cache: "no-store" });
      const data = (await res.json()) as FxSnapshot;
      if (data?.rates?.length) setSnapshot(data);
    } catch {
      // keep current
    } finally {
      setRefreshing(false);
      setBootstrapping(false);
    }
  }

  useEffect(() => {
    void loadFx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rates = snapshot?.rates ?? [];
  const active: FxRate | undefined = rates.find((r) => r.code === selected) ?? rates[0];

  const amountNum = useMemo(() => {
    const n = Number(String(amount).replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [amount]);

  const converted = active ? amountNum * active.rateToNgn : 0;
  const showSkeleton = bootstrapping && rates.length === 0;

  return (
    <div>
      <TopBar subtitle="Watch only" title="Currency exchange" />
      <div className="px-5">
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] leading-relaxed text-brand-muted font-body">
            {snapshot?.mocked
              ? "Saved street (parallel market) rates — shown while live rates are unreachable. Confirm before you trade."
              : "Official mid-market rates into Naira, updated about once a day. Street dealers quote higher."}
          </p>
          <button
            type="button"
            onClick={() => void loadFx(true)}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Converter card */}
        {showSkeleton ? (
          <div className="gold-price-card mt-3 animate-pulse rounded-[22px] p-5">
            <div className="h-3 w-28 rounded bg-black/10" />
            <div className="mt-4 h-12 w-full rounded-xl bg-black/10" />
            <div className="mt-3 h-8 w-40 rounded bg-black/10" />
          </div>
        ) : active ? (
          <div className="gold-price-card mt-3 rounded-[22px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-gold font-body">
                Convert to Naira
              </div>
              <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-semibold text-brand-gold">
                {snapshot?.mocked ? "Street · saved" : "Official · daily"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-brand-muted font-body">
                  Amount
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="input-premium w-full !py-3 text-lg font-display font-bold"
                  placeholder="1"
                  aria-label="Foreign amount"
                />
              </label>
              <label className="block min-w-[7.5rem]">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-brand-muted font-body">
                  Currency
                </span>
                <select
                  value={active.code}
                  onChange={(e) => setSelected(e.target.value as FxCurrencyCode)}
                  className="input-premium w-full !py-3 text-sm font-semibold"
                  aria-label="Currency"
                >
                  {rates.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2 text-[11px] text-brand-muted font-body">
              <ArrowLeftRight size={14} className="text-brand-gold" />
              {active.symbol}
              {amountNum || 0} {active.code} → NGN
            </div>

            <div className="mt-1.5 text-[28px] font-display font-extrabold tracking-tight">
              {formatNgn(converted)}
            </div>

            <div className="mt-1 text-[11px] font-mono text-gray-500">
              1 {active.code} = ₦{formatRate(active.rateToNgn)}
            </div>

            {snapshot?.asOf && formatAsOf(snapshot.asOf) ? (
              <div className="mt-2 text-[10px] font-mono text-gray-400">
                Rate set {formatAsOf(snapshot.asOf)}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Rate list */}
        <div className="mb-2 mt-6 flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-gray-500 font-body">
            Rates to Naira (NGN)
          </span>
          <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-400 font-body dark:border-gray-700">
            {snapshot?.mocked ? "Street rates" : "Official rates"}
          </span>
        </div>

        {showSkeleton ? (
          <ListRowSkeleton rows={7} className="mb-24" />
        ) : (
          <div className="mb-24 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
            {rates.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-brand-muted font-body">
                Rates unavailable right now.
              </div>
            ) : (
              rates.map((r, i) => {
                const isActive = r.code === active?.code;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setSelected(r.code)}
                    className={`flex w-full items-center justify-between px-3.5 py-3.5 text-left transition-colors ${
                      isActive ? "bg-brand-blueSoft/60 dark:bg-white/5" : ""
                    } ${i !== rates.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-white text-sm font-bold text-brand-blue shadow-soft dark:border-gray-700 dark:bg-gray-900">
                        {r.code.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-medium font-body">{r.name}</div>
                        <div className="font-mono text-[11px] text-gray-400">
                          {r.symbol} · {r.code}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <div className="text-[13px] font-mono font-semibold">
                        ₦{formatRate(r.rateToNgn)}
                      </div>
                      <div className="text-[10px] text-gray-400 font-body">per 1 {r.code}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
