import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { EmptyState } from "@/components/ui/skeleton";
import {
  appBaseUrl,
  listStorefrontCategories,
  listStorefrontProducts,
  requirePublicStore,
  resolvePublicStore,
} from "@/lib/services/storefront";

type Props = { params: Promise<{ store: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug, slug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return {};
  const categories = await listStorefrontCategories(data.store.id);
  const category = categories.find((row) => row.slug === slug);
  if (!category) return {};
  const title = `${category.name} — ${data.store.name}`;
  const description = category.description || `Shop ${category.name} at ${data.store.name}.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${appBaseUrl()}/${storeSlug}/categories/${slug}` },
    openGraph: { title, description, siteName: data.store.name },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { store: storeSlug, slug } = await params;
  const data = await requirePublicStore(storeSlug);
  const categories = await listStorefrontCategories(data.store.id);
  const category = categories.find((row) => row.slug === slug);
  if (!category) notFound();

  const products = await listStorefrontProducts(data.store.id, { categorySlug: slug });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--sf-color-muted)" }}>
            Category
          </p>
          <h1
            className="mt-1 font-semibold leading-tight tracking-tight"
            style={{ fontFamily: "var(--sf-font-heading)", fontSize: "var(--sf-h2)" }}
          >
            {category.name}
          </h1>
          {category.description ? (
            <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--sf-color-muted)" }}>
              {category.description}
            </p>
          ) : null}
        </div>
        <p className="text-sm" style={{ color: "var(--sf-color-muted)" }}>
          {products.length} products
        </p>
      </div>

      <div className="mt-6">
        {products.length === 0 ? (
          <EmptyState title="No products in this category" description="Nothing is available here yet." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} storeSlug={storeSlug} currency={data.store.currency} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
