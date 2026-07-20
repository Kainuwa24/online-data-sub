"use client";

import { useState } from "react";
import {
  formatPhoneInput,
  normalizePhone,
  validateNgPhone,
} from "@/lib/phone";

export function PhoneField({
  label = "Phone number",
  placeholder = "0803 456 7890",
  value,
  onChange,
  onValidChange,
  error: externalError,
  disabled,
  autoFocus,
  helperText = "Nigerian mobile · 11 digits (070, 080, 081, 090…)",
}: {
  label?: string;
  placeholder?: string;
  /** Digits (normalized) or formatted — component normalizes either way */
  value: string;
  /** Always receives normalized digits (e.g. 08034567890) */
  onChange: (normalized: string) => void;
  /** Fired when validity flips; optional */
  onValidChange?: (valid: boolean) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  helperText?: string | null;
}) {
  const [touched, setTouched] = useState(false);
  const display = formatPhoneInput(value);
  const validation = validateNgPhone(value, { label, required: true });
  const showError =
    Boolean(externalError) || (touched && !validation.ok && value.length > 0);
  const errorMsg = externalError || (!validation.ok ? validation.error : "");

  function handleChange(raw: string) {
    // Allow only + / digits / spaces while typing; store normalized
    const cleaned = raw.replace(/[^\d+\s-]/g, "");
    const normalized = normalizePhone(cleaned);
    // Cap input length (11 local digits)
    const capped =
      normalized.length > 11 ? normalized.slice(0, 11) : normalized;
    onChange(capped);
    onValidChange?.(validateNgPhone(capped).ok);
  }

  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
        {label}
      </label>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          setTouched(true);
          onValidChange?.(validateNgPhone(value).ok);
        }}
        maxLength={14} // "0803 456 7890"
        aria-invalid={showError}
        aria-describedby={showError ? "phone-error" : helperText ? "phone-help" : undefined}
        className={`input-premium ${
          showError
            ? "!border-brand-red/50 focus:!border-brand-red focus:!ring-brand-red/15"
            : validation.ok && value.length === 11
              ? "!border-emerald-500/40"
              : ""
        }`}
      />
      {showError ? (
        <p id="phone-error" className="mt-1.5 text-[11px] font-body text-brand-red font-medium">
          {errorMsg}
        </p>
      ) : helperText ? (
        <p id="phone-help" className="mt-1.5 text-[11px] font-body text-brand-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
