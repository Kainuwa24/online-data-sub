import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function AdminReferralsPage() {
  const referrals = await prisma.referral.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const userIds = Array.from(new Set(referrals.flatMap((referral) => [referral.referrerId, referral.referredId])));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, phone: true, email: true, referralCode: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  return (
    <div className="rounded-lg border border-brand-line bg-white shadow-soft">
      <div className="border-b border-brand-line p-4">
        <h2 className="text-xl font-bold text-brand-ink">Referrals</h2>
        <p className="mt-1 text-sm text-brand-muted">Referral relationships and recorded bonus values.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="px-4 py-3">Referrer</th>
              <th className="px-4 py-3">Referred user</th>
              <th className="px-4 py-3">Bonus</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {referrals.map((referral) => {
              const referrer = userById.get(referral.referrerId);
              const referred = userById.get(referral.referredId);

              return (
                <tr key={referral.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-brand-ink">{referrer?.name || referral.referrerId}</div>
                    <div className="text-xs text-brand-muted">{referrer?.referralCode || referrer?.phone || referrer?.email || "No contact"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-brand-ink">{referred?.name || referral.referredId}</div>
                    <div className="text-xs text-brand-muted">{referred?.phone || referred?.email || "No contact"}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-brand-ink">{formatNaira(referral.bonusKobo)}</td>
                  <td className="px-4 py-3 text-xs text-brand-muted">{referral.createdAt.toLocaleString("en-NG")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
