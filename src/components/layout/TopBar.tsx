"use client";

export function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-2">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-gray-400 font-body">{subtitle}</div>
        <div className="text-xl font-display font-bold mt-0.5">{title}</div>
      </div>
      <div className="h-8 w-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-display font-bold">
        Z
      </div>
    </div>
  );
}
