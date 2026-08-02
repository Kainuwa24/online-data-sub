import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function AdminWalletsPage() {
  const wallets = await prisma.wallet.findMany({
    orderBy: { updatedAt: "desc" },
    take: 80,
    include: {
      user: { select: { name: true, phone: true, email: true, createdAt: true } },
    },
  });

  const total = wallets.reduce((sum, wallet) => sum + wallet.balanceKobo, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Listed wallet liability</div>
          <div className="mt-2 text-2xl font-bold text-brand-ink">{formatNaira(total)}</div>
          <p className="mt-1 text-xs text-brand-muted">Top {wallets.length} wallets by most recent update.</p>
        </div>
      </div>

      <div className="rounded-lg border border-brand-line bg-white shadow-soft">
        <div className="border-b border-brand-line p-4">
          <h2 className="text-xl font-bold text-brand-ink">Wallets</h2>
          <p className="mt-1 text-sm text-brand-muted">Read-only balances before adjustment approval controls are added.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {wallets.map((wallet) => (
                <tr key={wallet.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-brand-ink">{wallet.user.name}</div>
                    <div className="text-xs text-brand-muted">{wallet.user.phone || wallet.user.email || "No contact"}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-brand-ink">{formatNaira(wallet.balanceKobo)}</td>
                  <td className="px-4 py-3 text-xs text-brand-muted">{wallet.updatedAt.toLocaleString("en-NG")}</td>
                  <td className="px-4 py-3 text-xs text-brand-muted">{wallet.user.createdAt.toLocaleString("en-NG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
