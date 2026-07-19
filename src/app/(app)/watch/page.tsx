"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type Stock = { ticker: string; name: string; priceKobo: number; changePercent: number };

export default function WatchPage() {
  const [gold, setGold] = useState<{ pricePerGramNgn: number; changePercent: number } | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    fetch("/api/watch/gold").then((r) => r.json()).then(setGold);
    fetch("/api/watch/stocks").then((r) => r.json()).then((d) => setStocks(d.stocks));
  }, []);

  return (
    <div>
      <TopBar subtitle="Watch only" title="Gold & Stocks" />
      <div className="px-5">
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
