import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || "").trim();
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { referralCode: { contains: q } },
        ],
      }
    : undefined;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      wallet: { select: { balanceKobo: true, updatedAt: true } },
      _count: { select: { transactions: true, notifications: true, virtualAccounts: true } },
    },
  });

  return (
    <div className="rounded-lg border border-brand-line bg-white shadow-soft">
      <div className="border-b border-brand-line p-4">
        <h2 className="text-xl font-bold text-brand-ink">Users</h2>
        <p className="mt-1 text-sm text-brand-muted">Search and inspect customer records without editing account data.</p>
        <form action="/admin/users" className="mt-4 flex max-w-xl gap-2">
          <input name="q" defaultValue={q} placeholder="Search name, phone, email, referral" className="min-w-0 flex-1 rounded-lg border border-brand-line px-3 py-2 text-sm outline-none" />
          <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Search</button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-brand-ink">{user.name}</div>
                  <div className="text-xs text-brand-muted">{user.referralCode}</div>
                </td>
                <td className="px-4 py-3 text-sm text-brand-muted">
                  <div>{user.phone || "No phone"}</div>
                  <div>{user.email || "No email"}</div>
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-brand-ink">{formatNaira(user.wallet?.balanceKobo || 0)}</td>
                <td className="px-4 py-3 text-xs text-brand-muted">
                  {user._count.transactions} txns / {user._count.virtualAccounts} VAs / {user._count.notifications} notes
                </td>
                <td className="px-4 py-3 text-xs text-brand-muted">{user.createdAt.toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
