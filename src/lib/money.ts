/** Store and compute money in kobo (integer). */

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/** Format kobo as ₦ display string. */
export function formatNaira(kobo: number): string {
  return `₦${koboToNaira(kobo).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format plan price like "1,400" (no decimals if whole naira). */
export function formatPlanPrice(kobo: number): string {
  const naira = koboToNaira(kobo);
  if (Number.isInteger(naira)) {
    return naira.toLocaleString("en-NG");
  }
  return naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse "1,400" or "5000" or "5,000.00" to kobo. */
export function parseAmountToKobo(input: string | number): number {
  if (typeof input === "number") return nairaToKobo(input);
  const cleaned = input.replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Invalid amount");
  }
  return nairaToKobo(n);
}

export function makeReference(prefix = "ODS"): string {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${ts}${rand}`.slice(0, 16);
}
