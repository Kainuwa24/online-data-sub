"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowDownRight, ArrowUpRight, Search, X } from "lucide-react";

type HistoryFilter = "ALL" | "CREDIT" | "DEBIT";

type Txn = {
  id: string;
  label: string;
  category: string;
  type: string;
  credit: boolean;
  amountKobo: number;
  amountFormatted: string;
  status: string;
  reference: string;
  createdAt: string;
};

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const router = useRouter();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [query, setQuery] = useState("");

  const load = useCallback(async (f: HistoryFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (f !== "ALL") params.set("type", f);
      const res = await fetch(`/api/wallet/transactions?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setTxns(data.transactions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load("ALL");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setFilterAndLoad(f: HistoryFilter) {
    setFilter(f);
    void load(f);
  }

  const filters: { id: HistoryFilter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "CREDIT", label: "In" },
    { id: "DEBIT", label: "Out" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return txns;
    return txns.filter((t) => {
      const hay = [
        t.label,
        t.amountFormatted,
        t.reference,
        t.category,
        t.status,
        t.credit ? "credit in" : "debit out",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [txns, query]);

  return (
    <div className="animate-fade-up pb-6">
      <TopBar subtitle="Activity" title="History" initial="H" />

      <div className="px-5">
        {/* Search */}
        <div className="card flex items-center gap-2.5 px-3.5 py-1 mb-3">
          <Search size={16} className="text-brand-muted shrink-0" />
          <input
            type="search"
            placeholder="Search transactions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none py-3 text-sm font-body text-brand-ink placeholder:text-slate-400"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="text-brand-muted p-1"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">Transactions</div>
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAndLoad(f.id)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold font-body border transition-all ${
                  filter === f.id
                    ? "bg-brand-blueSoft border-brand-blue/30 text-brand-blue"
                    : "bg-white border-brand-line text-brand-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-brand-red text-xs font-body font-medium mb-3">{error}</div>
        )}

        {loading ? (
          <div className="text-brand-muted text-sm font-body py-8 text-center">
            Loading transactions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="card py-10 px-4 text-center text-sm text-brand-muted font-body">
            {txns.length === 0
              ? "No transactions yet."
              : `No results for “${query.trim()}”.`}
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filtered.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => router.push(`/history/${t.id}`)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors active:bg-slate-50 ${
                  i !== filtered.length - 1 ? "border-b border-brand-line/70" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      t.credit ? "bg-brand-blueSoft" : "bg-brand-redSoft"
                    }`}
                  >
                    {t.credit ? (
                      <ArrowDownRight size={16} className="text-brand-blue" />
                    ) : (
                      <ArrowUpRight size={16} className="text-brand-red" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold font-body text-brand-ink truncate">
                      {t.label}
                    </div>
                    <div className="text-[11px] text-brand-muted font-body mt-0.5">
                      {formatWhen(t.createdAt)}
                      {t.status !== "SUCCESS" ? ` · ${t.status}` : ""}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-[13px] font-mono font-semibold shrink-0 ml-2 ${
                    t.credit ? "text-brand-blue" : "text-brand-red"
                  }`}
                >
                  {t.credit ? "+" : "−"}
                  {naira(t.amountKobo)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
