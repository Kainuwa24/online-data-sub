"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const MAX_PULL = 86;
const TRIGGER_PULL = 64;
/** Ignore tiny movements so normal scrolling is never blocked */
const ACTIVATE_PULL = 12;

function dampen(distance: number) {
  return Math.min(MAX_PULL, distance * 0.55);
}

function scrollTop() {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

/**
 * Pull-to-refresh that only captures the gesture after a clear downward pull
 * at the very top of the page — so normal home scrolling is not blocked.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const startY = useRef(0);
  const startX = useRef(0);
  const distanceRef = useRef(0);
  const tracking = useRef(false);
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
      if (scrollTop() > 0) return;
      const touch = event.touches[0];
      if (!touch) return;
      startY.current = touch.clientY;
      startX.current = touch.clientX;
      tracking.current = true;
      pulling.current = false;
    }

    function onTouchMove(event: TouchEvent) {
      if (!tracking.current || refreshing) return;
      const touch = event.touches[0];
      if (!touch) return;

      // User started scrolling the page — abort pull
      if (scrollTop() > 0) {
        tracking.current = false;
        pulling.current = false;
        setDistance(0);
        return;
      }

      const deltaY = touch.clientY - startY.current;
      const deltaX = touch.clientX - startX.current;

      // Horizontal swipe (or upward) — let the browser handle scroll/gestures
      if (!pulling.current) {
        if (deltaY < ACTIVATE_PULL) return;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          tracking.current = false;
          return;
        }
        pulling.current = true;
      }

      if (deltaY <= 0) {
        pulling.current = false;
        setDistance(0);
        return;
      }

      // Only preventDefault once we are actually pulling down at the top
      if (event.cancelable) event.preventDefault();
      setDistance(dampen(deltaY));
    }

    function onTouchEnd() {
      if (!tracking.current) return;
      tracking.current = false;
      const wasPulling = pulling.current;
      pulling.current = false;

      if (!wasPulling || refreshing) {
        setDistance(0);
        return;
      }

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
        aria-hidden={!active}
      >
        <RefreshCw
          size={18}
          className={refreshing ? "animate-spin" : ready ? "rotate-180" : ""}
        />
      </div>
      <div
        className={`pull-refresh-content${active ? " is-pulling" : ""}`}
        style={{
          transform: active ? `translateY(${distance}px)` : undefined,
          transition: pulling.current ? "none" : "transform 180ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
