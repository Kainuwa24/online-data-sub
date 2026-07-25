import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isProfileComplete } from "@/lib/google-oauth";
import { BottomNav } from "@/components/layout/BottomNav";
import { BiometricGate } from "@/components/native/BiometricGate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isProfileComplete(user)) redirect("/complete-profile");

  return (
    <BiometricGate>
      <div className="app-shell pb-28">{children}</div>
      <BottomNav />
    </BiometricGate>
  );
}
