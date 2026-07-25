import { comparePin } from "@/lib/auth";
import type { User } from "@prisma/client";

/**
 * Verify the user's 4-digit PIN before wallet debits / purchases.
 * Returns null if OK, or an error message.
 */
export async function verifyUserPin(
  user: Pick<User, "pinHash">,
  pin: unknown,
): Promise<string | null> {
  const value = String(pin ?? "");
  if (!/^\d{4}$/.test(value)) {
    return "Enter your 4-digit PIN to confirm";
  }
  if (!user.pinHash) {
    return "No PIN set on this account. Finish setup first.";
  }
  const ok = await comparePin(value, user.pinHash);
  if (!ok) return "Incorrect PIN";
  return null;
}

/**
 * Transaction confirm: either a correct 4-digit PIN, or client-verified biometrics
 * (device already checked fingerprint/face; session cookie still required).
 */
export async function verifyTransactionAuth(
  user: Pick<User, "pinHash">,
  body: { pin?: unknown; confirmWithBiometric?: unknown },
): Promise<string | null> {
  if (body.confirmWithBiometric === true) {
    // Caller must already be authenticated via session.
    return null;
  }
  return verifyUserPin(user, body.pin);
}
