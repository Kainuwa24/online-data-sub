"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe fallback if used outside provider
    return {
      toast: (m: string) => console.log("[toast]", m),
      success: (m: string) => console.log("[toast:ok]", m),
      error: (m: string) => console.error("[toast:err]", m),
      info: (m: string) => console.log("[toast:info]", m),
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m) => toast(m, "success"),
      error: (m) => toast(m, "error"),
      info: (m) => toast(m, "info"),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-28 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {items.map((t) => (
          <ToastBubble key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(t);
  }, [onClose]);

  const styles =
    item.kind === "success"
      ? "bg-emerald-600"
      : item.kind === "error"
        ? "bg-brand-red"
        : "bg-brand-ink";

  const Icon =
    item.kind === "success" ? CheckCircle2 : item.kind === "error" ? XCircle : Info;

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 max-w-sm w-full rounded-2xl ${styles} text-white px-4 py-3 shadow-glow animate-fade-up`}
      role="status"
    >
      <Icon size={18} className="shrink-0 opacity-90" />
      <p className="flex-1 text-xs font-body font-medium leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 opacity-70 hover:opacity-100 p-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
