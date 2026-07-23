"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { useToast } from "@/components/ui/Toast";
import { PhoneField } from "@/components/ui/PhoneField";
import { isValidNgPhone, validateNgPhone } from "@/lib/phone";
import { saveCheckout } from "@/lib/checkout";
import { RefreshCw } from "lucide-react";

export type Plan = {
  network: string;
  variationCode: string;
  size: string;
  validity: string;
  priceKobo: number;
  planType?: string;
  name?: string;
};

const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"] as const;

export function DataPageClient({
  initialPlans,
  initialTab = "data",
}: {
  initialPlans: Plan[];
  initialTab?: "data" | "airtime";
}) {
  const router = useRouter();
  const { info } = useToast();
  const [tab, setTab] = useState<"data" | "airtime">(initialTab);
  const [allPlans, setAllPlans] = useState<Plan[]>(initialPlans);
  const [network, setNetwork] = useState<string>("MTN");
  const [phone, setPhone] = useState("");
  const [airtimeAmount, setAirtimeAmount] = useState("100");
  const [refreshing, setRefreshing] = useState(false);

  const plans = useMemo(
    () => allPlans.filter((p) => p.network === network),
    [allPlans, network],
  );

  async function loadPlans(force = false) {
    if (force) {
      setRefreshing(true);
    }
    try {
      const res = await fetch("/api/data/plans");
      const d = await res.json();
      if (Array.isArray(d.plans) && d.plans.length > 0) {
        setAllPlans(d.plans);
      }
    } catch {
      // Keep the existing snapshot if refresh fails.
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      setRefreshing(true);
      fetch("/api/data/plans")
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && Array.isArray(d.plans) && d.plans.length > 0) {
            setAllPlans(d.plans);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setRefreshing(false);
        });
    }, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  function goConfirmData(plan: Plan) {
    const check = validateNgPhone(phone, { label: "Recipient number" });
    if (!check.ok) {
      info(check.error);
      return;
    }
    saveCheckout({
      kind: "data",
      network: plan.network,
      variationCode: plan.variationCode,
      planLabel: `${plan.size} · ${plan.validity}`,
      size: plan.size,
      validity: plan.validity,
      priceKobo: plan.priceKobo,
      recipientPhone: check.phone,
    });
    router.push("/confirm");
  }

  function goConfirmAirtime() {
    const check = validateNgPhone(phone, { label: "Recipient number" });
    if (!check.ok) {
      info(check.error);
      return;
    }
    const amountKobo = Math.round(Number(airtimeAmount) * 100);
    if (!amountKobo || amountKobo < 5000) {
      info("Minimum airtime is ₦50");
      return;
    }
    saveCheckout({
      kind: "airtime",
      network,
      amountKobo,
      recipientPhone: check.phone,
    });
    router.push("/confirm");
  }

  return (
    <div className="animate-fade-up">
      <TopBar subtitle="Buy" title="Data & Airtime" initial="D" />
      <div className="px-5">
        <div className="card p-1.5 flex gap-1 mb-5">
          {(["data", "airtime"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-2xl py-2.5 text-xs font-body capitalize transition-all ${
                tab === t
                  ? "bg-brand-blue text-white font-bold shadow-soft"
                  : "text-brand-muted font-medium"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <PhoneField
          label="Recipient phone number"
          value={phone}
          onChange={setPhone}
          helperText="Number that will receive the data or airtime"
        />

        <div className="flex items-center justify-between mb-2">
          <div className="section-label">Network</div>
          <button
            type="button"
            onClick={() => void loadPlans(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <div className="flex gap-2 mb-5">
          {NETWORKS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNetwork(n)}
              className={`flex-1 rounded-xl py-2.5 text-[11px] font-body transition-all ${
                network === n
                  ? "bg-brand-blue text-white font-bold shadow-soft"
                  : "bg-white border border-brand-line text-brand-muted font-medium"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {tab === "data" ? (
          <>
            <div className="section-label mb-3">Choose a plan</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 pb-28 pt-1">
              {plans.map((p) => {
                const showBadge = Boolean(p.planType && p.planType !== "STANDARD");
                return (
                  <button
                    key={`${p.network}-${p.variationCode}`}
                    type="button"
                    onClick={() => goConfirmData(p)}
                    disabled={!isValidNgPhone(phone)}
                    className="card-interactive relative text-left px-3.5 pt-4 pb-3.5 disabled:opacity-50"
                  >
                    {showBadge && (
                      <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-brand-blue/15 bg-brand-blueSoft px-2.5 py-0.5 text-[10px] font-semibold leading-none text-brand-blue shadow-soft">
                        {p.planType}
                      </span>
                    )}
                    <div className="text-lg font-display font-bold text-brand-ink leading-tight">
                      {p.size}
                    </div>
                    <div className="text-[11px] text-brand-muted font-body mt-0.5">
                      {p.validity}
                    </div>
                    <div className="text-brand-blue text-sm font-mono font-bold mt-2">
                      ₦{(p.priceKobo / 100).toLocaleString()}
                    </div>
                  </button>
                );
              })}
              {plans.length === 0 && (
                <div className="col-span-2 text-sm text-brand-muted font-body py-10 text-center card">
                  {allPlans.length === 0
                    ? "Loading plans…"
                    : "No plans for this network right now."}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="pb-28">
            <label className="mb-1.5 block text-[11px] font-semibold text-brand-muted font-body">
              Amount (₦)
            </label>
            <input
              value={airtimeAmount}
              onChange={(e) => setAirtimeAmount(e.target.value)}
              type="number"
              min={50}
              className="input-premium mb-3"
            />
            <div className="flex gap-2 mb-5">
              {["100", "200", "500", "1000"].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAirtimeAmount(a)}
                  className="flex-1 rounded-xl border border-brand-line bg-white py-2.5 text-xs font-mono font-semibold text-brand-ink shadow-soft"
                >
                  ₦{a}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={goConfirmAirtime}
              disabled={!isValidNgPhone(phone)}
              className="btn-primary"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
