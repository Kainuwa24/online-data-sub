"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Gift,
  HelpCircle,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setName(d.name || "");
        setPhone(d.phone || "");
      });
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("ods-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const rows = [
    { icon: User, label: "Edit profile", href: "/profile/edit" },
    { icon: Shield, label: "Security & PIN", href: "/profile/security" },
    { icon: Gift, label: "Refer & earn", href: "/profile/referral" },
    { icon: HelpCircle, label: "Help & support", href: "/profile/help" },
  ];

  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="animate-fade-up pb-28">
      <ScreenHeader title="Profile" backHref="/home" />

      <div className="px-5">
        <div className="flex items-center gap-3.5 py-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-brand-blue to-brand-blueDark shadow-glow flex items-center justify-center text-white font-display font-bold text-lg">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[16px] text-brand-ink truncate">
              {name || "—"}
            </div>
            <div className="text-xs text-brand-muted font-body mt-0.5">{phone || "—"}</div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {rows.map((r, i) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.href}
                href={r.href}
                className={`flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 ${
                  i !== rows.length - 1 ? "border-b border-brand-line/70" : ""
                }`}
              >
                <Icon size={17} className="text-brand-muted shrink-0" strokeWidth={1.75} />
                <span className="flex-1 text-[13.5px] font-body text-brand-ink">{r.label}</span>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
            );
          })}
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-brand-line/70">
            {dark ? (
              <Sun size={17} className="text-brand-muted" strokeWidth={1.75} />
            ) : (
              <Moon size={17} className="text-brand-muted" strokeWidth={1.75} />
            )}
            <span className="flex-1 text-[13.5px] font-body text-brand-ink">Dark mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              onClick={toggleDark}
              className={`relative w-10 h-[22px] rounded-full transition-colors ${
                dark ? "bg-brand-blue" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
                  dark ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full mt-4 flex items-center gap-3 rounded-2xl bg-brand-redSoft px-4 py-3.5 active:scale-[0.99] transition-transform"
        >
          <LogOut size={17} className="text-brand-red" />
          <span className="text-[13.5px] font-semibold font-body text-brand-red">Log out</span>
        </button>
      </div>
    </div>
  );
}
