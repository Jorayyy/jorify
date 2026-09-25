import { buildNav } from "@/components/admin/nav";
import { Sidebar } from "@/components/admin/sidebar";
import { getBusinessType } from "@/lib/business-types";
import type { Permission } from "@/lib/auth/permissions";
import { requireStoreContext } from "@/lib/tenancy/context";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);

  const type = getBusinessType(ctx.store.businessType);
  const items = buildNav(type, (permission) =>
    permission ? ctx.can(permission as Permission) : true,
  );

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <Sidebar
        storeSlug={ctx.store.slug}
        storeName={ctx.store.name}
        items={items.map((item) => ({ key: item.key, label: item.label, href: item.href }))}
        userName={ctx.user.name}
      />
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
