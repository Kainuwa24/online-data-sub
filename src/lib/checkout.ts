/**
 * Pending purchase hand-off between product screens and /confirm.
 * Stored in sessionStorage so the confirm page can show full details.
 */

export type CheckoutPayload =
  | {
      kind: "data";
      network: string;
      variationCode: string;
      planLabel: string;
      size: string;
      validity: string;
      priceKobo: number;
      recipientPhone: string;
    }
  | {
      kind: "airtime";
      network: string;
      amountKobo: number;
      recipientPhone: string;
    }
  | {
      kind: "bill";
      category: string;
      billerName: string;
      serviceID: string;
      variationCode?: string;
      accountNumber: string;
      amountKobo: number;
    };

const KEY = "ods_checkout_pending";

export function saveCheckout(payload: CheckoutPayload) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadCheckout(): CheckoutPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutPayload;
  } catch {
    return null;
  }
}

export function clearCheckout() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function checkoutTitle(p: CheckoutPayload): string {
  if (p.kind === "data") return `${p.network} data`;
  if (p.kind === "airtime") return `${p.network} airtime`;
  return p.billerName || "Bill payment";
}

export function checkoutAmountKobo(p: CheckoutPayload): number {
  return p.kind === "bill" || p.kind === "airtime" ? p.amountKobo : p.priceKobo;
}
