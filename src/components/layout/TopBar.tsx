"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAppCache } from "@/components/app/AppCacheProvider";

export function TopBar({
  title,
  subtitle,
  initial,
}: {
  title: string;
  subtitle: string;
  initial?: string;
}) {
  const { unreadCount, setUnreadCount } = useAppCache();
  const letter = (initial || title || "U").trim().charAt(0).toUpperCase();
  const [unread, setUnread] = useState(unreadCount ?? 0);

  useEffect(() => {
    setUnread(unreadCount ?? 0);
  }, [unreadCount]);

  useEffect(() => {
    let cancelled = false;
    if (typeof unreadCount === "number") return;
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && typeof d.count === "number") {
          setUnread(d.count);
          setUnreadCount(d.count);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [setUnreadCount, unreadCount]);

  return (
    <header className="sticky-app-header screen-header-pad flex items-center justify-between px-5 pb-3">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.12em] text-brand-muted font-body font-medium">
          {subtitle}
        </div>
        <div className="text-[22px] font-display font-bold tracking-tight text-brand-ink mt-0.5 truncate">
          {title}
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/notifications"
          className="relative h-10 w-10 rounded-xl bg-white border border-brand-line shadow-soft flex items-center justify-center text-brand-muted"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
        >
          <Bell size={18} strokeWidth={1.75} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-red text-white text-[10px] font-bold font-body flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link
          href="/profile"
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-blueDark flex items-center justify-center text-white text-sm font-display font-bold shadow-glow"
          aria-label="Profile"
        >
          {letter}
        </Link>
      </div>
    </header>
  );
}
