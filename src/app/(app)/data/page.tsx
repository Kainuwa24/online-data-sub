"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";

type Plan = {
  network: string;
  variationCode: string;
  size: string;
  validity: string;
  priceKobo: number;
  planType?: string;
};

const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

function DataPageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "airtime" ? "airtime" : "data";
  const [tab, setTab] = useState<"data" | "airtime">(initialTab);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [network, setNetwork] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [airtimeAmount, setAirtimeAmount] = useState("100");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/data/plans?network=${encodeURIComponent(network)}`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []));
  }, [network]);

  async function buyData(plan: Plan) {
    if (!phone) {
      setStatus("Enter the recipient's phone number first");
      return;
    }
    setBusyPlan(plan.variationCode);
    setStatus(null);
    const res = await fetch("/api/data/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: plan.network,
        variationCode: plan.variationCode,
        planLabel: `${plan.size} · ${plan.validity}`,
        priceKobo: plan.priceKobo,
        recipientPhone: phone,
      }),
    });
    const data = await res.json();
    setBusyPlan(null);
    setStatus(data.success ? "Purchase successful ✓" : data.error || "Purchase failed");
  }

  async function buyAirtime() {
    if (!phone) {
      setStatus("Enter the recipient's phone number first");
      return;
    }
    const amountKobo = Math.round(Number(airtimeAmount) * 100);
    if (!amountKobo || amountKobo < 5000) {
      setStatus("Minimum airtime is ₦50");
      return;
    }
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/airtime/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network,
        amountKobo,
        recipientPhone: phone,
      }),
    });
    const data = await res.json();
    setBusy(false);
    setStatus(data.success ? "Airtime sent ✓" : data.error || "Airtime purchase failed");
  }

  return (
    <div>
      <TopBar subtitle="Buy" title="Data & Airtime" />
      <div className="px-5">
        <div className="flex gap-2 mt-2 mb-4">
          {(["data", "airtime"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setStatus(null);
              }}
              className={`flex-1 rounded-xl py-2.5 text-xs font-body capitalize ${
                tab === t
                  ? "bg-brand-blue text-white font-bold"
                  : "border border-gray-200 dark:border-gray-700 text-gray-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-gray-500 font-body mb-1.5">Recipient phone number</div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0803 456 7890"
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3.5 py-3 text-sm font-mono outline-none"
        />

        <div className="text-[11px] text-gray-500 font-body my-3">Network</div>
        <div className="flex gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNetwork(n)}
              className={`flex-1 rounded-xl py-2 text-xs font-body ${
                network === n
                  ? "bg-brand-blue text-white font-bold"
                  : "border border-gray-200 dark:border-gray-700 text-gray-500"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {tab === "data" ? (
          <>
            <div className="text-[11px] text-gray-500 font-body my-3">Choose a plan</div>
            <div className="grid grid-cols-2 gap-2.5 pb-24">
              {plans.map((p) => (
                <button
                  key={p.variationCode}
                  type="button"
                  onClick={() => buyData(p)}
                  disabled={busyPlan !== null}
                  className="text-left rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 bg-white dark:bg-gray-900"
                >
                  <div className="text-lg font-display font-bold">{p.size}</div>
                  <div className="text-[11px] text-gray-400 font-body">{p.validity}</div>
                  {p.planType && p.planType !== "STANDARD" && (
                    <div className="text-[10px] text-brand-blue font-body mt-1">{p.planType}</div>
                  )}
                  <div className="text-brand-blue text-sm font-mono font-semibold mt-2.5">
                    {busyPlan === p.variationCode
                      ? "Processing…"
                      : `₦${(p.priceKobo / 100).toLocaleString()}`}
                  </div>
                </button>
              ))}
              {plans.length === 0 && (
                <div className="col-span-2 text-xs text-gray-400 font-body py-8 text-center">
                  No plans for this network right now.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 pb-24">
            <div className="text-[11px] text-gray-500 font-body mb-1.5">Amount (₦)</div>
            <input
              value={airtimeAmount}
              onChange={(e) => setAirtimeAmount(e.target.value)}
              type="number"
              min={50}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3.5 py-3 text-sm font-mono outline-none mb-3"
            />
            <div className="flex gap-2 mb-4">
              {["100", "200", "500", "1000"].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAirtimeAmount(a)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2 text-xs font-mono"
                >
                  ₦{a}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={buyAirtime}
              disabled={busy}
              className="w-full rounded-2xl bg-brand-blue text-white py-3.5 text-sm font-bold font-body disabled:bg-gray-300"
            >
              {busy ? "Processing…" : "Buy airtime"}
            </button>
          </div>
        )}

        {status && (
          <div className="fixed bottom-24 left-0 right-0 text-center text-xs font-body px-4">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DataPage() {
  return (
    <Suspense fallback={null}>
      <DataPageInner />
    </Suspense>
  );
}
