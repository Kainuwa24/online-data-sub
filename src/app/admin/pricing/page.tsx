import { revalidatePath } from "next/cache";
import { Pencil, Plus, X } from "lucide-react";
import { requireAdminUser, writeAdminAudit } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  loadPricingRulesForAdmin,
  describeScope,
  describeMargin,
  PRICING_SCOPES,
  MAX_MARGIN_BPS,
  MAX_FLAT_MARGIN_KOBO,
  type PricingScope,
} from "@/lib/pricing";
import { formatNaira } from "@/lib/money";
import { getCachedDataPlans, applyPricing } from "@/lib/plans-cache";
import { NETWORKS } from "@/lib/services/asbdata";

async function createRule(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("OPERATOR");

  const body = {
    scope: String(formData.get("scope") || "").toUpperCase(),
    network: formData.get("network") ? String(formData.get("network")) : null,
    planType: formData.get("planType") ? String(formData.get("planType")) : null,
    variationCode: formData.get("variationCode") ? String(formData.get("variationCode")) : null,
    marginBps: Number(formData.get("marginPercent") || 0) * 100,
    marginKobo: Number(String(formData.get("marginFlat") || 0).replace(/,/g, "")) * 100,
    minMarginKobo: Number(String(formData.get("minMargin") || 0).replace(/,/g, "")) * 100,
    maxMarginKobo:
      formData.get("maxMargin") && String(formData.get("maxMargin")).trim()
        ? Number(String(formData.get("maxMargin")).replace(/,/g, "")) * 100
        : null,
    roundToKobo: Number(String(formData.get("roundTo") || 0).replace(/,/g, "")) * 100,
    note: String(formData.get("note") || "").trim(),
  };

  if (!(PRICING_SCOPES as readonly string[]).includes(body.scope)) {
    throw new Error("Invalid scope");
  }

  // Validate scope constraints
  if (body.scope === "NETWORK" && !body.network) throw new Error("Network is required");
  if (body.scope === "PLAN_TYPE" && !(body.network && body.planType)) {
    throw new Error("Network and plan type are required");
  }
  if (body.scope === "PLAN" && !(body.network && body.variationCode)) {
    throw new Error("Network and plan code are required");
  }

  if (body.marginBps < 0 || body.marginBps > MAX_MARGIN_BPS) {
    throw new Error(`Percent margin must be between 0 and ${MAX_MARGIN_BPS / 100}%`);
  }
  if (body.marginKobo < 0 || body.marginKobo > MAX_FLAT_MARGIN_KOBO) {
    throw new Error(`Flat margin cannot exceed ${formatNaira(MAX_FLAT_MARGIN_KOBO)}`);
  }

  const existing = await prisma.pricingRule.findFirst({
    where: {
      scope: body.scope,
      network: body.network,
      planType: body.planType,
      variationCode: body.variationCode,
    },
  });
  if (existing) throw new Error("A rule for this target already exists");

  const rule = await prisma.pricingRule.create({
    data: {
      scope: body.scope as PricingScope,
      network: body.network,
      planType: body.planType,
      variationCode: body.variationCode,
      marginBps: body.marginBps,
      marginKobo: body.marginKobo,
      minMarginKobo: body.minMarginKobo,
      maxMarginKobo: body.maxMarginKobo,
      roundToKobo: body.roundToKobo,
      active: true,
      note: body.note || null,
      createdByAdminId: access.id,
    },
  });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: "PRICING_RULE_CREATE",
    targetType: "PricingRule",
    targetId: rule.id,
    after: rule,
    metadata: { target: describeScope(rule), margin: describeMargin(rule) },
  });

  revalidatePath("/admin/pricing");
}

async function toggleRule(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("OPERATOR");
  const id = String(formData.get("id") || "");

  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) throw new Error("Rule not found");

  const updated = await prisma.pricingRule.update({
    where: { id },
    data: { active: !existing.active, updatedByAdminId: access.id },
  });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: existing.active ? "PRICING_RULE_DISABLE" : "PRICING_RULE_ENABLE",
    targetType: "PricingRule",
    targetId: id,
    before: { active: existing.active },
    after: { active: updated.active },
    metadata: { target: describeScope(existing) },
  });

  revalidatePath("/admin/pricing");
}

