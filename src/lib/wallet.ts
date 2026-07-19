import { prisma } from "./prisma";
import { makeReference } from "./money";

/**
 * Atomic debit: only succeeds if balance is sufficient.
 * Creates a SUCCESS DEBIT transaction. Call provider after this; refund on failure.
 */
export async function debitWallet(params: {
  userId: string;
  amountKobo: number;
  category: string;
  label: string;
  meta?: Record<string, unknown>;
  reference?: string;
}): Promise<
  | { ok: true; reference: string; balanceAfterKobo: number; txnId: string }
  | { ok: false; error: string; code: "INSUFFICIENT_FUNDS" | "NOT_FOUND" | "INVALID" }
> {
  if (params.amountKobo <= 0) {
    return { ok: false, error: "Amount must be positive", code: "INVALID" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.updateMany({
        where: { userId: params.userId, balanceKobo: { gte: params.amountKobo } },
        data: { balanceKobo: { decrement: params.amountKobo } },
      });
      if (updated.count === 0) {
        const wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
        if (!wallet) return { kind: "not_found" as const };
        return { kind: "insufficient" as const };
      }

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: params.userId } });
      const reference = params.reference ?? makeReference();
      const txn = await tx.transaction.create({
        data: {
          userId: params.userId,
          type: "DEBIT",
          category: params.category,
          label: params.label,
          amountKobo: params.amountKobo,
          status: "SUCCESS",
          reference,
          meta: (params.meta ?? {}) as object,
        },
      });

      await tx.notification.create({
        data: {
          userId: params.userId,
          title: params.label,
          body: `Debited ₦${(params.amountKobo / 100).toLocaleString()}`,
        },
      });

      return {
        kind: "ok" as const,
        reference,
        balanceAfterKobo: wallet.balanceKobo,
        txnId: txn.id,
      };
    });

    if (result.kind === "not_found") {
      return { ok: false, error: "Wallet not found", code: "NOT_FOUND" };
    }
    if (result.kind === "insufficient") {
      return { ok: false, error: "Insufficient wallet balance", code: "INSUFFICIENT_FUNDS" };
    }
    return {
      ok: true,
      reference: result.reference,
      balanceAfterKobo: result.balanceAfterKobo,
      txnId: result.txnId,
    };
  } catch (e) {
    console.error("[wallet] debit failed", e);
    return { ok: false, error: "Debit failed", code: "INVALID" };
  }
}

/** Refund a previous debit after provider failure. */
export async function refundWallet(params: {
  userId: string;
  amountKobo: number;
  category: string;
  label: string;
  originalReference: string;
  meta?: Record<string, unknown>;
}) {
  return creditWallet({
    userId: params.userId,
    amountKobo: params.amountKobo,
    category: params.category,
    label: params.label,
    reference: `REFUND-${params.originalReference}`.slice(0, 48),
    meta: { ...(params.meta ?? {}), refundFor: params.originalReference },
  });
}

/**
 * Atomic credit with optional fixed reference (idempotent for PalmPay orderNo).
 */
export async function creditWallet(params: {
  userId: string;
  amountKobo: number;
  category: string;
  label: string;
  meta?: Record<string, unknown>;
  reference?: string;
}): Promise<
  | { ok: true; reference: string; balanceAfterKobo: number; txnId: string; duplicate: boolean }
  | { ok: false; error: string }
> {
  if (params.amountKobo <= 0) {
    return { ok: false, error: "Amount must be positive" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (params.reference) {
        const existing = await tx.transaction.findUnique({
          where: { reference: params.reference },
        });
        if (existing) {
          return {
            kind: "duplicate" as const,
            reference: existing.reference,
            balanceAfterKobo: 0,
            txnId: existing.id,
          };
        }
      }

      const wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
      if (!wallet) return { kind: "not_found" as const };

      const balanceAfter = wallet.balanceKobo + params.amountKobo;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceKobo: balanceAfter },
      });

      const reference = params.reference ?? makeReference();
      const txn = await tx.transaction.create({
        data: {
          userId: params.userId,
          type: "CREDIT",
          category: params.category,
          label: params.label,
          amountKobo: params.amountKobo,
          status: "SUCCESS",
          reference,
          meta: (params.meta ?? {}) as object,
        },
      });

      await tx.notification.create({
        data: {
          userId: params.userId,
          title: params.label,
          body: `₦${(params.amountKobo / 100).toLocaleString()} added to your wallet`,
        },
      });

      return {
        kind: "ok" as const,
        reference,
        balanceAfterKobo: balanceAfter,
        txnId: txn.id,
      };
    });

    if (result.kind === "not_found") {
      return { ok: false, error: "Wallet not found" };
    }
    if (result.kind === "duplicate") {
      return {
        ok: true,
        reference: result.reference,
        balanceAfterKobo: result.balanceAfterKobo,
        txnId: result.txnId,
        duplicate: true,
      };
    }
    return {
      ok: true,
      reference: result.reference,
      balanceAfterKobo: result.balanceAfterKobo,
      txnId: result.txnId,
      duplicate: false,
    };
  } catch (e) {
    // Unique constraint on reference → treat as duplicate
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg) && params.reference) {
      return {
        ok: true,
        reference: params.reference,
        balanceAfterKobo: 0,
        txnId: "",
        duplicate: true,
      };
    }
    console.error("[wallet] credit failed", e);
    return { ok: false, error: "Credit failed" };
  }
}

/** Mark a debit txn as FAILED after refund (optional bookkeeping). */
export async function markTxnFailed(reference: string, meta?: Record<string, unknown>) {
  try {
    await prisma.transaction.update({
      where: { reference },
      data: {
        status: "FAILED",
        meta: meta as object | undefined,
      },
    });
  } catch {
    // ignore if missing
  }
}
