import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  deliveryZones,
  inventory,
  productCategories,
  productImages,
  products,
  productVariants,
  shippingMethods,
  storeNavigation,
  storePages,
  storeSettings,
  storeThemes,
  stores,
} from "@/lib/db/schema";
import { validateDiscount } from "@/lib/services/orders";

export async function resolvePublicStore(slug: string) {
  const store = await db.query.stores.findFirst({
    where: and(eq(stores.slug, slug), isNull(stores.deletedAt), eq(stores.status, "active")),
    columns: { id: true, name: true, slug: true, description: true, businessType: true, currency: true, locale: true, logoUrl: true },
  });
  if (!store) return null;

  const [settings, theme, navigation, pages] = await Promise.all([
    db.query.storeSettings.findFirst({ where: eq(storeSettings.storeId, store.id) }),
    db.query.storeThemes.findFirst({ where: and(eq(storeThemes.storeId, store.id), eq(storeThemes.isPublished, true)) }),
    db
      .select()
      .from(storeNavigation)
      .where(eq(storeNavigation.storeId, store.id))
      .orderBy(storeNavigation.position),
    db
      .select({ id: storePages.id, title: storePages.title, slug: storePages.slug, published: storePages.published })
      .from(storePages)
      .where(and(eq(storePages.storeId, store.id), eq(storePages.published, true))),
  ]);

  return { store, settings, theme, navigation, pages };
}

export async function getStorePage(storeId: string, slug: string) {
  const page = await db.query.storePages.findFirst({
    where: and(eq(storePages.storeId, storeId), eq(storePages.slug, slug), eq(storePages.published, true)),
  });
  return page ?? null;
}

export async function getHomepage(storeId: string) {
  return db.query.storePages.findFirst({
    where: and(eq(storePages.storeId, storeId), eq(storePages.isHomepage, true), eq(storePages.published, true)),
  });
}

export async function listStorefrontCategories(storeId: string) {
  return db
    .select()
    .from(productCategories)
    .where(and(eq(productCategories.storeId, storeId), isNull(productCategories.deletedAt)))
    .orderBy(productCategories.position);
}

export type StorefrontProductFilters = { categorySlug?: string; search?: string; featured?: boolean; limit?: number };

export async function listStorefrontProducts(storeId: string, filters: StorefrontProductFilters = {}) {
  const conditions = [eq(products.storeId, storeId), eq(products.status, "active"), isNull(products.deletedAt)];
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(sql`${products.name} ILIKE ${term}`, sql`${products.shortDescription} ILIKE ${term}`)!);
  }
  if (filters.featured) conditions.push(eq(products.featured, true));
  if (filters.categorySlug) conditions.push(eq(productCategories.slug, filters.categorySlug));

  const rows = await db
    .select({ product: products, categoryName: productCategories.name, categorySlug: productCategories.slug })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(desc(products.featured), desc(products.createdAt))
    .limit(filters.limit ?? 48);

  const ids = rows.map((row) => row.product.id);
  const images = ids.length
    ? await db
        .select({
          productId: productImages.productId,
          url: productImages.url,
          alt: productImages.alt,
          position: productImages.position,
        })
        .from(productImages)
        .where(inArray(productImages.productId, ids))
        .orderBy(productImages.position)
    : [];

  return rows.map((row) => ({
    ...row.product,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    images: images.filter((image) => image.productId === row.product.id),
  }));
}

export async function getStorefrontProduct(storeId: string, slug: string) {
  const product = await db.query.products.findFirst({
    where: and(
      eq(products.storeId, storeId),
      eq(products.slug, slug),
      eq(products.status, "active"),
      isNull(products.deletedAt),
    ),
    with: {
      images: { orderBy: [productImages.position] },
      variants: { orderBy: [productVariants.position] },
      category: true,
    },
  });
  if (!product) return null;

  const variantIds = product.variants.map((variant) => variant.id);
  const baseInventory = await db.query.inventory.findFirst({
    where: and(eq(inventory.storeId, storeId), eq(inventory.productId, product.id)),
  });
  const variantStocks = variantIds.length
    ? await db.query.inventory.findMany({
        where: and(eq(inventory.storeId, storeId), inArray(inventory.variantId, variantIds)),
      })
    : [];

  return { ...product, baseInventory, variantStocks };
}

export const requirePublicStore = cache(async (slug: string) => {
  const data = await resolvePublicStore(slug);
  if (!data) notFound();
  return data;
});

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function estimateShippingFee(storeId: string, fulfillment: string): Promise<number> {
  if (fulfillment === "pickup") return 0;
  if (fulfillment === "delivery") {
    const [zone] = await db
      .select()
      .from(deliveryZones)
      .where(and(eq(deliveryZones.storeId, storeId), eq(deliveryZones.active, true)))
      .orderBy(asc(deliveryZones.createdAt))
      .limit(1);
    return zone?.fee ?? 0;
  }
  if (fulfillment === "shipping") {
    const [method] = await db
      .select()
      .from(shippingMethods)
      .where(and(eq(shippingMethods.storeId, storeId), eq(shippingMethods.active, true)))
      .orderBy(asc(shippingMethods.position))
      .limit(1);
    return method?.price ?? 0;
  }
  return 0;
}

export type TotalsCart = {
  subtotal: number;
  discountCode: string | null;
  items: { productId: string; quantity: number; unitPrice: number; product: { categoryId: string | null } }[];
};

export type CartTotals = {
  subtotal: number;
  discount: number;
  discountCode: string | null;
  discountError: string | null;
  shipping: number;
  tax: number;
  taxRate: number | null;
  total: number;
};

export async function computeCartTotals(
  storeId: string,
  cart: TotalsCart,
  fulfillment?: string | null,
): Promise<CartTotals> {
  const subtotal = cart.subtotal;
  const code = cart.discountCode?.trim() ? cart.discountCode.trim() : null;
  let discount = 0;
  let discountError: string | null = null;

  if (code) {
    const result = await validateDiscount(
      storeId,
      code,
      subtotal,
      cart.items.map((item) => ({
        productId: item.productId,
        categoryId: item.product.categoryId,
        total: item.unitPrice * item.quantity,
      })),
    );
    if (result.ok) discount = result.amount;
    else discountError = result.error;
  }

  const shipping =
    fulfillment === "delivery" || fulfillment === "shipping" ? await estimateShippingFee(storeId, fulfillment) : 0;

  const settings = await db.query.storeSettings.findFirst({ where: eq(storeSettings.storeId, storeId) });
  const taxConfig = (settings?.taxes ?? {}) as { enabled?: boolean; rate?: number };
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const tax =
    taxConfig.enabled && taxConfig.rate ? Math.round((taxableSubtotal * Number(taxConfig.rate)) / 100) : 0;

  return {
    subtotal,
    discount,
    discountCode: code,
    discountError,
    shipping,
    tax,
    taxRate: taxConfig.enabled && taxConfig.rate ? Number(taxConfig.rate) : null,
    total: taxableSubtotal + shipping + tax,
  };
}
