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
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const styles =
    variant === "secondary"
      ? "btn-secondary"
      : variant === "danger"
        ? "btn-primary !bg-brand-red !shadow-none"
        : "btn-primary";

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={styles}>
      {children}
    </button>
  );
}
