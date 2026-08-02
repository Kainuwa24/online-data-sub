import { revalidatePath } from "next/cache";
import { canApproveWalletAdjustments, requireAdminUser, writeAdminAudit } from "@/lib/admin";
import { formatNaira, makeReference, parseAmountToKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type SearchParams = { status?: string; q?: string };

function statusClass(status: string) {
  if (status === "APPLIED") return "bg-emerald-50 text-emerald-700";
  if (status === "APPROVED") return "bg-brand-blueSoft text-brand-blue";
  if (status === "REJECTED") return "bg-brand-redSoft text-brand-red";
  return "bg-amber-50 text-amber-800";
}

async function createAdjustment(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("OPERATOR");
  const userQuery = String(formData.get("user") || "").trim();
  const type = String(formData.get("type") || "").trim().toUpperCase();
  const amount = String(formData.get("amount") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const evidence = String(formData.get("evidence") || "").trim();

  if (!userQuery || !reason || !amount) throw new Error("User, amount, and reason are required");
  if (type !== "CREDIT" && type !== "DEBIT") throw new Error("Invalid adjustment type");

  const amountKobo = parseAmountToKobo(amount);
  if (amountKobo <= 0) throw new Error("Amount must be positive");

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userQuery },
        { phone: userQuery },
        { email: userQuery.toLowerCase() },
        { referralCode: userQuery.toUpperCase() },
      ],
    },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (!user) throw new Error("User not found");

  const adjustment = await prisma.walletAdjustment.create({
    data: {
      userId: user.id,
      type,
      amountKobo,
      reason,
      evidence: evidence || null,
      reference: makeReference("ADJ"),
      status: "PENDING",
      createdByAdminId: access.id,
    },
  });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: "WALLET_ADJUSTMENT_CREATE",
    targetType: "WalletAdjustment",
    targetId: adjustment.id,
    after: adjustment,
    metadata: { user },
  });

  revalidatePath("/admin/adjustments");
}

async function approveAdjustment(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("FINANCE");
  const id = String(formData.get("id") || "");
  const current = await prisma.walletAdjustment.findUnique({ where: { id } });
  if (!current || current.status !== "PENDING") throw new Error("Adjustment is not pending");

  const ownerSelfApproval = current.createdByAdminId === access.id && access.role === "OWNER";
  if (current.createdByAdminId === access.id && !ownerSelfApproval) {
    throw new Error("Creator cannot approve their own adjustment");
  }

  const updated = await prisma.walletAdjustment.update({
    where: { id },
    data: { status: "APPROVED", approvedByAdminId: access.id, approvedAt: new Date() },
  });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: ownerSelfApproval ? "WALLET_ADJUSTMENT_OWNER_SELF_APPROVE" : "WALLET_ADJUSTMENT_APPROVE",
    targetType: "WalletAdjustment",
    targetId: id,
    before: current,
    after: updated,
    metadata: { ownerSelfApproval },
  });

  revalidatePath("/admin/adjustments");
}

async function rejectAdjustment(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("FINANCE");
  const id = String(formData.get("id") || "");
  const rejectionReason = String(formData.get("rejectionReason") || "").trim();
  const current = await prisma.walletAdjustment.findUnique({ where: { id } });
  if (!current || current.status !== "PENDING") throw new Error("Adjustment is not pending");
  if (!rejectionReason) throw new Error("Rejection reason is required");

  const updated = await prisma.walletAdjustment.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedByAdminId: access.id,
      rejectedAt: new Date(),
      rejectionReason,
    },
  });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: "WALLET_ADJUSTMENT_REJECT",
    targetType: "WalletAdjustment",
    targetId: id,
    before: current,
    after: updated,
  });

  revalidatePath("/admin/adjustments");
}

