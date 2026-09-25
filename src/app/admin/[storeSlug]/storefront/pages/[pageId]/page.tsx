import { and, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { storePages } from "@/lib/db/schema";
import { SECTION_REGISTRY } from "@/lib/storefront/sections";
import { requireStoreContext } from "@/lib/tenancy/context";
import { SectionEditor } from "./section-editor";

type Props = { params: Promise<{ storeSlug: string; pageId: string }> };

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function PageEditor({ params }: Props) {
  const { storeSlug, pageId } = await params;
  const ctx = await requireStoreContext(storeSlug);

  const page = await db.query.storePages.findFirst({
    where: and(eq(storePages.id, pageId), eq(storePages.storeId, ctx.store.id)),
  });
  if (!page) notFound();

  const seo = (page.seo ?? {}) as Record<string, unknown>;
  const options = Object.entries(SECTION_REGISTRY).map(([type, def]) => ({
    type,
    label: def.label,
    defaults: def.settingsDefaults,
  }));

  return (
    <div>
      <Link
        href={`/admin/${storeSlug}/storefront`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Storefront
      </Link>
      <PageHeader title={page.title} description={`Editing /${page.isHomepage ? "" : `${storeSlug}/${page.slug}`}`} />
      <SectionEditor
        storeSlug={storeSlug}
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          isHomepage: page.isHomepage,
          published: page.published,
          seoTitle: str(seo.title),
          seoDescription: str(seo.description),
        }}
        sections={page.sections.map((section) => ({
          id: section.id,
          type: section.type,
          enabled: section.enabled !== false,
          settings: section.settings ?? {},
        }))}
        options={options}
        canEdit={ctx.can("storefront.update")}
      />
    </div>
  );
}
