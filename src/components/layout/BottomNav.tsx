"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wifi, Receipt, TrendingUp, History } from "lucide-react";

const ITEMS = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/data", icon: Wifi, label: "Data" },
  { href: "/bills", icon: Receipt, label: "Bills" },
  { href: "/watch", icon: TrendingUp, label: "Watch" },
  { href: "/history", icon: History, label: "History" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-md mx-auto px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="glass-nav rounded-[22px] h-[68px] flex items-center justify-around px-1 mb-2 border border-brand-line/60">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href === "/data" && pathname.startsWith("/data")) ||
              (item.href === "/history" && pathname.startsWith("/history"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all duration-200 ${
                  active ? "text-brand-blue" : "text-slate-400"
                }`}
              >
                {active && (
                  <span className="absolute inset-1 rounded-2xl bg-brand-blueSoft dark:bg-blue-950/50" />
                )}
                <Icon
                  size={20}
                  strokeWidth={active ? 2.25 : 1.75}
                  className="relative z-10"
                />
                <span
                  className={`relative z-10 text-[10px] font-body ${
                    active ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
