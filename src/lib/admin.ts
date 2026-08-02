import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type AdminRole = "READ_ONLY" | "OPERATOR" | "FINANCE" | "OWNER";

const ROLE_RANK: Record<AdminRole, number> = {
  READ_ONLY: 1,
  OPERATOR: 2,
  FINANCE: 3,
  OWNER: 4,
};

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEnvAdmin(user: { email?: string | null } | null | undefined) {
  if (!user?.email) return false;
  return getAdminEmails().includes(user.email.trim().toLowerCase());
}

export async function getAdminAccess(user: { id: string; email?: string | null } | null | undefined) {
  if (!user) return null;

  if (isEnvAdmin(user)) {
    return { id: `env:${user.id}`, userId: user.id, role: "OWNER" as AdminRole, source: "env" as const };
  }

  const admin = await prisma.adminUser.findUnique({ where: { userId: user.id } });
  if (!admin?.active) return null;

  const role = isAdminRole(admin.role) ? admin.role : "READ_ONLY";
  return { id: admin.id, userId: admin.userId, role, source: "database" as const };
}

export async function isAdminUser(user: { id: string; email?: string | null } | null | undefined) {
  return Boolean(await getAdminAccess(user));
}

export async function requireAdminUser(minRole: AdminRole = "READ_ONLY") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const access = await getAdminAccess(user);
  if (!access || ROLE_RANK[access.role] < ROLE_RANK[minRole]) notFound();

  return { user, access };
}

export function canApproveWalletAdjustments(role: AdminRole) {
  return ROLE_RANK[role] >= ROLE_RANK.FINANCE;
}

export function canManageAdmins(role: AdminRole) {
  return role === "OWNER";
}

export async function writeAdminAudit(params: {
  actorAdminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}) {
  const h = headers();
  await prisma.adminAuditLog.create({
    data: {
      actorAdminId: params.actorAdminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || null,
      beforeJson: params.before == null ? null : JSON.stringify(params.before),
      afterJson: params.after == null ? null : JSON.stringify(params.after),
      metadata: params.metadata == null ? null : JSON.stringify(params.metadata),
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"),
      userAgent: h.get("user-agent"),
    },
  });
}

function isAdminRole(value: string): value is AdminRole {
  return value === "READ_ONLY" || value === "OPERATOR" || value === "FINANCE" || value === "OWNER";
}
