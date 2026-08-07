import { unstable_cache } from "next/cache";
import { listDataPlans, type AsbDataPlan } from "@/lib/services/asbdata";
import { loadPricingRules, priceFor, type PricingRuleRecord } from "@/lib/pricing";

/**
 * Shared catalog cache for data plans (all networks).
 * - In-process TTL also exists inside asbdata.ts (5 min)
 * - Next.js data cache revalidates every 5 minutes across requests
 *
 * Only the vendor catalog is cached. Operator margins are applied per request
 * by getPricedDataPlans() so a pricing change takes effect immediately rather
 * than waiting out this cache.
 */
export const getCachedDataPlans = unstable_cache(
  async (): Promise<AsbDataPlan[]> => {
    return listDataPlans();
  },
  ["asbdata-data-plans-v2"],
  {
    revalidate: 300,
    tags: ["data-plans"],
  },
);

/** A plan with the operator's margin applied. `priceKobo` is what we charge. */
export type PricedPlan = AsbDataPlan & {
  /** Margin included in priceKobo, for admin display. */
  marginKobo: number;
  ruleId: string | null;
};

export function applyPricing(
  plans: AsbDataPlan[],
  rules: PricingRuleRecord[],
): PricedPlan[] {
  return plans.map((plan) => {
    /*
     * Rules price up from plan.priceKobo, not plan.costKobo. The vendor layer
     * has already folded ASBDATA_PLATFORM_MARKUP_NGN into priceKobo, so pricing
     * from costKobo would discard that markup for every plan without a matching
     * rule and sell at bare wholesale. Margin is still reported against true
     * cost so the admin preview shows total profit per sale, not just the part
     * these rules contributed.
     */
    const breakdown = priceFor(rules, plan, plan.priceKobo);
    return {
      ...plan,
      priceKobo: breakdown.retailKobo,
      marginKobo: breakdown.retailKobo - plan.costKobo,
      ruleId: breakdown.ruleId,
    };
  });
}

/** Vendor catalog (cached) with current margins (uncached) applied. */
export async function getPricedDataPlans(network?: string): Promise<PricedPlan[]> {
  const [plans, rules] = await Promise.all([getCachedDataPlans(), loadPricingRules()]);
  const scoped = network ? plans.filter((p) => p.network === network) : plans;
  return applyPricing(scoped, rules);
}

/**
 * Authoritative price for one plan. The purchase path must use this rather
 * than a price supplied by the client, which is user-controlled input.
 */
export async function getPlanForPurchase(
  network: string,
  variationCode: string,
): Promise<PricedPlan | null> {
  const priced = await getPricedDataPlans(network);
  return priced.find((p) => p.variationCode === variationCode) ?? null;
}

export async function getCachedDataPlansForNetwork(
  network: string,
): Promise<AsbDataPlan[]> {
  const all = await getCachedDataPlans();
  return all.filter((p) => p.network === network);
}
