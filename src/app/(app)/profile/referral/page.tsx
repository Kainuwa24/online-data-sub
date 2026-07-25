"use client";

import { useEffect, useState } from "react";
import { Copy, Share2, Check, RefreshCw } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { useAppCache, type ReferralSnapshot } from "@/components/app/AppCacheProvider";

export default function ReferralPage() {
  const { referral, setReferral } = useAppCache();
  const [loading, setLoading] = useState(!referral);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(referral?.code ?? "");
  const [tagline, setTagline] = useState(referral?.tagline ?? "Give ₦500, get ₦500");
  const [friendsJoined, setFriendsJoined] = useState(referral?.friendsJoined ?? 0);
  const [earnedFormatted, setEarnedFormatted] = useState(referral?.earnedFormatted ?? "₦0");
  const [friends, setFriends] = useState(referral?.invites ?? []);
  const [copied, setCopied] = useState(false);

  async function loadReferral(force = false) {
    if (!force && referral) {
      setCode(referral.code || "");
      setTagline(referral.tagline || "Give ₦500, get ₦500");
      setFriendsJoined(referral.friendsJoined || 0);
      setEarnedFormatted(referral.earnedFormatted || "₦0");
      setFriends(referral.invites || []);
      setLoading(false);
      // Quiet revalidate
      void (async () => {
        try {
          const r = await fetch("/api/referrals/me");
          const data = await r.json();
          if (!r.ok) return;
          const next: ReferralSnapshot = {
            code: data.code || "",
            tagline: data.tagline || "Give ₦500, get ₦500",
            friendsJoined: data.friendsJoined || 0,
            earnedFormatted: data.earnedFormatted || "₦0",
            invites: data.invites || [],
          };
          setCode(next.code);
          setTagline(next.tagline);
          setFriendsJoined(next.friendsJoined);
          setEarnedFormatted(next.earnedFormatted);
          setFriends(next.invites);
          setReferral(next);
        } catch {
          // keep cached
        }
      })();
      return;
    }

    if (force) {
      setRefreshing(true);
    } else if (!referral) {
      setLoading(true);
    }

    try {
      const r = await fetch("/api/referrals/me");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to load");

      const next: ReferralSnapshot = {
        code: data.code || "",
        tagline: data.tagline || "Give ₦500, get ₦500",
        friendsJoined: data.friendsJoined || 0,
        earnedFormatted: data.earnedFormatted || "₦0",
        invites: data.invites || [],
      };

      setCode(next.code);
      setTagline(next.tagline);
      setFriendsJoined(next.friendsJoined);
      setEarnedFormatted(next.earnedFormatted);
      setFriends(next.invites);
      setReferral(next);
      setError(null);
    } catch (e) {
      if (!referral) setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadReferral();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`
      : `/signup?ref=${code}`;

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareInvite() {
    if (!code) return;
    const text = `Join Online Data Sub with my code ${code} and we both earn a bonus. ${inviteLink}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Online Data Sub", text, url: inviteLink });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="animate-fade-up pb-28">
      <ScreenHeader title="Refer & earn" backHref="/profile" />

      <div className="px-5">
        <div className="flex justify-end mt-2 mb-3">
          <button
            type="button"
            onClick={() => void loadReferral(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-muted disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="rounded-[22px] p-5 text-white relative overflow-hidden shadow-glow bg-wallet-card">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="text-xs text-white/80 font-body">{tagline}</div>
            <div className="text-[15px] font-display font-bold mt-1">
              Invite friends to Online Data Sub
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/15 px-3.5 py-3">
              <span className="font-mono text-[15px] tracking-[0.2em] font-semibold">
                {loading ? "······" : code || "—"}
              </span>
              <button type="button" onClick={() => void copyCode()} aria-label="Copy code">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void shareInvite()}
              className="w-full mt-3 bg-white text-brand-blue rounded-xl py-3 text-sm font-bold font-body flex items-center justify-center gap-2"
            >
              <Share2 size={14} />
              {copied ? "Copied!" : "Share invite link"}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-center text-brand-red text-xs font-body mt-3">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <div className="card p-4 text-center">
            <div className="text-xl font-display font-extrabold text-brand-ink">
              {loading ? "—" : friendsJoined}
            </div>
            <div className="text-[11px] text-brand-muted font-body mt-1">Friends joined</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-display font-extrabold text-brand-ink">
              {loading ? "—" : earnedFormatted}
            </div>
            <div className="text-[11px] text-brand-muted font-body mt-1">Earned so far</div>
          </div>
        </div>

        <div className="section-label mt-6 mb-2">Your invites</div>
        <div className="card overflow-hidden">
          {loading && friends.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  index !== 2 ? "border-b border-brand-line/70" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-1/2 rounded bg-slate-200/80 animate-pulse" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-slate-200/70 animate-pulse" />
                </div>
                <div className="h-5 w-12 rounded-full bg-slate-200/80 animate-pulse" />
              </div>
            ))
          ) : friends.length === 0 ? (
            <div className="py-8 px-4 text-center text-sm text-brand-muted font-body">
              No invites yet. Share your code to start earning.
            </div>
          ) : (
            friends.map((f, i) => (
              <div
                key={f.id}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i !== friends.length - 1 ? "border-b border-brand-line/70" : ""
                }`}
              >
                <div>
                  <div className="text-[13.5px] font-semibold font-body text-brand-ink">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-brand-muted font-body mt-0.5">{f.status}</div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-blue bg-brand-blueSoft rounded-full px-2 py-0.5">
                  Done
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
