"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wifi, Receipt, TrendingUp, Wallet } from "lucide-react";

const ITEMS = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/data", icon: Wifi, label: "Data" },
  { href: "/bills", icon: Receipt, label: "Bills" },
  { href: "/watch", icon: TrendingUp, label: "Watch" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[78px] bg-white/90 dark:bg-gray-950/90 backdrop-blur border-t border-gray-200 dark:border-gray-800 flex items-center justify-around pb-3">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 w-14">
            <Icon size={19} className={active ? "text-brand-blue" : "text-gray-400"} />
            <span className={`text-[9.5px] font-body ${active ? "text-brand-blue font-semibold" : "text-gray-400"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
