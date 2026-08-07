/**
 * Profit margin on wholesale data plan prices.
 *
 * The vendor (ASBDATA) quotes a wholesale price per plan. Retail price is
 * wholesale plus an operator-configured margin. Rules are stored in the
 * PricingRule table and resolved most-specific-first, so an operator can set
 * a house-wide default and override single networks, plan types or plans.
 *
 * All money is kobo (integer). Percentages are basis points to keep the math
 * in integers — 250 bps = 2.5%.
 */
import { prisma } from "@/lib/prisma";

export const PRICING_SCOPES = ["PLAN", "PLAN_TYPE", "NETWORK", "GLOBAL"] as const;
export type PricingScope = (typeof PRICING_SCOPES)[number];

/** Specificity order used to resolve competing rules — lower index wins. */
const SCOPE_RANK: Record<PricingScope, number> = {
  PLAN: 0,
  PLAN_TYPE: 1,
  NETWORK: 2,
  GLOBAL: 3,
};

export const MAX_MARGIN_BPS = 10_000; // 100% — fat-finger guard, not a policy
export const MAX_FLAT_MARGIN_KOBO = 500_000; // ₦5,000

export type PricingRuleInput = {
  scope: PricingScope;
  network: string | null;
  planType: string | null;
  variationCode: string | null;
  marginBps: number;
  marginKobo: number;
  minMarginKobo: number;
  maxMarginKobo: number | null;
  roundToKobo: number;
};

export type PricingRuleRecord = PricingRuleInput & {
  id: string;
  active: boolean;
  note: string | null;
  updatedAt: Date;
};

export type PlanPricingTarget = {
  network: string;
  planType: string;
  variationCode: string;
};

/**
 * Pick the rule that applies to a plan. A rule matches when every field it
 * constrains equals the plan's, so GLOBAL (which constrains nothing) always
 * matches and acts as the fallback.
 */
export function resolveRule<T extends PricingRuleRecord>(
  rules: T[],
  plan: PlanPricingTarget,
): T | null {
  const matches = rules.filter((rule) => {
    if (!rule.active) return false;
    if (rule.network && rule.network !== plan.network) return false;
    if (rule.planType && rule.planType !== plan.planType) return false;
    if (rule.variationCode && rule.variationCode !== plan.variationCode) return false;
    return true;
  });

  if (matches.length === 0) return null;

  return matches.reduce((best, rule) => {
    const delta = SCOPE_RANK[rule.scope] - SCOPE_RANK[best.scope];
    if (delta !== 0) return delta < 0 ? rule : best;
    // Same specificity (a duplicate the unique index can't catch, e.g. a
    // NETWORK rule vs a PLAN_TYPE rule): most recently edited wins.
    return rule.updatedAt > best.updatedAt ? rule : best;
  });
}

/** Round a kobo amount up to the next multiple of `step`. */
export function roundUpTo(amountKobo: number, step: number): number {
  if (!Number.isFinite(step) || step <= 1) return amountKobo;
  return Math.ceil(amountKobo / step) * step;
}

export type PriceBreakdown = {
  costKobo: number;
  marginKobo: number;
  retailKobo: number;
  ruleId: string | null;
};

/**
 * Apply a rule to a wholesale price. Percentage first, then the flat add-on,
 * then the floor/cap, then rounding. Rounding is applied last and its extra
 * kobo counts as margin, so `costKobo + marginKobo === retailKobo` always
 * holds and the admin preview never disagrees with what a customer is charged.
 */
