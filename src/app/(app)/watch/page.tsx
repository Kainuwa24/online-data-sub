"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { useAppCache, type WatchSnapshot } from "@/components/app/AppCacheProvider";
import { ListRowSkeleton } from "@/components/ui/ListSkeleton";

export default function WatchPage() {
  const { watch, setWatch } = useAppCache();
  const [gold, setGold] = useState(watch?.gold ?? null);
  const [stocks, setStocks] = useState(watch?.stocks ?? []);
  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(!watch);

  async function loadWatch(force = false) {
    if (!force && watch) {
      setGold(watch.gold);
      setStocks(watch.stocks);
      setBootstrapping(false);
      // Quiet revalidate
      void (async () => {
        try {
          const [goldRes, stocksRes] = await Promise.all([
            fetch("/api/watch/gold"),
            fetch("/api/watch/stocks"),
          ]);
          const [goldData, stocksData] = await Promise.all([goldRes.json(), stocksRes.json()]);
          const next: WatchSnapshot = {
            gold: goldData || null,
            stocks: stocksData.stocks || [],
          };
          setGold(next.gold);
          setStocks(next.stocks);
          setWatch(next);
        } catch {
          // keep cached
        }
      })();
      return;
    }

    setRefreshing(true);
    try {
      const [goldRes, stocksRes] = await Promise.all([
        fetch("/api/watch/gold"),
        fetch("/api/watch/stocks"),
      ]);
      const [goldData, stocksData] = await Promise.all([goldRes.json(), stocksRes.json()]);
      const next: WatchSnapshot = {
        gold: goldData || null,
        stocks: stocksData.stocks || [],
      };
      setGold(next.gold);
      setStocks(next.stocks);
      setWatch(next);
    } catch {
      // Keep the current snapshot if refresh fails.
    } finally {
      setRefreshing(false);
      setBootstrapping(false);
    }
  }

  useEffect(() => {
    void loadWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showGoldSkeleton = bootstrapping && !gold;
  const showStocksSkeleton = bootstrapping && stocks.length === 0;

  return (
    <div>
      <TopBar subtitle="Watch only" title="Gold & Stocks" />
      <div className="px-5">
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={() => void loadWatch(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {showGoldSkeleton ? (
          <div className="gold-price-card rounded-[22px] p-5 mt-2 animate-pulse">
            <div className="h-3 w-32 rounded bg-black/10" />
            <div className="mt-3 h-8 w-40 rounded bg-black/10" />
            <div className="mt-2 h-3 w-24 rounded bg-black/10" />
          </div>
        ) : gold ? (
          <div className="gold-price-card rounded-[22px] p-5 mt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-wide text-brand-gold font-body font-semibold">
                Gold per gram (XAU)
              </div>
              <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-semibold text-brand-gold">
                {gold.mocked ? "Fallback" : "Live"}
              </span>
            </div>
            <div className="text-[28px] font-display font-extrabold mt-1.5">
              {"\u20A6"}{gold.pricePerGramNgn.toLocaleString()}
            </div>
            <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-mono ${gold.changePercent >= 0 ? "text-brand-blue" : "text-brand-red"}`}>
              {gold.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {gold.changePercent}% today
            </div>
            {gold.asOf ? (
              <div className="mt-1 text-[10px] text-gray-400 font-mono">
                Updated {new Date(gold.asOf).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between mt-6 mb-2">
          <span className="text-[11.5px] font-semibold text-gray-500 font-body">
            Nigerian Exchange (NGX)
          </span>
          <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5 font-body">
            {stocks.some((s) => s.source && s.source !== "fallback") ? "Live quotes" : "Watch only"}
          </span>
        </div>
        {showStocksSkeleton ? (
          <ListRowSkeleton rows={6} className="mb-24" />
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden pb-24">
            {stocks.length === 0 ? (
              <div className="text-sm text-brand-muted font-body py-10 text-center px-4">
                Markets unavailable right now.
              </div>
            ) : (
              stocks.map((s, i) => (
                <div
                  key={s.ticker}
                  className={`flex items-center justify-between px-3.5 py-3.5 ${
                    i !== stocks.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""
                  }`}
                >
                  <div>
                    <div className="text-[13.5px] font-medium font-body">{s.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{s.symbol || s.ticker}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-mono">
                      {"\u20A6"}{(s.priceKobo / 100).toLocaleString()}
                    </div>
                    <div
                      className={`text-[11.5px] font-mono flex items-center gap-1 justify-end ${
                        s.changePercent >= 0 ? "text-brand-blue" : "text-brand-red"
                      }`}
                    >
                      {s.changePercent >= 0 ? (
                        <ArrowUpRight size={11} />
                      ) : (
                        <ArrowDownRight size={11} />
                      )}
                      {s.changePercent}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
