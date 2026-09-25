import type { Metadata } from "next";
import { SectionList } from "@/components/storefront/section-list";
import { EmptyState } from "@/components/ui/skeleton";
import { appBaseUrl, getHomepage, requirePublicStore, resolvePublicStore } from "@/lib/services/storefront";

type Props = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return {};
  const page = await getHomepage(data.store.id);
  const seo = (page?.seo ?? {}) as { title?: string; description?: string };
  const title = seo.title || page?.title || data.store.name;
  const description = seo.description || data.store.description || `${data.store.name} online store`;
  const url = `${appBaseUrl()}/${storeSlug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: data.store.name, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StoreHomePage({ params }: Props) {
  const { store: storeSlug } = await params;
  const data = await requirePublicStore(storeSlug);
  const page = await getHomepage(data.store.id);
  if (!page) {
    return (
      <EmptyState
        title="Nothing published yet"
        description="This store has no published homepage. Check back soon."
      />
    );
  }
  return <SectionList store={data.store} sections={page.sections} />;
}
