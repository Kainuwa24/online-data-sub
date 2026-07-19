"use client";

export function TextField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 text-[11px] font-body text-gray-500">{label}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-body text-gray-900 outline-none dark:bg-gray-900 dark:border-gray-700 dark:text-white"
      />
    </div>
  );
}
