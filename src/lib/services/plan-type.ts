/** Normalize vendor plan-type labels for filters (SME, GIFTING, …). */

export function normalizePlanType(raw: string | undefined | null): string {
  if (!raw?.trim()) return "STANDARD";
  const s = raw.trim().toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

  if (/\bSME\s*2\b|\bSME2\b/.test(s)) return "SME2";
  if (/\bSME\b/.test(s) && !/CORPORATE/.test(s)) return "SME";
  if (/CORPORATE\s*GIFT|CORP\s*GIFT|CORPORATE/.test(s)) return "CORPORATE GIFTING";
  if (/\bAWOOF\b/.test(s)) return "AWOOF DATA";
  if (/\bGIFTING\b|\bGIFT\b/.test(s)) return "GIFTING";
  if (/\bCG\b/.test(s)) return "CORPORATE GIFTING";
  if (/\bSTANDARD\b|\bREGULAR\b|\bDIRECT\b/.test(s)) return "STANDARD";

  if (/\d+\s*(GB|MB)/i.test(s) || /\d+\s*DAY/i.test(s)) return "STANDARD";

  if (s.length <= 24 && !/\d/.test(s)) return s;
  return "STANDARD";
}
