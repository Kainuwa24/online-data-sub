import { prisma } from "@/lib/prisma";

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE" || normalized === "SUCCESS") return "bg-emerald-50 text-emerald-700";
  if (normalized === "FAILED" || normalized === "INACTIVE") return "bg-brand-redSoft text-brand-red";
  return "bg-amber-50 text-amber-800";
}

export default async function AdminVirtualAccountsPage() {
  const accounts = await prisma.virtualAccount.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { name: true, phone: true, email: true } } },
  });

  return (
    <div className="rounded-lg border border-brand-line bg-white shadow-soft">
      <div className="border-b border-brand-line p-4">
        <h2 className="text-xl font-bold text-brand-ink">Virtual accounts</h2>
        <p className="mt-1 text-sm text-brand-muted">Permanent funding accounts connected to customers.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-brand-ink">{account.user.name}</div>
                  <div className="text-xs text-brand-muted">{account.user.phone || account.user.email || "No contact"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-brand-ink">{account.accountNumber}</div>
                  <div className="text-xs text-brand-muted">{account.bankName} / {account.accountName}</div>
                </td>
                <td className="px-4 py-3 text-sm text-brand-muted">{account.provider}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(account.status)}`}>{account.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-brand-muted">{account.createdAt.toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
