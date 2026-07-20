"use client";

import { useEffect, useState } from "react";
import { Copy, Share2, Check } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";

type Invite = { id: string; name: string; status: string; done: boolean };

export default function ReferralPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [tagline, setTagline] = useState("Give ₦500, get ₦500");
  const [friendsJoined, setFriendsJoined] = useState(0);
  const [earnedFormatted, setEarnedFormatted] = useState("₦0");
  const [friends, setFriends] = useState<Invite[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/me")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load");
        setCode(data.code || "");
        setTagline(data.tagline || "Give ₦500, get ₦500");
        setFriendsJoined(data.friendsJoined || 0);
        setEarnedFormatted(data.earnedFormatted || "₦0");
        setFriends(data.invites || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
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
          {!loading && friends.length === 0 ? (
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
