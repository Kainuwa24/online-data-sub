"use client";

import { AppCacheProvider } from "@/components/app/AppCacheProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CapacitorBootstrap } from "@/components/native/CapacitorBootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppCacheProvider>
        <CapacitorBootstrap />
        {children}
      </AppCacheProvider>
    </ToastProvider>
  );
}