async function updateRule(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("OPERATOR");
  const id = String(formData.get("id") || "");

  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) throw new Error("Rule not found");

  const marginBps = Number(formData.get("marginPercent") || 0) * 100;
  const marginKobo = Number(String(formData.get("marginFlat") || 0).replace(/,/g, "")) * 100;
  const minMarginKobo = Number(String(formData.get("minMargin") || 0).replace(/,/g, "")) * 100;
  const maxMarginKobo =
    formData.get("maxMargin") && String(formData.get("maxMargin")).trim()
      ? Number(String(formData.get("maxMargin")).replace(/,/g, "")) * 100
      : null;
  const roundToKobo = Number(String(formData.get("roundTo") || 0).replace(/,/g, "")) * 100;
  const note = String(formData.get("note") || "").trim();

  if (marginBps < 0 || marginBps > MAX_MARGIN_BPS) {
    throw new Error(`Percent margin must be between 0 and ${MAX_MARGIN_BPS / 100}%`);
  }
  if (marginKobo < 0 || marginKobo > MAX_FLAT_MARGIN_KOBO) {
    throw new Error(`Flat margin cannot exceed ${formatNaira(MAX_FLAT_MARGIN_KOBO)}`);
  }

  const before = {
    marginBps: existing.marginBps,
    marginKobo: existing.marginKobo,
    minMarginKobo: existing.minMarginKobo,
    maxMarginKobo: existing.maxMarginKobo,
    roundToKobo: existing.roundToKobo,
    note: existing.note,
  };

  const updated = await prisma.pricingRule.update({
    where: { id },
    data: {
      marginBps,
      marginKobo,
      minMarginKobo,
      maxMarginKobo,
      roundToKobo,
      note: note || null,
      updatedByAdminId: access.id,
    },
  });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: "PRICING_RULE_UPDATE",
    targetType: "PricingRule",
    targetId: id,
    before,
    after: {
      marginBps: updated.marginBps,
      marginKobo: updated.marginKobo,
      minMarginKobo: updated.minMarginKobo,
      maxMarginKobo: updated.maxMarginKobo,
      roundToKobo: updated.roundToKobo,
      note: updated.note,
    },
    metadata: { target: describeScope(existing), margin: describeMargin(updated) },
  });

  revalidatePath("/admin/pricing");
}

type PlanType = string;

