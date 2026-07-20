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
    <div className="min-h-screen px-5 py-8 sm:py-12">
      <div className="max-w-md mx-auto animate-fade-up">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-blueDark shadow-glow flex items-center justify-center">
            <span className="text-white text-xs font-display font-extrabold">OD</span>
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-brand-ink">
            Online Data Sub
          </span>
        </div>

        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-blue font-body mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[28px] leading-tight font-display font-extrabold text-brand-ink tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-brand-muted font-body mt-2 leading-relaxed">{subtitle}</p>
        )}

        <div className="auth-panel mt-7">{children}</div>

        {footer && <div className="mt-6 text-center text-xs text-brand-muted font-body">{footer}</div>}
      </div>
    </div>
  );
}
