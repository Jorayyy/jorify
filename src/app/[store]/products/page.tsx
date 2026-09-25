import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/product-card";
import { EmptyState } from "@/components/ui/skeleton";
import { sfButtonStyle } from "@/lib/storefront/themes";
import {
  appBaseUrl,
  listStorefrontCategories,
  listStorefrontProducts,
  requirePublicStore,
  resolvePublicStore,
} from "@/lib/services/storefront";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return {};
  const title = `Products — ${data.store.name}`;
  return {
    title: { absolute: title },
    description: data.store.description || `Browse products from ${data.store.name}.`,
    alternates: { canonical: `${appBaseUrl()}/${storeSlug}/products` },
    openGraph: { title, description: data.store.description ?? undefined, siteName: data.store.name },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { store: storeSlug } = await params;
  const { q } = await searchParams;
  const data = await requirePublicStore(storeSlug);
  const search = q?.trim() || undefined;

  const [categories, products] = await Promise.all([
    listStorefrontCategories(data.store.id),
    listStorefrontProducts(data.store.id, { search }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="font-semibold leading-tight tracking-tight"
            style={{ fontFamily: "var(--sf-font-heading)", fontSize: "var(--sf-h2)" }}
          >
            Products
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--sf-color-muted)" }}>
            {search ? `${products.length} results for ${search}` : `${products.length} products`}
          </p>
        </div>
        <form action={`/${storeSlug}/products`} className="flex w-full max-w-xs gap-2">
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search products"
            aria-label="Search products"
            className="h-9 w-full min-w-0 rounded-[var(--sf-radius)] border bg-white px-3 text-sm"
            style={{ borderColor: "var(--sf-color-border)", color: "var(--sf-color-text)" }}
          />
          <button type="submit" className="h-9 shrink-0 px-4 text-sm font-medium" style={sfButtonStyle()}>
            Search
          </button>
        </form>
      </div>

      {categories.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/${storeSlug}/products`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              !search ? "text-white" : "text-zinc-600 hover:bg-zinc-50",
            )}
            style={
              !search
                ? { background: "var(--sf-color-primary)", borderColor: "var(--sf-color-primary)", color: "var(--sf-color-on-primary)" }
                : { borderColor: "var(--sf-color-border)" }
            }
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${storeSlug}/categories/${category.slug}`}
              className="rounded-full border px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              style={{ borderColor: "var(--sf-color-border)" }}
            >
              {category.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        {products.length === 0 ? (
          <EmptyState
            title="No products found"
            description={search ? "Try a different search term." : "This store has no products yet."}
          />
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
