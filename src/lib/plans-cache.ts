import { unstable_cache } from "next/cache";
import { listDataPlans, type AsbDataPlan } from "@/lib/services/asbdata";

/**
 * Shared catalog cache for data plans (all networks).
 * - In-process TTL also exists inside asbdata.ts (5 min)
 * - Next.js data cache revalidates every 5 minutes across requests
 */
export const getCachedDataPlans = unstable_cache(
  async (): Promise<AsbDataPlan[]> => {
    return listDataPlans();
  },
  ["asbdata-data-plans-v1"],
  {
    revalidate: 300,
    tags: ["data-plans"],
  },
);

export async function getCachedDataPlansForNetwork(
  network: string,
): Promise<AsbDataPlan[]> {
  const all = await getCachedDataPlans();
  return all.filter((p) => p.network === network);
}
