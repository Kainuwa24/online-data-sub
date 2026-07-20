"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Wallet,
  Smartphone,
  Gift,
  Info,
  CheckCheck,
} from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { useToast } from "@/components/ui/Toast";

type Notif = {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function notifIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("wallet") || t.includes("fund") || t.includes("credit")) return Wallet;
  if (t.includes("data") || t.includes("airtime") || t.includes("purchase")) return Smartphone;
  if (t.includes("referral") || t.includes("bonus")) return Gift;
  return Bell;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setNotifs(data.notifications || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAll() {
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!res.ok) {
      toastError("Could not mark all as read");
      return;
    }
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
    success("All notifications marked read");
  }

  async function openNotif(n: Notif) {
    if (n.unread) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
      setNotifs((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
      );
    }
    // Navigate based on content
    const t = `${n.title} ${n.body}`.toLowerCase();
    if (t.includes("fund") || t.includes("wallet")) {
      router.push("/wallet");
      return;
    }
    if (t.includes("data") || t.includes("airtime")) {
      router.push("/history");
      return;
    }
    if (t.includes("referral")) {
      router.push("/profile/referral");
      return;
    }
  }

  const hasUnread = notifs.some((n) => n.unread);

  return (
    <div className="animate-fade-up pb-28">
      <ScreenHeader title="Notifications" backHref="/home" />

      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">Inbox</div>
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={!hasUnread}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue font-body disabled:opacity-40"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-brand-muted font-body py-10 text-center">Loading…</div>
        ) : error ? (
          <div className="text-sm text-brand-red font-body py-6 text-center">{error}</div>
        ) : notifs.length === 0 ? (
          <div className="card py-12 px-5 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-blueSoft flex items-center justify-center mb-3">
              <Bell size={22} className="text-brand-blue" />
            </div>
            <div className="text-sm font-semibold font-body text-brand-ink">No notifications yet</div>
            <p className="text-xs text-brand-muted font-body mt-1.5 leading-relaxed">
              Buys, funding, and referrals will show up here.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {notifs.map((n, i) => {
              const Icon = notifIcon(n.title);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void openNotif(n)}
                  className={`w-full flex gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50 ${
                    n.unread ? "bg-brand-blueSoft/40" : ""
                  } ${i !== notifs.length - 1 ? "border-b border-brand-line/70" : ""}`}
                >
                  <div className="h-9 w-9 rounded-xl bg-white border border-brand-line shadow-soft flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold font-body text-brand-ink">
                        {n.title}
                      </span>
                      {n.unread && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-brand-red shrink-0" />
                      )}
                    </div>
                    <p className="text-[12px] text-brand-muted font-body mt-0.5 leading-snug">
                      {n.body}
                    </p>
                    <div className="text-[10px] text-slate-400 font-body mt-1.5">
                      {relativeTime(n.createdAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
