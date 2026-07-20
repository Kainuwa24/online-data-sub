/**
 * Nigerian mobile phone helpers.
 * Canonical form: local 11-digit `0[789][01]XXXXXXXX` (e.g. 08034567890).
 */

/** Strip to digits; convert +234 / 234 to leading 0. */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");

  // 234803… → 0803…
  if (digits.startsWith("234") && digits.length >= 13) {
    digits = `0${digits.slice(3)}`;
  }
  // 2340… rare double-zero
  if (digits.startsWith("2340") && digits.length >= 14) {
    digits = digits.slice(3);
  }
  // Cap at 11 for local form (extra digits ignored while typing past)
  if (digits.length > 11 && digits.startsWith("0")) {
    digits = digits.slice(0, 11);
  }
  // If user typed 803… without leading 0 (10 digits mobile body), prepend 0
  if (/^[789][01]\d{8}$/.test(digits)) {
    digits = `0${digits}`;
  }

  return digits;
}

/** Live format for the input: 0803 456 7890 */
export function formatPhoneInput(input: string): string {
  const d = normalizePhone(input);
  if (!d) return "";
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 11)}`;
}

export function formatPhoneDisplay(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length === 11) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return phone;
}

/** MTN/Airtel/Glo/9mobile-style prefixes: 070, 080, 081, 090, 091, etc. */
export function isValidNgPhone(phone: string): boolean {
  const d = normalizePhone(phone);
  return /^0[789][01]\d{8}$/.test(d);
}

export type PhoneValidation =
  | { ok: true; phone: string }
  | { ok: false; error: string };

/**
 * Validate for forms / APIs with a clear user-facing message.
 * Empty is invalid unless `required: false`.
 */
export function validateNgPhone(
  input: string,
  opts?: { required?: boolean; label?: string },
): PhoneValidation {
  const required = opts?.required !== false;
  const label = opts?.label || "Phone number";
  const trimmed = input.trim();

  if (!trimmed) {
    if (!required) return { ok: true, phone: "" };
    return { ok: false, error: `${label} is required` };
  }

  const phone = normalizePhone(trimmed);
  const rawDigits = trimmed.replace(/\D/g, "");

  if (rawDigits.length < 10) {
    return { ok: false, error: `${label} is too short` };
  }
  if (phone.length < 11) {
    return { ok: false, error: `Enter a full 11-digit number (e.g. 0803 456 7890)` };
  }
  if (!phone.startsWith("0")) {
    return { ok: false, error: `${label} should start with 0 or +234` };
  }
  if (!/^0[789]/.test(phone)) {
    return {
      ok: false,
      error: `${label} looks wrong — use a Nigerian mobile (070, 080, 081, 090, 091…)`,
    };
  }
  if (!/^0[789][01]/.test(phone)) {
    return {
      ok: false,
      error: `${label} prefix is invalid`,
    };
  }
  if (!isValidNgPhone(phone)) {
    return {
      ok: false,
      error: `Enter a valid Nigerian mobile number`,
    };
  }

  return { ok: true, phone };
}

/** Termii / international E.164-ish: 234803… */
export function toInternationalNg(phone: string): string {
  const d = normalizePhone(phone);
  if (d.startsWith("0") && d.length === 11) return `234${d.slice(1)}`;
  return d;
}
