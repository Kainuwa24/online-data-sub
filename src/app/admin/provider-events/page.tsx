import { AlertCircle, DatabaseZap } from "lucide-react";
import { prisma } from "@/lib/prisma";

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "SUCCESS" || normalized === "PROCESSED") return "bg-emerald-50 text-emerald-700";
  if (normalized === "FAILED") return "bg-brand-redSoft text-brand-red";
  return "bg-amber-50 text-amber-800";
}

export default async function AdminProviderEventsPage({ searchParams }: { searchParams: { provider?: string } }) {
  const provider = (searchParams.provider || "ALL").trim().toLowerCase();
  const where = provider !== "all" ? { provider } : undefined;

  const events = await prisma.providerEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div className="rounded-lg border border-brand-line bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-brand-line p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-ink">Provider events</h2>
          <p className="mt-1 text-sm text-brand-muted">Webhook ledger for wallet funding and provider callbacks.</p>
        </div>
        <form action="/admin/provider-events" className="flex gap-2">
          <select name="provider" defaultValue={provider} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none">
            <option value="all">All providers</option>
            <option value="palmpay">PalmPay</option>
            <option value="flutterwave">Flutterwave</option>
          </select>
          <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Apply</button>
        </form>
      </div>
      <div className="divide-y divide-brand-line">
        {events.map((event) => (
          <div key={event.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-brand-ink">{event.provider}</div>
                <div className="mt-1 text-xs text-brand-muted">{event.reference}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(event.status)}`}>{event.status}</span>
            </div>
            {event.failureReason ? (
              <div className="mt-3 flex gap-2 rounded-lg bg-brand-redSoft p-2 text-xs text-brand-red">
                <AlertCircle size={14} className="shrink-0" />
                {event.failureReason}
              </div>
            ) : null}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-brand-muted">
              <DatabaseZap size={13} />
              {event.processedAt ? `Processed ${event.processedAt.toLocaleString("en-NG")}` : "Not processed yet"} / Created {event.createdAt.toLocaleString("en-NG")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
