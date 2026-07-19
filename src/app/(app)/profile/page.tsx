"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { LogoutButton } from "./LogoutButton";
import { Copy, Check } from "lucide-react";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [hasBvn, setHasBvn] = useState(false);
  const [hasNin, setHasNin] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setName(d.name || "");
        setPhone(d.phone || "");
        setEmail(d.email || "");
        setReferralCode(d.referralCode || "");
        setHasBvn(Boolean(d.hasBvn));
        setHasNin(Boolean(d.hasNin));
      });
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email || null,
        bvn: bvn || undefined,
        nin: nin || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Could not save");
      return;
    }
    setHasBvn(Boolean(data.hasBvn));
    setHasNin(Boolean(data.hasNin));
    setBvn("");
    setNin("");
    setStatus("Profile updated");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <TopBar subtitle="Manage" title="Profile" />
      <div className="px-5 pb-24">
        <div className="flex items-center gap-3.5 py-4">
          <div className="h-13 w-13 rounded-full bg-brand-blue flex items-center justify-center text-white font-display font-bold text-lg">
            {(name || "?")[0]}
          </div>
          <div>
            <div className="font-display font-bold text-[15px]">{name}</div>
            <div className="text-xs text-gray-400 font-body">{phone}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 mb-4">
          <div className="text-[11px] text-gray-500 font-body">Referral code</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono font-bold text-sm">{referralCode}</span>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1 text-xs text-brand-blue font-semibold font-body"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 font-body mt-2">
            Friends who sign up with your code earn a welcome bonus; you get one too.
          </p>
        </div>

        <div className="text-[11px] text-gray-500 font-body mb-1.5">Full name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3.5 py-3 text-sm font-body outline-none mb-3"
        />

        <div className="text-[11px] text-gray-500 font-body mb-1.5">Email (optional)</div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3.5 py-3 text-sm font-body outline-none mb-3"
        />

        <div className="text-xs font-semibold text-gray-500 font-body mt-2 mb-2">
          KYC for wallet funding
        </div>
        <p className="text-[11px] text-gray-400 font-body mb-2">
          PalmPay needs BVN or NIN. Current:{" "}
          {hasBvn ? "BVN saved" : "no BVN"} · {hasNin ? "NIN saved" : "no NIN"}
        </p>

        <div className="text-[11px] text-gray-500 font-body mb-1.5">BVN (11 digits)</div>
        <input
          value={bvn}
          onChange={(e) => setBvn(e.target.value)}
          placeholder={hasBvn ? "Leave blank to keep existing" : "Enter BVN"}
          inputMode="numeric"
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3.5 py-3 text-sm font-mono outline-none mb-3"
        />

        <div className="text-[11px] text-gray-500 font-body mb-1.5">NIN (11 digits)</div>
        <input
          value={nin}
          onChange={(e) => setNin(e.target.value)}
          placeholder={hasNin ? "Leave blank to keep existing" : "Enter NIN"}
          inputMode="numeric"
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-3.5 py-3 text-sm font-mono outline-none mb-4"
        />

        {status && <div className="text-center text-xs font-body mb-3">{status}</div>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl bg-brand-blue text-white py-3.5 text-sm font-bold font-body mb-4"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>

        <LogoutButton />
      </div>
    </div>
  );
}
