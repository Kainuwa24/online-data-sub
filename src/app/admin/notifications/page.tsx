import { prisma } from "@/lib/prisma";

export default async function AdminNotificationsPage({ searchParams }: { searchParams: { read?: string } }) {
  const read = (searchParams.read || "ALL").trim().toUpperCase();
  const where = read === "READ" ? { read: true } : read === "UNREAD" ? { read: false } : undefined;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { name: true, phone: true, email: true } } },
  });

  return (
    <div className="rounded-lg border border-brand-line bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-brand-line p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-ink">Notifications</h2>
          <p className="mt-1 text-sm text-brand-muted">Customer notification feed and read state.</p>
        </div>
        <form action="/admin/notifications" className="flex gap-2">
          <select name="read" defaultValue={read} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-sm outline-none">
            <option value="ALL">All</option>
            <option value="UNREAD">Unread</option>
            <option value="READ">Read</option>
          </select>
          <button className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Apply</button>
        </form>
      </div>
      <div className="divide-y divide-brand-line">
        {notifications.map((notification) => (
          <div key={notification.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-brand-ink">{notification.title}</div>
                <div className="mt-1 text-xs text-brand-muted">{notification.user.name} / {notification.user.phone || notification.user.email || "No contact"}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${notification.read ? "bg-slate-100 text-brand-muted" : "bg-brand-blueSoft text-brand-blue"}`}>
                {notification.read ? "READ" : "UNREAD"}
              </span>
            </div>
            <p className="mt-3 text-sm text-brand-muted">{notification.body}</p>
            <div className="mt-2 text-[11px] text-brand-muted">{notification.createdAt.toLocaleString("en-NG")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
