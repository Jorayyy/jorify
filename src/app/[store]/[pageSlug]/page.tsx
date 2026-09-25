import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionList } from "@/components/storefront/section-list";
import { appBaseUrl, getStorePage, requirePublicStore, resolvePublicStore } from "@/lib/services/storefront";

type Props = { params: Promise<{ store: string; pageSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug, pageSlug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return {};
  const page = await getStorePage(data.store.id, pageSlug);
  if (!page) return {};
  const seo = (page.seo ?? {}) as { title?: string; description?: string };
  const title = seo.title || page.title;
  const description = seo.description || `${page.title} — ${data.store.name}`;
  const url = `${appBaseUrl()}/${storeSlug}/${pageSlug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: data.store.name },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StorePage({ params }: Props) {
  const { store: storeSlug, pageSlug } = await params;
  const data = await requirePublicStore(storeSlug);
  const page = await getStorePage(data.store.id, pageSlug);
  if (!page) notFound();
  return <SectionList store={data.store} sections={page.sections} />;
}
