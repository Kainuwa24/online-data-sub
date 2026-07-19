"use client";

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  const base = "w-full rounded-2xl py-3.5 text-sm font-bold font-body transition-opacity";
  const styles =
    variant === "primary"
      ? "bg-brand-blue text-white disabled:bg-gray-300 disabled:text-gray-500"
      : "bg-transparent border border-gray-200 text-gray-900 dark:text-white dark:border-gray-700";

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
