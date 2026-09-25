import { and, inArray, isNull } from "drizzle-orm";
import { Store } from "lucide-react";
import { createStoreFormAction } from "@/lib/actions/auth";
import { BUSINESS_TYPES, getBusinessType } from "@/lib/business-types";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { listUserOrganizations, requireUser } from "@/lib/tenancy/context";
import { timeAgo } from "@/lib/utils";

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser();
  const memberships = await listUserOrganizations(user.id);
  const organizationIds = memberships.map((row) => row.organization.id);

  const storeRows = organizationIds.length
    ? await db
        .select()
        .from(stores)
        .where(and(inArray(stores.organizationId, organizationIds), isNull(stores.deletedAt)))
    : [];

  const primaryOrg = organizationIds[0];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-xs text-white">J</span>
            Jorify
          </div>
          <span className="text-sm text-zinc-500">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight">Your stores</h1>
        <p className="mt-1 text-sm text-zinc-500">Switch between stores, or create another one.</p>
        {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {storeRows.map((store) => {
            const type = getBusinessType(store.businessType);
            return (
              <a
                key={store.id}
                href={`/admin/${store.slug}`}
                className="group rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">
                    {store.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 group-hover:underline">{store.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {type.label} · /{store.slug}
                    </p>
                  </div>
                </div>
                <p className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                  <span>{store.status === "active" ? "Active" : store.status}</span>
                  <span>updated {timeAgo(store.updatedAt)}</span>
                </p>
              </a>
            );
          })}

          {storeRows.length === 0 ? (
            <EmptyState
              title="No stores yet"
              description="Create your first store to start selling."
              className="rounded-lg border border-dashed border-zinc-300 bg-white sm:col-span-2 lg:col-span-3"
            />
          ) : null}
        </div>

        {primaryOrg ? (
          <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Store className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-semibold">Create a store</h2>
            </div>
            <form action={createStoreFormAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="organizationId" value={primaryOrg} />
              <div className="space-y-1.5">
                <Label htmlFor="name">Store name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Store URL</Label>
                <Input id="slug" name="slug" required placeholder="my-store" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessType">Business type</Label>
                <Select id="businessType" name="businessType" defaultValue="retail">
                  {Object.values(BUSINESS_TYPES).map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Create store
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  );
}
