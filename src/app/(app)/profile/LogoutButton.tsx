"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <button onClick={logout} className="w-full rounded-2xl bg-red-50 dark:bg-red-950 text-brand-red py-3.5 text-sm font-semibold font-body mt-4">
      Log out
    </button>
  );
}
