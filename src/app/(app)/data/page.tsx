import { getCachedDataPlans } from "@/lib/plans-cache";
import { DataPageClient } from "./DataPageClient";

export const revalidate = 300;

export default async function DataPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  // Server-side load (cached 5 min) — plans are in the first HTML/RSC payload
  const plans = await getCachedDataPlans();
  const initialTab = searchParams?.tab === "airtime" ? "airtime" : "data";

  return (
    <DataPageClient
      initialPlans={plans}
      initialTab={initialTab}
    />
  );
}
