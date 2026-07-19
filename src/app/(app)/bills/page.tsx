"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ChevronRight } from "lucide-react";

type Biller = { serviceID: string; name: string; variationCode?: string };

export default function BillsPage() {
  const [billers, setBillers] = useState<Record<string, Biller[]>>({});
  const [active, setActive] = useState<{ category: string; biller: Biller } | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("5000");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/bills/billers")
      .then((r) => r.json())
      .then((d) => setBillers(d.billers));
  }, []);

  async function pay() {
    if (!active) return;
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/bills/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: active.category,
        billerName: active.biller.name,
        serviceID: active.biller.serviceID,
        variationCode: active.biller.variationCode,
        accountNumber,
        amountKobo: Math.round(Number(amount) * 100),
      }),
    });
    const data = await res.json();
    setLoading(false);
    setStatus(data.success ? "Payment successful ✓" : data.error || "Payment failed");
    if (data.success) setActive(null);
  }

  if (active) {
    return (
      <div className="px-5 pt-6">
        <button onClick={() => setActive(null)} className="text-xs text-gray-500 font-body mb-4">
          ← Back
        </button>
        <div className="text-lg font-display font-bold mb-4">{active.biller.name}</div>
        <div className="text-[11px] text-gray-500 font-body mb-1.5">Meter / smartcard / account number</div>
        <input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3.5 py-3 text-sm font-body outline-none mb-3"
        />
        <div className="text-[11px] text-gray-500 font-body mb-1.5">Amount (₦)</div>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3.5 py-3 text-sm font-mono outline-none mb-4"
        />
        <button
          onClick={pay}
          disabled={loading || !accountNumber || !amount}
          className="w-full rounded-2xl bg-brand-blue text-white py-3.5 text-sm font-bold font-body"
        >
          {loading ? "Processing…" : "Pay bill"}
        </button>
        {status && <div className="text-center text-xs font-body mt-4">{status}</div>}
      </div>
    );
  }

  return (
    <div>
      <TopBar subtitle="Pay" title="Bills" />
      <div className="px-5 pb-24">
        {Object.entries(billers).map(([category, list]) => (
          <div key={category} className="mt-5">
            <div className="text-[11.5px] font-semibold text-gray-500 font-body mb-2">{category}</div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {list.map((b, i) => (
                <button
                  key={b.serviceID}
                  onClick={() => setActive({ category, biller: b })}
                  className={`w-full flex items-center justify-between px-3.5 py-3.5 text-left ${
                    i !== list.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""
                  }`}
                >
                  <span className="text-[13.5px] font-body">{b.name}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
