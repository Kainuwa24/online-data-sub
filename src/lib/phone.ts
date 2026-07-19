/** Normalize Nigerian phone input to digits-only local form (e.g. 08034567890). */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    digits = `0${digits.slice(3)}`;
  }
  if (digits.startsWith("2340") && digits.length === 14) {
    digits = digits.slice(3);
  }
  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length === 11) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return phone;
}

export function isValidNgPhone(phone: string): boolean {
  const d = normalizePhone(phone);
  return /^0[789][01]\d{8}$/.test(d);
}
