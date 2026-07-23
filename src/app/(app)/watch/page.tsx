"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { useAppCache, type WatchSnapshot } from "@/components/app/AppCacheProvider";

export default function WatchPage() {
  const { watch, setWatch } = useAppCache();
  const [gold, setGold] = useState(watch?.gold ?? null);
  const [stocks, setStocks] = useState(watch?.stocks ?? []);
  const [refreshing, setRefreshing] = useState(false);

  async function loadWatch(force = false) {
    if (!force && watch) {
      setGold(watch.gold);
      setStocks(watch.stocks);
      return;
    }

    setRefreshing(true);
    try {
      const [goldRes, stocksRes] = await Promise.all([fetch("/api/watch/gold"), fetch("/api/watch/stocks")]);
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
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (watch) {
        if (cancelled) return;
        setGold(watch.gold);
        setStocks(watch.stocks);
        return;
      }

      await loadWatch();
    })();

    return () => {
      cancelled = true;
    };
  }, [watch]);

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

        {gold && (
          <div
            className="rounded-[22px] p-5 mt-2 border"
            style={{ background: "linear-gradient(150deg, #F3ECDA, white)", borderColor: "#F3ECDA" }}
          >
            <div className="text-[11px] uppercase tracking-wide text-brand-gold font-body font-semibold">
              Gold · per gram (XAU)
            </div>
            <div className="text-[28px] font-display font-extrabold mt-1.5">
              ₦{gold.pricePerGramNgn.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-brand-blue text-xs font-mono">
              <ArrowUpRight size={14} /> {gold.changePercent}% today
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 mb-2">
          <span className="text-[11.5px] font-semibold text-gray-500 font-body">Nigerian Exchange (NGX)</span>
          <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5 font-body">
            Watch only
          </span>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden pb-24">
          {stocks.map((s, i) => (
            <div
              key={s.ticker}
              className={`flex items-center justify-between px-3.5 py-3.5 ${
                i !== stocks.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""
              }`}
            >
              <div>
                <div className="text-[13.5px] font-medium font-body">{s.name}</div>
                <div className="text-[11px] text-gray-400 font-mono">{s.ticker}</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-mono">₦{(s.priceKobo / 100).toLocaleString()}</div>
                <div className={`text-[11.5px] font-mono flex items-center gap-1 justify-end ${s.changePercent >= 0 ? "text-brand-blue" : "text-brand-red"}`}>
                  {s.changePercent >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {s.changePercent}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
