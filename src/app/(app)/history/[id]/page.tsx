"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check } from "lucide-react";

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

  useEffect(() => {
    if (!id) return;
    fetch(`/api/wallet/transactions/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Not found");
        setTxn(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  async function copyRef() {
    if (!txn?.reference) return;
    await navigator.clipboard.writeText(txn.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="animate-fade-up px-5 pt-6 pb-28">
      <button
        type="button"
        onClick={() => router.push("/history")}
        className="flex items-center gap-1.5 text-xs text-brand-muted font-body mb-5"
      >
        <ArrowLeft size={14} /> Back to history
      </button>

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
