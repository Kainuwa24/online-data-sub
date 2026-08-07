import { getPricedDataPlans } from "@/lib/plans-cache";
import { DataPageClient } from "./DataPageClient";

export const dynamic = "force-dynamic";

export default async function DataPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  // Plans are cached at the vendor layer, but margins are applied per request
  // so an operator pricing change shows up without a stale-cache wait.
  const plans = await getPricedDataPlans();
  const initialTab = searchParams?.tab === "airtime" ? "airtime" : "data";

  return (
    <DataPageClient
      initialPlans={plans}
      initialTab={initialTab}
    />
  );
}
