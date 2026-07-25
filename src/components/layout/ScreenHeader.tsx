"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function ScreenHeader({
  title,
  backHref,
  onBack,
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
}) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  }

  return (
    <header className="sticky-app-header screen-header-pad flex items-center gap-3 px-5 pb-3">
      <button
        type="button"
        onClick={handleBack}
        className="h-10 w-10 rounded-2xl bg-white border border-brand-line shadow-soft flex items-center justify-center text-brand-ink"
        aria-label="Back"
      >
        <ArrowLeft size={18} strokeWidth={1.75} />
      </button>
      <h1 className="text-lg font-display font-bold text-brand-ink tracking-tight">{title}</h1>
    </header>
  );
}
