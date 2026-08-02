import { revalidatePath } from "next/cache";
import { canManageAdmins, requireAdminUser, writeAdminAudit } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function createAdmin(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("OWNER");
  const userQuery = String(formData.get("user") || "").trim();
  const role = String(formData.get("role") || "READ_ONLY").trim().toUpperCase();
  if (!userQuery) throw new Error("User is required");
  if (!isValidRole(role)) throw new Error("Invalid role");

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userQuery },
        { phone: userQuery },
        { email: userQuery.toLowerCase() },
        { referralCode: userQuery.toUpperCase() },
      ],
    },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (!user) throw new Error("User not found");

  const before = await prisma.adminUser.findUnique({ where: { userId: user.id } });
  const admin = await prisma.adminUser.upsert({
    where: { userId: user.id },
    create: { userId: user.id, role, active: true },
    update: { role, active: true },
  });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: before ? "ADMIN_USER_UPDATE" : "ADMIN_USER_CREATE",
    targetType: "AdminUser",
    targetId: admin.id,
    before,
    after: admin,
    metadata: { user },
  });

  revalidatePath("/admin/admins");
}

async function deactivateAdmin(formData: FormData) {
  "use server";

  const { access } = await requireAdminUser("OWNER");
  const id = String(formData.get("id") || "");
  const before = await prisma.adminUser.findUnique({ where: { id } });
  if (!before) throw new Error("Admin not found");
  const after = await prisma.adminUser.update({ where: { id }, data: { active: false } });

  await writeAdminAudit({
    actorAdminId: access.id,
    action: "ADMIN_USER_DEACTIVATE",
    targetType: "AdminUser",
    targetId: id,
    before,
    after,
  });

  revalidatePath("/admin/admins");
}

function isValidRole(role: string) {
  return role === "READ_ONLY" || role === "OPERATOR" || role === "FINANCE" || role === "OWNER";
}

export default async function AdminUsersManagementPage() {
  const { access } = await requireAdminUser();
  const canManage = canManageAdmins(access.role);
  const admins = await prisma.adminUser.findMany({ orderBy: [{ active: "desc" }, { updatedAt: "desc" }], take: 100 });
  const users = await prisma.user.findMany({
    where: { id: { in: admins.map((admin) => admin.userId) } },
    select: { id: true, name: true, phone: true, email: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-brand-line bg-white p-4 shadow-soft">
        <h2 className="text-xl font-bold text-brand-ink">Admins</h2>
        <p className="mt-1 text-sm text-brand-muted">Assign admin roles. Environment admins from ADMIN_EMAILS are treated as owners even if they are not listed here.</p>

        {canManage ? (
          <form action={createAdmin} className="mt-4 grid gap-3 md:grid-cols-[1fr_12rem_auto]">
            <input name="user" placeholder="User ID, phone, email, referral" className="rounded-lg border border-brand-line px-3 py-2 text-sm outline-none" required />
            <select name="role" defaultValue="READ_ONLY" className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none">
              <option value="READ_ONLY">Read only</option>
              <option value="OPERATOR">Operator</option>
              <option value="FINANCE">Finance</option>
              <option value="OWNER">Owner</option>
            </select>
            <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Save admin</button>
          </form>
        ) : null}
      </div>

      <div className="rounded-lg border border-brand-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                {canManage ? <th className="px-4 py-3">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {admins.map((admin) => {
                const user = userById.get(admin.userId);
                return (
                  <tr key={admin.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-brand-ink">{user?.name || admin.userId}</div>
                      <div className="text-xs text-brand-muted">{user?.phone || user?.email || "No contact"}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-ink">{admin.role}</td>
                    <td className="px-4 py-3">
                      <span className={admin.active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-brand-muted"}>
                        {admin.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted">{admin.updatedAt.toLocaleString("en-NG")}</td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        {admin.active ? (
                          <form action={deactivateAdmin}>
                            <input type="hidden" name="id" value={admin.id} />
                            <button className="rounded-lg bg-brand-redSoft px-3 py-2 text-xs font-semibold text-brand-red">Deactivate</button>
                          </form>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
