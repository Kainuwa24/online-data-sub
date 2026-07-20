"use client";

import { Delete } from "lucide-react";

export function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex justify-center gap-3.5 my-6">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
            i < filled
              ? "bg-brand-blue scale-110 shadow-[0_0_0_4px_rgba(44,90,160,0.15)]"
              : "bg-slate-200 dark:bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

export function NumPad({
  onPress,
  onBackspace,
}: {
  onPress: (digit: string) => void;
  onBackspace: () => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-3 px-4 sm:px-8">
      {keys.map((k, i) => {
        if (k === "") return <div key={i} />;
        if (k === "back") {
          return (
            <button
              key={i}
              type="button"
              onClick={onBackspace}
              className="h-14 flex items-center justify-center rounded-2xl text-brand-muted transition-colors active:bg-slate-100 dark:active:bg-slate-800"
              aria-label="Backspace"
            >
              <Delete size={20} strokeWidth={1.75} />
            </button>
          );
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPress(k)}
            className="h-14 rounded-2xl border border-brand-line bg-white text-xl font-display font-semibold text-brand-ink
              shadow-pin transition-all duration-150
              active:scale-95 active:bg-brand-blueSoft
              dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:active:bg-slate-800"
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
