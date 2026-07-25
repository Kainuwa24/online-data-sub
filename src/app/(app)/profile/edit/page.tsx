"use client";

import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAppCache } from "@/components/app/AppCacheProvider";

export default function EditProfilePage() {
  const { success, error: toastError } = useToast();
  const { profile, setProfile } = useAppCache();
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [bvnMasked, setBvnMasked] = useState<string | null>(profile?.bvnMasked ?? null);
  const [ninMasked, setNinMasked] = useState<string | null>(profile?.ninMasked ?? null);
  const [loading, setLoading] = useState(!profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
      setBvnMasked(profile.bvnMasked || null);
      setNinMasked(profile.ninMasked || null);
      setLoading(false);
    }
    // Always revalidate (quietly if we already have a shell)
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setName(d.name || "");
        setPhone(d.phone || "");
        setEmail(d.email || "");
        setBvnMasked(d.bvnMasked || null);
        setNinMasked(d.ninMasked || null);
        setProfile({
          name: d.name || "",
          phone: d.phone || "",
          email: d.email || null,
          bvnMasked: d.bvnMasked || null,
          ninMasked: d.ninMasked || null,
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: {
        name: string;
        email: string | null;
        bvn?: string;
        nin?: string;
      } = {
        name: name.trim(),
        email: email.trim() || null,
      };
      if (bvn.trim()) payload.bvn = bvn.trim();
      if (nin.trim()) payload.nin = nin.trim();

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save profile");

      // Refresh masked values
      const me = await fetch("/api/profile").then((r) => r.json());
      setBvnMasked(me.bvnMasked || null);
      setNinMasked(me.ninMasked || null);
      setProfile({
        name: name.trim(),
        phone,
        email: email.trim() || null,
        bvnMasked: me.bvnMasked || null,
        ninMasked: me.ninMasked || null,
      });
      setBvn("");
      setNin("");
      setSaved(true);
      success("Profile saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save profile";
      setError(msg);
      toastError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-up pb-28">
      <ScreenHeader title="Edit profile" backHref="/profile" />
      <div className="px-5">
        <p className="text-sm text-brand-muted font-body mb-5 leading-relaxed">
          Phone is used for account recovery and cannot be changed here.
        </p>

        <div className={`auth-panel !p-5 ${loading ? "opacity-80" : ""}`}>
            <TextField
              label="Full name"
              placeholder={loading ? "Loading…" : "Your name"}
              value={name}
              onChange={setName}
            />
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
                Phone
              </label>
              <input
                value={phone}
                readOnly
                className="input-premium opacity-70 bg-slate-50"
              />
            </div>
            <TextField
              label="Email (optional)"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
            />
            <TextField
              label={
                bvnMasked
                  ? `BVN (saved ${bvnMasked}) — enter to update`
                  : "BVN (optional, for funding KYC)"
              }
              placeholder="11 digits"
              type="tel"
              value={bvn}
              onChange={(v) => setBvn(v.replace(/\D/g, "").slice(0, 11))}
            />
            <TextField
              label={
                ninMasked
                  ? `NIN (saved ${ninMasked}) — enter to update`
                  : "NIN (optional, for funding KYC)"
              }
              placeholder="11 digits"
              type="tel"
              value={nin}
              onChange={(v) => setNin(v.replace(/\D/g, "").slice(0, 11))}
            />

            {error && (
              <div className="text-brand-red text-xs font-body font-medium mb-3">{error}</div>
            )}
            {saved && (
              <div className="text-brand-blue text-xs font-body font-medium mb-3">
                Profile saved.
              </div>
            )}

            <Button onClick={save} disabled={saving || loading || name.trim().length < 2}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
        </div>
      </div>
    </div>
  );
}
