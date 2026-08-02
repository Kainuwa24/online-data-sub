import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminUser } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user: admin, access } = await requireAdminUser();
  const roleLabel = access.role === "OWNER" ? "Owner / Superuser" : access.role.replace("_", " ");

  return (
    <main className="legal-page bg-[#f5f7fb] text-brand-ink">
      <div className="flex min-h-full w-full flex-col px-3 py-3 sm:px-5 lg:px-6 lg:py-6">
        <header className="rounded-lg border border-brand-line bg-white shadow-soft">
          <div className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-md bg-brand-blueSoft px-2.5 py-1 text-xs font-bold text-brand-blue">
                  <ShieldCheck size={14} />
                  Admin Control Center
                </span>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {roleLabel}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
                Operations workspace
              </h1>
              <p className="mt-1 max-w-full truncate text-sm text-brand-muted">
                {admin.email || admin.phone || admin.name}
              </p>
            </div>

            <Link
              href="/home"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-line bg-white px-3 text-sm font-semibold text-brand-ink shadow-soft hover:bg-slate-50 sm:w-fit"
            >
              <ArrowLeft size={16} />
              Customer app
            </Link>
          </div>
        </header>

        <div className="grid flex-1 gap-4 py-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-lg border border-brand-line bg-white shadow-soft xl:sticky xl:top-4 xl:self-start">
            <div className="hidden border-b border-brand-line px-4 py-3 xl:block">
              <div className="text-xs font-bold uppercase tracking-wide text-brand-muted">Models</div>
            </div>
            <AdminNav />
          </aside>

          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}


