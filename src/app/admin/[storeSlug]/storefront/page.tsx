import { eq } from "drizzle-orm";
import { Eye, Paintbrush } from "lucide-react";
import Link from "next/link";
import { deletePageAction, createPageAction } from "@/lib/actions/storefront";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { storePages } from "@/lib/db/schema";
import { requireStoreContext } from "@/lib/tenancy/context";

type Props = {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function StorefrontAdminPage({ params, searchParams }: Props) {
  const { storeSlug } = await params;
  const { error } = await searchParams;
  const ctx = await requireStoreContext(storeSlug);
  const canEdit = ctx.can("storefront.update");

  const pages = await db.query.storePages.findMany({
    where: eq(storePages.storeId, ctx.store.id),
    orderBy: (table, { asc, desc }) => [desc(table.isHomepage), asc(table.title)],
  });

  return (
    <div>
      <PageHeader
        title="Storefront"
        description="Pages, sections and theme for your public store."
        actions={
          <>
            <Link
              href={`/admin/${storeSlug}/storefront/theme`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Paintbrush className="h-4 w-4" />
              Theme
            </Link>
            <Link
              href={`/${storeSlug}`}
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Eye className="h-4 w-4" />
              View storefront
            </Link>
          </>
        }
      />

      {error ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {canEdit ? (
        <form action={createPageAction} className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white p-4">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <div className="min-w-[180px] flex-1">
            <label htmlFor="page-title" className="mb-1 block text-xs font-medium text-zinc-500">
              Page title
            </label>
            <Input id="page-title" name="title" placeholder="About us" required />
          </div>
          <div className="min-w-[180px] flex-1">
            <label htmlFor="page-slug" className="mb-1 block text-xs font-medium text-zinc-500">
              URL
            </label>
            <Input id="page-slug" name="slug" placeholder="about-us" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
            <p className="mt-1 text-xs text-zinc-400">Lowercase letters, numbers and dashes. Served at /{storeSlug}/your-url</p>
          </div>
          <Button type="submit" size="sm" className="h-9">
            Create page
          </Button>
        </form>
      ) : null}

      {pages.length === 0 ? (
        <div className="rounded-md border border-zinc-200 bg-white">
          <EmptyState title="No pages yet" description="Create your first page above." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5">Page</th>
                <th className="px-4 py-2.5">URL</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">Sections</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pages.map((page) => (
                <tr key={page.id} className="text-zinc-700">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">{page.title}</span>
                    {page.isHomepage ? (
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-600">
                        Home
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    /{page.isHomepage ? "" : `${storeSlug}/${page.slug}`}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">{page.sections.length}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={page.published ? "text-emerald-600" : "text-zinc-400"}>
                      {page.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 text-xs font-medium">
                      <Link href={`/${storeSlug}${page.isHomepage ? "" : `/${page.slug}`}`} target="_blank" className="text-zinc-500 hover:text-zinc-900">
                        View
                      </Link>
                      <Link href={`/admin/${storeSlug}/storefront/pages/${page.id}`} className="text-zinc-900 hover:underline">
                        Edit
                      </Link>
                      {canEdit && !page.isHomepage ? (
                        <form action={deletePageAction}>
                          <input type="hidden" name="storeSlug" value={storeSlug} />
                          <input type="hidden" name="pageId" value={page.id} />
                          <button type="submit" className="text-red-600 hover:underline">
                            Delete
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
