import Image from "next/image";
import Link from "next/link";
import type { listStorefrontProducts } from "@/lib/services/storefront";
import { formatMoney } from "@/lib/utils";

export type StorefrontProductListItem = Awaited<ReturnType<typeof listStorefrontProducts>>[number];

export function ProductCard({
  storeSlug,
  currency,
  product,
}: {
  storeSlug: string;
  currency: string;
  product: StorefrontProductListItem;
}) {
  const image = product.images[0];
  return (
    <Link
      href={`/${storeSlug}/products/${product.slug}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--sf-radius)] border transition-colors"
      style={{ borderColor: "var(--sf-color-border)" }}
    >
      <div className="relative aspect-square w-full overflow-hidden" style={{ background: "var(--sf-color-border)" }}>
        {image && image.url ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-4xl opacity-50"
            style={{ fontFamily: "var(--sf-font-heading)", color: "var(--sf-color-muted)" }}
          >
            {product.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.categoryName ? (
          <p className="truncate text-xs" style={{ color: "var(--sf-color-muted)" }}>
            {product.categoryName}
          </p>
        ) : null}
        <p className="line-clamp-2 text-sm font-medium leading-snug" style={{ color: "var(--sf-color-text)" }}>
          {product.name}
        </p>
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-1">
          <span className="text-sm font-semibold" style={{ color: "var(--sf-color-text)" }}>
            {formatMoney(product.price, currency)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price ? (
            <span className="text-xs line-through" style={{ color: "var(--sf-color-muted)" }}>
              {formatMoney(product.compareAtPrice, currency)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
