import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "SUCCESS" || normalized === "PROCESSED") return "bg-emerald-50 text-emerald-700";
  if (normalized === "FAILED") return "bg-brand-redSoft text-brand-red";
  return "bg-amber-50 text-amber-800";
}

export default async function AdminTransactionsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const status = (searchParams.status || "ALL").trim().toUpperCase();
  const q = (searchParams.q || "").trim();

  const where = {
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { label: { contains: q } },
            { reference: { contains: q } },
            { category: { contains: q } },
            { user: { name: { contains: q } } },
            { user: { phone: { contains: q } } },
            { user: { email: { contains: q } } },
          ],
        }
      : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { name: true, phone: true, email: true } } },
  });

  return (
    <div className="rounded-lg border border-brand-line bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-brand-line p-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-ink">Transactions</h2>
          <p className="mt-1 text-sm text-brand-muted">Browse customer credits, debits, purchases, and funding records.</p>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row" action="/admin/transactions">
          <input name="q" defaultValue={q} placeholder="Search customer, reference, label" className="min-w-0 rounded-lg border border-brand-line px-3 py-2 text-sm outline-none sm:w-72" />
          <select name="status" defaultValue={status} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink outline-none">
            <option value="ALL">All status</option>
            <option value="PENDING">Pending</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>
          <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Apply</button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {transactions.map((txn) => (
              <tr key={txn.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-brand-ink">{txn.user.name}</div>
                  <div className="text-xs text-brand-muted">{txn.user.phone || txn.user.email || "No contact"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-brand-ink">{txn.label}</div>
                  <div className="text-xs text-brand-muted">{txn.category} / {txn.reference}</div>
                </td>
                <td className={txn.type === "CREDIT" ? "px-4 py-3 font-mono font-semibold text-brand-blue" : "px-4 py-3 font-mono font-semibold text-brand-red"}>
                  {txn.type === "CREDIT" ? "+" : "-"}{formatNaira(txn.amountKobo)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(txn.status)}`}>{txn.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-brand-muted">{txn.createdAt.toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
