"use client";

import { AppCacheProvider } from "@/components/app/AppCacheProvider";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppCacheProvider>{children}</AppCacheProvider>
    </ToastProvider>
  );
}