async function applyAdjustment(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("FINANCE");
  const id = String(formData.get("id") || "");
  const current = await prisma.walletAdjustment.findUnique({ where: { id } });
  if (!current || current.status !== "APPROVED") throw new Error("Adjustment must be approved before applying");

  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.walletAdjustment.findUnique({ where: { id } });
    if (!fresh || fresh.status !== "APPROVED") throw new Error("Adjustment is no longer approved");

    const wallet = await tx.wallet.findUnique({ where: { userId: fresh.userId } });
    if (!wallet) throw new Error("Wallet not found");

    const nextBalance = fresh.type === "CREDIT" ? wallet.balanceKobo + fresh.amountKobo : wallet.balanceKobo - fresh.amountKobo;
    if (nextBalance < 0) throw new Error("Insufficient wallet balance for debit adjustment");

    await tx.wallet.update({ where: { id: wallet.id }, data: { balanceKobo: nextBalance } });
    const transaction = await tx.transaction.create({
      data: {
        userId: fresh.userId,
        type: fresh.type,
        category: "admin_adjustment",
        label: fresh.type === "CREDIT" ? "Admin wallet credit" : "Admin wallet debit",
        amountKobo: fresh.amountKobo,
        status: "SUCCESS",
        reference: fresh.reference,
        meta: JSON.stringify({ walletAdjustmentId: fresh.id, reason: fresh.reason, evidence: fresh.evidence }),
      },
    });
    await tx.notification.create({
      data: {
        userId: fresh.userId,
        title: fresh.type === "CREDIT" ? "Wallet adjustment credited" : "Wallet adjustment debited",
        body: `${formatNaira(fresh.amountKobo)} ${fresh.type === "CREDIT" ? "added to" : "removed from"} your wallet`,
      },
    });
    const updated = await tx.walletAdjustment.update({
      where: { id: fresh.id },
      data: {
        status: "APPLIED",
        appliedByAdminId: access.id,
        appliedAt: new Date(),
        appliedTransactionId: transaction.id,
      },
    });

    return { before: fresh, after: updated, transaction };
  });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: "WALLET_ADJUSTMENT_APPLY",
    targetType: "WalletAdjustment",
    targetId: id,
    before: result.before,
    after: result.after,
    metadata: { transactionId: result.transaction.id, reference: result.transaction.reference },
  });

  revalidatePath("/admin/adjustments");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/transactions");
}