export function applyRule(
  costKobo: number,
  rule: Pick<
    PricingRuleRecord,
    "id" | "marginBps" | "marginKobo" | "minMarginKobo" | "maxMarginKobo" | "roundToKobo"
  > | null,
): PriceBreakdown {
  const cost = Math.max(0, Math.round(costKobo));
  if (!rule) {
    return { costKobo: cost, marginKobo: 0, retailKobo: cost, ruleId: null };
  }

  const pct = Math.round((cost * clampBps(rule.marginBps)) / 10_000);
  let margin = pct + Math.max(0, Math.round(rule.marginKobo));

  margin = Math.max(margin, Math.max(0, Math.round(rule.minMarginKobo)));
  if (rule.maxMarginKobo != null && rule.maxMarginKobo >= 0) {
    margin = Math.min(margin, Math.round(rule.maxMarginKobo));
  }

  const retail = roundUpTo(cost + margin, Math.max(0, Math.round(rule.roundToKobo)));

  return {
    costKobo: cost,
    marginKobo: retail - cost,
    retailKobo: retail,
    ruleId: rule.id,
  };
}

function clampBps(bps: number): number {
  if (!Number.isFinite(bps)) return 0;
  return Math.min(Math.max(Math.round(bps), 0), MAX_MARGIN_BPS);
}

/** Price a plan against a rule set in one call. */
export function priceFor(
  rules: PricingRuleRecord[],
  plan: PlanPricingTarget,
  costKobo: number,
): PriceBreakdown {
  return applyRule(costKobo, resolveRule(rules, plan));
}

/**
 * Load every rule. The table holds a handful of rows and is read on the data
 * catalog path, so it is queried per request rather than cached — a margin
 * change has to take effect immediately, and a stale cache here would charge
 * customers a price the operator has already changed.
 */
export async function loadPricingRules(): Promise<PricingRuleRecord[]> {
  const rows = await prisma.pricingRule.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toRecord);
}

/** Rules an operator can see, including inactive ones, newest first. */
export async function loadPricingRulesForAdmin(): Promise<PricingRuleRecord[]> {
  const rows = await prisma.pricingRule.findMany({
    orderBy: [{ scope: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(toRecord);
}

type PricingRuleRow = {
  id: string;
  scope: string;
  network: string | null;
  planType: string | null;
  variationCode: string | null;
  marginBps: number;
  marginKobo: number;
  minMarginKobo: number;
  maxMarginKobo: number | null;
  roundToKobo: number;
  active: boolean;
  note: string | null;
  updatedAt: Date;
};

function toRecord(row: PricingRuleRow): PricingRuleRecord {
  return {
    id: row.id,
    scope: (PRICING_SCOPES as readonly string[]).includes(row.scope)
      ? (row.scope as PricingScope)
      : "GLOBAL",
    network: row.network,
    planType: row.planType,
    variationCode: row.variationCode,
    marginBps: row.marginBps,
    marginKobo: row.marginKobo,
    minMarginKobo: row.minMarginKobo,
    maxMarginKobo: row.maxMarginKobo,
    roundToKobo: row.roundToKobo,
    active: row.active,
    note: row.note,
    updatedAt: row.updatedAt,
  };
}

/**
 * Human label for a rule's target, e.g. "MTN · SME".
 *
 * Takes a loose `scope` so raw Prisma rows work directly — SQLite has no enum
 * type, so it types the column as string.
 */
export function describeScope(rule: {
  scope: string;
  network?: string | null;
  planType?: string | null;
  variationCode?: string | null;
}): string {
  switch (rule.scope) {
    case "GLOBAL":
      return "All plans";
    case "NETWORK":
      return rule.network || "Network";
    case "PLAN_TYPE":
      return [rule.network, rule.planType].filter(Boolean).join(" · ") || "Plan type";
    case "PLAN":
      return [rule.network, `Plan ${rule.variationCode}`].filter(Boolean).join(" · ");
    default:
      return "Unknown";
  }
}

/** "2.5% + ₦20" style summary of the margin itself. */
export function describeMargin(rule: Pick<PricingRuleRecord, "marginBps" | "marginKobo">): string {
  const parts: string[] = [];
  if (rule.marginBps > 0) parts.push(`${(rule.marginBps / 100).toFixed(2).replace(/\.?0+$/, "")}%`);
  if (rule.marginKobo > 0) parts.push(`₦${(rule.marginKobo / 100).toLocaleString("en-NG")}`);
  return parts.length ? parts.join(" + ") : "No margin";
}
