"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const MAX_PULL = 86;
const TRIGGER_PULL = 64;

function dampen(distance: number) {
  return Math.min(MAX_PULL, distance * 0.55);
}

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const startY = useRef(0);
  const distanceRef = useRef(0);
  const pulling = useRef(false);
  const [distance, setDistanceState] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function setDistance(value: number) {
    distanceRef.current = value;
    setDistanceState(value);
  }

  useEffect(() => {
    function onTouchStart(event: TouchEvent) {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      startY.current = event.touches[0]?.clientY ?? 0;
      pulling.current = true;
    }

    function onTouchMove(event: TouchEvent) {
      if (!pulling.current || refreshing) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startY.current;

      if (delta <= 0 || window.scrollY > 0) {
        setDistance(0);
        return;
      }

      if (event.cancelable) event.preventDefault();
      setDistance(dampen(delta));
    }

    function onTouchEnd() {
      if (!pulling.current || refreshing) return;
      pulling.current = false;

      if (distanceRef.current >= TRIGGER_PULL) {
        setRefreshing(true);
        setDistance(TRIGGER_PULL);
        window.setTimeout(() => {
          window.location.reload();
        }, 180);
        return;
      }

      setDistance(0);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [refreshing]);

  const active = distance > 0 || refreshing;
  const ready = distance >= TRIGGER_PULL || refreshing;

  return (
    <div className="pull-refresh-root">
      <div
        className={`pull-refresh-indicator ${active ? "opacity-100" : "opacity-0"}`}
        style={{ transform: `translate(-50%, ${Math.max(0, distance - 48)}px)` }}
      >
        <RefreshCw
          size={18}
          className={refreshing ? "animate-spin" : ready ? "rotate-180" : ""}
        />
      </div>
      <div
        className={`pull-refresh-content${active ? " is-pulling" : ""}`}
        style={{
          // Only apply transform while pulling/refreshing so fixed children
          // (if any) stay viewport-relative when idle.
          transform: active ? `translateY(${distance}px)` : undefined,
          transition: pulling.current ? "none" : "transform 180ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