export default async function AdminAdjustmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { access } = await requireAdminUser();
  const status = (searchParams.status || "ALL").trim().toUpperCase();
  const q = (searchParams.q || "").trim();
  const canApprove = canApproveWalletAdjustments(access.role);

  const where = {
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { reason: { contains: q } },
            { userId: q },
          ],
        }
      : {}),
  };

  const adjustments = await prisma.walletAdjustment.findMany({ where, orderBy: { createdAt: "desc" }, take: 80 });
  const userIds = Array.from(new Set(adjustments.map((item) => item.userId)));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true, email: true } });
  const userById = new Map(users.map((user) => [user.id, user]));

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
        <h2 className="text-xl font-bold text-brand-ink">Wallet adjustments</h2>
        <p className="mt-1 text-sm text-brand-muted">Create pending wallet credits/debits. A finance admin must approve before the adjustment can be applied.</p>

        <form action={createAdjustment} className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_1.5fr_1.5fr_auto]">
          <input name="user" placeholder="User ID, phone, email, referral" className="rounded-lg border border-brand-line px-3 py-2 text-sm outline-none" required />
          <select name="type" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none" defaultValue="CREDIT">
            <option value="CREDIT">Credit</option>
            <option value="DEBIT">Debit</option>
          </select>
          <input name="amount" placeholder="Amount NGN" className="rounded-lg border border-brand-line px-3 py-2 text-sm outline-none" required />
          <input name="reason" placeholder="Reason" className="rounded-lg border border-brand-line px-3 py-2 text-sm outline-none" required />
          <input name="evidence" placeholder="Evidence/reference note" className="rounded-lg border border-brand-line px-3 py-2 text-sm outline-none" />
          <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Create</button>
        </form>
      </div>

      <div className="rounded-lg border border-brand-line bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-brand-line p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-bold text-brand-ink">Adjustment queue</h3>
            <p className="text-xs text-brand-muted">Creator cannot approve their own request unless they are an owner/superuser.</p>
          </div>
          <form action="/admin/adjustments" className="flex flex-col gap-2 sm:flex-row">
            <input name="q" defaultValue={q} placeholder="Search reference or reason" className="min-w-0 rounded-lg border border-brand-line px-3 py-2 text-sm outline-none sm:w-72" />
            <select name="status" defaultValue={status} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none">
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="APPLIED">Applied</option>
            </select>
            <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Filter</button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Adjustment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-brand-muted">
                    No wallet adjustments match this filter.
                  </td>
                </tr>
              ) : (
                adjustments.map((adjustment) => {
                  const user = userById.get(adjustment.userId);
                  const ownRequest = adjustment.createdByAdminId === access.id && access.role !== "OWNER";

                  return (
                    <tr key={adjustment.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-brand-ink">{user?.name || adjustment.userId}</div>
                        <div className="mt-0.5 text-xs text-brand-muted">{user?.phone || user?.email || "No contact"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-brand-ink">{adjustment.reason}</div>
                        <div className="mt-0.5 text-xs text-brand-muted">{adjustment.reference}</div>
                        {adjustment.evidence ? <div className="mt-1 text-xs text-brand-muted">Evidence: {adjustment.evidence}</div> : null}
                        {adjustment.rejectionReason ? <div className="mt-1 text-xs font-semibold text-brand-red">Rejected: {adjustment.rejectionReason}</div> : null}
                      </td>
                      <td className={adjustment.type === "CREDIT" ? "px-4 py-3 font-mono font-semibold text-brand-blue" : "px-4 py-3 font-mono font-semibold text-brand-red"}>
                        {adjustment.type === "CREDIT" ? "+" : "-"}{formatNaira(adjustment.amountKobo)}
                        <div className="mt-0.5 text-[11px] font-sans font-semibold uppercase text-brand-muted">{adjustment.type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(adjustment.status)}`}>{adjustment.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-muted">
                        {adjustment.createdAt.toLocaleString("en-NG")}
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-muted">
                        {adjustment.approvedAt ? <div>Approved {adjustment.approvedAt.toLocaleString("en-NG")}</div> : null}
                        {adjustment.rejectedAt ? <div>Rejected {adjustment.rejectedAt.toLocaleString("en-NG")}</div> : null}
                        {adjustment.appliedAt ? <div>Applied {adjustment.appliedAt.toLocaleString("en-NG")}</div> : null}
                        {!adjustment.approvedAt && !adjustment.rejectedAt && !adjustment.appliedAt ? <div>-</div> : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="ml-auto flex w-80 max-w-full flex-col gap-2">
                          {canApprove && adjustment.status === "PENDING" ? (
                            <div className="flex gap-2">
                              <form action={approveAdjustment} className="w-24 shrink-0">
                                <input type="hidden" name="id" value={adjustment.id} />
                                <button disabled={ownRequest} className="h-9 w-full rounded-lg bg-brand-blue px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                                  Approve
                                </button>
                              </form>
                              <form action={rejectAdjustment} className="flex min-w-0 flex-1 gap-2">
                                <input type="hidden" name="id" value={adjustment.id} />
                                <input name="rejectionReason" placeholder="Reject reason" className="min-w-0 flex-1 rounded-lg border border-brand-line px-2 text-xs outline-none" />
                                <button className="h-9 rounded-lg bg-brand-red px-3 text-xs font-semibold text-white">Reject</button>
                              </form>
                            </div>
                          ) : null}

                          {canApprove && adjustment.status === "APPROVED" ? (
                            <form action={applyAdjustment} className="ml-auto w-40">
                              <input type="hidden" name="id" value={adjustment.id} />
                              <button className="h-9 w-full rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white">Apply to wallet</button>
                            </form>
                          ) : null}

                          {(!canApprove || (adjustment.status !== "PENDING" && adjustment.status !== "APPROVED")) ? (
                            <div className="text-right text-xs text-brand-muted">No action</div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
