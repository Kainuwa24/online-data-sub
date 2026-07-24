export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  density = "default",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  density?: "default" | "compact";
}) {
  return (
    <div className="auth-app">
      <div className={`auth-app-inner animate-fade-up ${density === "compact" ? "auth-app-inner-compact" : ""}`}>
        <header className="auth-app-header">
          <div className="auth-app-mark" aria-hidden>
            <img src="/app-logo.png" alt="" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[15px] tracking-tight text-brand-ink leading-none">
              Online Data Sub
            </div>
            <div className="text-[11px] text-brand-muted font-body mt-1">
              Data / Airtime / Bills
            </div>
          </div>
        </header>

        <main className="auth-app-main">
          {eyebrow && (
            <div className="auth-app-eyebrow text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-blue font-body mb-2">
              {eyebrow}
            </div>
          )}
          <h1 className="auth-app-title text-[30px] leading-[1.15] font-display font-extrabold text-brand-ink tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="auth-app-subtitle text-[14px] text-brand-muted font-body mt-2 leading-relaxed">
              {subtitle}
            </p>
          )}

          <div className="auth-app-content mt-8">{children}</div>
        </main>

        {footer && <footer className="auth-app-footer">{footer}</footer>}
      </div>
    </div>
  );
}