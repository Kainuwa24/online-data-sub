"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  ClipboardCheck,
  DatabaseZap,
  Home,
  Landmark,
  Network,
  Percent,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/overview", label: "Overview", icon: Home },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: Activity },
  { href: "/admin/wallets", label: "Wallets", icon: Wallet },
  { href: "/admin/pricing", label: "Pricing", icon: Percent },
  { href: "/admin/adjustments", label: "Adjustments", icon: ClipboardCheck },
  { href: "/admin/virtual-accounts", label: "Virtual accounts", icon: Landmark },
  { href: "/admin/provider-events", label: "Provider events", icon: DatabaseZap },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/referrals", label: "Referrals", icon: Network },
  { href: "/admin/audit-log", label: "Audit log", icon: DatabaseZap },
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-none xl:flex-col xl:overflow-visible">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors xl:w-full ${
              active
                ? "bg-brand-blue text-white shadow-glow"
                : "text-brand-muted hover:bg-slate-50 hover:text-brand-ink"
            }`}
          >
            <Icon size={17} strokeWidth={1.9} />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