export default async function AdminPricingPage() {
  await requireAdminUser("OPERATOR");

  const [rules, plans] = await Promise.all([loadPricingRulesForAdmin(), getCachedDataPlans()]);

  // Distinct plan types for the form dropdown
  const planTypes = Array.from(new Set(plans.map((p) => p.planType))).sort();

  // Sample preview — show how the first 5 plans price under current rules
  const preview = applyPricing(plans.slice(0, 8), rules);

  return (
    <div className="space-y-5">
      {/* Create form */}
      <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
        <h2 className="text-xl font-bold text-brand-ink">Profit margins</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Set a house-wide margin or override specific networks, plan types, or plans. Most specific wins.
        </p>

        <form action={createRule} className="mt-4 space-y-3">
          <div className="grid gap-3 lg:grid-cols-4">
            <select name="scope" required className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none">
              <option value="">— Scope —</option>
              {PRICING_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select name="network" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none">
              <option value="">— Network (if scoped) —</option>
              {NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select name="planType" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none">
              <option value="">— Plan type (if scoped) —</option>
              {planTypes.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
            <input name="variationCode" placeholder="Plan code (if PLAN scope)" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none" />
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <input name="marginPercent" placeholder="% margin (e.g. 2.5)" step="0.01" type="number" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none" required />
            <input name="marginFlat" placeholder="+ Flat ₦ (optional)" step="0.01" type="number" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none" />
            <input name="minMargin" placeholder="Min floor ₦" step="0.01" type="number" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none" />
            <input name="maxMargin" placeholder="Max cap ₦ (optional)" step="0.01" type="number" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none" />
            <input name="roundTo" placeholder="Round to ₦ (e.g. 10)" step="0.01" type="number" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none" />
          </div>

          <div className="flex gap-3">
            <input name="note" placeholder="Note (optional)" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none flex-1" />
            <button className="inline-flex w-32 items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">
              <Plus size={14} />
              Create
            </button>
          </div>
        </form>
      </div>

      {/* Rules table */}
      <div className="rounded-lg border border-brand-line bg-white shadow-soft">
        <div className="border-b border-brand-line p-4">
          <h3 className="font-bold text-brand-ink">Active rules</h3>
          <p className="text-xs text-brand-muted">Most specific match wins. Percentages are in basis points (2.5% = 250 bps).</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Margin</th>
                <th className="px-4 py-3">Floor / Cap</th>
                <th className="px-4 py-3">Round</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-brand-muted">
                    No pricing rules configured. Data plans show vendor wholesale price.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className={rule.active ? "" : "opacity-50"}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-brand-ink">{describeScope(rule)}</div>
                      <div className="mt-0.5 text-xs text-brand-muted uppercase">{rule.scope}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-brand-ink">{describeMargin(rule)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-muted">
                      {rule.minMarginKobo > 0 ? `Floor ${formatNaira(rule.minMarginKobo)}` : "—"}
                      {rule.maxMarginKobo != null ? ` / Cap ${formatNaira(rule.maxMarginKobo)}` : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-muted">
                      {rule.roundToKobo > 0 ? formatNaira(rule.roundToKobo) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted">{rule.note || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${rule.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {rule.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto flex w-48 max-w-full items-center justify-end gap-2">
                        <form action={toggleRule} className="inline">
                          <input type="hidden" name="id" value={rule.id} />
                          <button className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold border border-brand-line text-brand-ink">
                            {rule.active ? <X size={12} /> : <span className="text-xs">✓</span>}
                            {rule.active ? "Disable" : "Enable"}
                          </button>
                        </form>
                      </div>

                      {/* Disclosure keeps this a server component — no client JS needed */}
                      <details className="mt-3">
                        <summary className="ml-auto flex w-fit cursor-pointer items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">
                          <Pencil size={12} />
                          Edit
                        </summary>
                        <form action={updateRule} className="mt-2 space-y-2 rounded-lg border border-brand-line bg-slate-50 p-3">
                        <input type="hidden" name="id" value={rule.id} />
                        <div className="grid grid-cols-3 gap-2">
                          <input name="marginPercent" defaultValue={rule.marginBps / 100} step="0.01" type="number" placeholder="% margin" className="rounded-lg border border-brand-line bg-white px-2 py-1.5 text-xs outline-none" required />
                          <input name="marginFlat" defaultValue={rule.marginKobo / 100} step="0.01" type="number" placeholder="Flat ₦" className="rounded-lg border border-brand-line bg-white px-2 py-1.5 text-xs outline-none" />
                          <input name="minMargin" defaultValue={rule.minMarginKobo / 100} step="0.01" type="number" placeholder="Min ₦" className="rounded-lg border border-brand-line bg-white px-2 py-1.5 text-xs outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input name="maxMargin" defaultValue={rule.maxMarginKobo != null ? rule.maxMarginKobo / 100 : ""} step="0.01" type="number" placeholder="Max ₦" className="rounded-lg border border-brand-line bg-white px-2 py-1.5 text-xs outline-none" />
                          <input name="roundTo" defaultValue={rule.roundToKobo / 100} step="0.01" type="number" placeholder="Round ₦" className="rounded-lg border border-brand-line bg-white px-2 py-1.5 text-xs outline-none" />
                        </div>
                        <input name="note" defaultValue={rule.note || ""} placeholder="Note" className="rounded-lg border border-brand-line bg-white px-2 py-1.5 text-xs outline-none w-full" />
                        <button className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold w-full bg-emerald-600 text-white">Save changes</button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
        <h3 className="font-bold text-brand-ink">Sample preview</h3>
        <p className="mt-1 text-xs text-brand-muted">First 8 plans under current rules.</p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Margin</th>
                <th className="px-3 py-2 text-right">Retail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line text-xs">
              {preview.map((p) => (
                <tr key={p.variationCode}>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-[10px] text-brand-muted">{p.variationCode}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{formatNaira(p.costKobo)}</td>
                  <td className="px-3 py-2 text-right font-mono text-brand-blue">{formatNaira(p.marginKobo)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-brand-ink">{formatNaira(p.priceKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
