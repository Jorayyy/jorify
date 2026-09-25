import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/storefront/product-form";
import { appBaseUrl, getStorefrontProduct, requirePublicStore, resolvePublicStore } from "@/lib/services/storefront";

type Props = { params: Promise<{ store: string; slug: string }> };

function galleryUrl(value: string | null): string {
  const url = (value ?? "").trim();
  return /^https?:\/\//i.test(url) || url.startsWith("/") ? url : "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug, slug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return {};
  const product = await getStorefrontProduct(data.store.id, slug);
  if (!product) return {};
  const description =
    product.seoDescription ||
    product.shortDescription ||
    (product.description ? product.description.slice(0, 160) : `${product.name} at ${data.store.name}`);
  const title = product.seoTitle || product.name;
  const image = galleryUrl(product.images[0]?.url ?? null);
  const url = `${appBaseUrl()}/${storeSlug}/products/${slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: data.store.name, type: "website", images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function StorefrontProductPage({ params }: Props) {
  const { store: storeSlug, slug } = await params;
  const data = await requirePublicStore(storeSlug);
  const product = await getStorefrontProduct(data.store.id, slug);
  if (!product) notFound();

  const tracked = product.trackInventory;
  const baseStock =
    tracked && product.baseInventory ? product.baseInventory.quantity - product.baseInventory.reserved : null;
  const variantStock: Record<string, number> = {};
  if (tracked) {
    for (const row of product.variantStocks) {
      if (row.variantId) variantStock[row.variantId] = row.quantity - row.reserved;
    }
  }

  const images = product.images
    .map((image) => galleryUrl(image.url))
    .filter((url) => url !== "");
  const outOfStock = product.variants.length === 0 && baseStock !== null && baseStock <= 0;
  const url = `${appBaseUrl()}/${storeSlug}/products/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description || undefined,
    sku: product.sku || undefined,
    url,
    brand: { "@type": "Organization", name: data.store.name },
    category: product.category?.name || undefined,
    image: images.length > 0 ? images : undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: data.store.currency,
      price: (product.price / 100).toFixed(2),
      availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm" style={{ color: "var(--sf-color-muted)" }}>
        <Link href={`/${storeSlug}/products`} className="hover:underline">
          Products
        </Link>
        {product.category ? (
          <>
            <span aria-hidden>/</span>
            <Link href={`/${storeSlug}/categories/${product.category.slug}`} className="hover:underline">
              {product.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          {images.length > 0 ? (
            <>
              <div
                className="relative aspect-square w-full overflow-hidden rounded-[var(--sf-radius)] border"
                style={{ borderColor: "var(--sf-color-border)" }}
              >
                <Image
                  src={images[0]}
                  alt={product.images[0]?.alt ?? product.name}
                  fill
                  unoptimized
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              {images.length > 1 ? (
                <div className="grid grid-cols-4 gap-3">
                  {images.slice(1).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="relative aspect-square w-full overflow-hidden rounded-[var(--sf-radius)] border"
                      style={{ borderColor: "var(--sf-color-border)" }}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} ${index + 2}`}
                        fill
                        unoptimized
                        sizes="150px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div
              className="flex aspect-square w-full items-center justify-center rounded-[var(--sf-radius)] border text-5xl"
              style={{ borderColor: "var(--sf-color-border)", color: "var(--sf-color-muted)" }}
            >
              {product.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1
            className="font-semibold leading-tight tracking-tight"
            style={{ fontFamily: "var(--sf-font-heading)", fontSize: "var(--sf-h2)" }}
          >
            {product.name}
          </h1>
          {product.shortDescription ? (
            <p className="mt-2 text-sm" style={{ color: "var(--sf-color-muted)" }}>
              {product.shortDescription}
            </p>
          ) : null}

          <ProductForm
            storeSlug={storeSlug}
            currency={data.store.currency}
            productId={product.id}
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              options: variant.options ?? [],
            }))}
            variantStock={variantStock}
            baseStock={baseStock}
          />

          {product.sku ? (
            <p className="mt-6 text-xs" style={{ color: "var(--sf-color-muted)" }}>
              SKU: {product.sku}
            </p>
          ) : null}

          {product.description ? (
            <div className="mt-6 border-t pt-6" style={{ borderColor: "var(--sf-color-border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--sf-color-text)" }}>
                Description
              </h2>
              <p
                className="mt-3 whitespace-pre-line text-[length:var(--sf-body)] leading-relaxed"
                style={{ color: "var(--sf-color-muted)" }}
              >
                {product.description}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
