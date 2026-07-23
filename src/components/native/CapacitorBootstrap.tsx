"use client";

import { useEffect } from "react";

/**
 * Best-effort native polish when the web app runs inside the Capacitor WebView.
 * Safe no-ops in the browser (dynamic import + isNativePlatform).
 */
export function CapacitorBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform()) return;

        const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/app"),
        ]);

        await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
        await StatusBar.setBackgroundColor({ color: "#F7F8FA" }).catch(() => undefined);
        await SplashScreen.hide().catch(() => undefined);

        // Android back button: leave the WebView app when at root-ish routes
        const back = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
            return;
          }
          void App.exitApp();
        });

        return () => {
          void back.remove();
        };
      } catch {
        // Browser or plugins unavailable
      }
    }

    let cleanup: void | (() => void);
    void setup().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
