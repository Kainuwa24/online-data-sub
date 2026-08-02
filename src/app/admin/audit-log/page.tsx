import { prisma } from "@/lib/prisma";

export default async function AdminAuditLogPage({ searchParams }: { searchParams: { action?: string; target?: string } }) {
  const action = (searchParams.action || "").trim();
  const target = (searchParams.target || "").trim();
  const where = {
    ...(action ? { action: { contains: action } } : {}),
    ...(target ? { OR: [{ targetType: { contains: target } }, { targetId: { contains: target } }] } : {}),
  };

  const logs = await prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="rounded-lg border border-brand-line bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-brand-line p-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-ink">Audit log</h2>
          <p className="mt-1 text-sm text-brand-muted">Immutable admin action history with request metadata.</p>
        </div>
        <form action="/admin/audit-log" className="flex flex-col gap-2 sm:flex-row">
          <input name="action" defaultValue={action} placeholder="Action" className="rounded-lg border border-brand-line px-3 py-2 text-sm outline-none" />
          <input name="target" defaultValue={target} placeholder="Target type or ID" className="rounded-lg border border-brand-line px-3 py-2 text-sm outline-none" />
          <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Filter</button>
        </form>
      </div>
      <div className="divide-y divide-brand-line">
        {logs.map((log) => (
          <details key={log.id} className="group p-4">
            <summary className="flex cursor-pointer flex-col gap-2 marker:hidden sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-brand-ink">{log.action}</div>
                <div className="text-xs text-brand-muted">{log.targetType}{log.targetId ? ` / ${log.targetId}` : ""}</div>
              </div>
              <div className="text-xs text-brand-muted">{log.createdAt.toLocaleString("en-NG")}</div>
            </summary>
            <div className="mt-4 grid gap-3 text-xs lg:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="font-bold text-brand-ink">Actor</div>
                <div className="mt-1 text-brand-muted">{log.actorAdminId}</div>
                <div className="mt-2 text-brand-muted">IP: {log.ipAddress || "-"}</div>
                <div className="mt-1 truncate text-brand-muted">UA: {log.userAgent || "-"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="font-bold text-brand-ink">Metadata</div>
                <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-[11px] text-brand-muted">{log.metadata || "{}"}</pre>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="font-bold text-brand-ink">Before</div>
                <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-[11px] text-brand-muted">{log.beforeJson || "{}"}</pre>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="font-bold text-brand-ink">After</div>
                <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-[11px] text-brand-muted">{log.afterJson || "{}"}</pre>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
