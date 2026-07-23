"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check, RefreshCw } from "lucide-react";

type TxnDetail = {
  id: string;
  label: string;
  category: string;
  type: string;
  credit: boolean;
  amountKobo: number;
  amountFormatted: string;
  status: string;
  reference: string;
  meta: unknown;
  createdAt: string;
};

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-brand-line/70 last:border-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted font-body shrink-0">
        {label}
      </div>
      <div className="text-sm font-body font-medium text-brand-ink text-right break-all">
        {value}
      </div>
    </div>
  );
}

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const [txn, setTxn] = useState<TxnDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTxn = useCallback(
    async (force = false) => {
      if (!id) return;
      if (force) {
        setRefreshing(true);
      }
      setError(null);
      try {
        const res = await fetch(`/api/wallet/transactions/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        setTxn(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void loadTxn();
  }, [loadTxn]);

  async function copyRef() {
    if (!txn?.reference) return;
    await navigator.clipboard.writeText(txn.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="animate-fade-up px-5 pt-6 pb-28">
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={() => router.push("/history")}
          className="flex items-center gap-1.5 text-xs text-brand-muted font-body"
        >
          <ArrowLeft size={14} /> Back to history
        </button>
        <button
          type="button"
          onClick={() => void loadTxn(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-60"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="card p-6 text-center text-sm text-brand-red font-body">{error}</div>
      )}

      {!error && !txn && (
        <div className="text-center text-sm text-brand-muted font-body py-12">Loading…</div>
      )}

      {txn && (
        <>
          <div className="card p-6 text-center mb-4">
            <div
              className={`inline-flex text-[11px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 mb-3 ${
                txn.credit
                  ? "bg-brand-blueSoft text-brand-blue"
                  : "bg-brand-redSoft text-brand-red"
              }`}
            >
              {txn.credit ? "Credit" : "Debit"} · {txn.status}
            </div>
            <div className="text-sm font-body text-brand-muted">{txn.label}</div>
            <div
              className={`text-3xl font-display font-extrabold mt-2 tracking-tight ${
                txn.credit ? "text-brand-blue" : "text-brand-ink"
              }`}
            >
              {txn.credit ? "+" : "−"}
              {naira(txn.amountKobo)}
            </div>
            <div className="text-[12px] text-brand-muted font-body mt-2">
              {new Date(txn.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="card px-4 py-1">
            <Row label="Category" value={txn.category.replace(/_/g, " ")} />
            <Row label="Type" value={txn.type} />
            <Row label="Status" value={txn.status} />
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted font-body shrink-0">
                Reference
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-mono font-medium text-brand-ink text-right break-all">
                  {txn.reference}
                </span>
                <button
                  type="button"
                  onClick={copyRef}
                  className="shrink-0 text-brand-blue p-1"
                  aria-label="Copy reference"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
