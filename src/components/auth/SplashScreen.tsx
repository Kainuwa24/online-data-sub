"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SPLASH_MS = 1900;

/**
 * Brand splash: logo + tagline, then route on.
 * nextPath is resolved on the server from the session cookie.
 */
export function SplashScreen({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(nextPath);
    }, SPLASH_MS);
    return () => clearTimeout(t);
  }, [router, nextPath]);

  return (
    <div className="splash-screen" data-testid="screen-splash">
      <div className="splash-logo-wrap">
        <div className="splash-ring" />
        <div className="splash-ring" />
        <div className="splash-mark" aria-hidden>
          <img src="/app-logo.png" alt="" />
        </div>
      </div>

      <div className="splash-title">
        <span className="text-brand-blue">Online</span>
        <span className="text-brand-red">Data</span>
        <span className="text-brand-ink">Sub</span>
      </div>
      <p className="splash-tagline">Data / Airtime / Bills / Watch</p>
    </div>
  );
}