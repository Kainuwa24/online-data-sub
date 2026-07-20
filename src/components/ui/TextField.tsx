"use client";

export function TextField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  error,
  disabled,
  readOnly,
  helperText,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  helperText?: string;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`input-premium ${
          error ? "!border-brand-red/50 focus:!border-brand-red focus:!ring-brand-red/15" : ""
        } ${readOnly || disabled ? "opacity-70 bg-slate-50" : ""}`}
      />
      {error ? (
        <p className="mt-1.5 text-[11px] font-body text-brand-red font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-[11px] font-body text-brand-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
