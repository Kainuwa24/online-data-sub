export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-app">
      <div className="auth-app-inner animate-fade-up">
        <header className="auth-app-header">
          <div className="auth-app-mark" aria-hidden>
            <span>OD</span>
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[15px] tracking-tight text-brand-ink leading-none">
              Online Data Sub
            </div>
            <div className="text-[11px] text-brand-muted font-body mt-1">
              Data · Airtime · Bills
            </div>
          </div>
        </header>

        <main className="auth-app-main">
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-blue font-body mb-2">
              {eyebrow}
            </div>
          )}
          <h1 className="text-[30px] leading-[1.15] font-display font-extrabold text-brand-ink tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[14px] text-brand-muted font-body mt-2 leading-relaxed">
              {subtitle}
            </p>
          )}

          <div className="mt-8">{children}</div>
        </main>

        {footer && <footer className="auth-app-footer">{footer}</footer>}
      </div>
    </div>
  );
}
