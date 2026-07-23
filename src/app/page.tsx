import { getCurrentUser } from "@/lib/session";
import { isProfileComplete } from "@/lib/google-oauth";
import { SplashScreen } from "@/components/auth/SplashScreen";

export default async function RootPage() {
  const user = await getCurrentUser();

  let nextPath = "/login";
  if (user) {
    nextPath = isProfileComplete(user) ? "/home" : "/complete-profile";
  }

  return <SplashScreen nextPath={nextPath} />;
}
