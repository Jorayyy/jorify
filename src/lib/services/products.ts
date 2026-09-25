import { and, desc, eq, ilike, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attributeDefinitions,
  inventory,
  inventoryTransactions,
  productCategories,
  productImages,
  products,
  productVariants,
} from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";
import type { ProductInput } from "@/lib/validation";

const PAGE_SIZE = 20;

export type ProductFilters = {
  search?: string;
  status?: string;
  categoryId?: string;
  type?: string;
  page?: number;
};

export async function listProducts(ctx: StoreContext, filters: ProductFilters = {}) {
  const storeId = ctx.store.id;
  const page = Math.max(1, filters.page ?? 1);
  const conditions = [eq(products.storeId, storeId), isNull(products.deletedAt)];

  if (filters.status) conditions.push(eq(products.status, filters.status));
  if (filters.type) conditions.push(eq(products.type, filters.type));
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(ilike(products.name, term), ilike(products.sku, term), ilike(products.slug, term))!);
  }

  const where = and(...conditions);

  const [rows, countResult, variantStockRows, directStockRows] = await Promise.all([
    db
      .select({ product: products, categoryName: productCategories.name })
      .from(products)
      .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    db
      .select({
        productId: productVariants.productId,
        stock: sql<number>`coalesce(sum(${inventory.quantity}), 0)::int`,
      })
      .from(productVariants)
      .innerJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(eq(productVariants.storeId, storeId))
      .groupBy(productVariants.productId),
    db
      .select({ productId: inventory.productId, stock: inventory.quantity })
      .from(inventory)
      .where(and(eq(inventory.storeId, storeId), isNull(inventory.variantId), isNotNull(inventory.productId))),
  ]);

  const stockByProduct = new Map<string, number>();
  for (const row of variantStockRows)
    if (row.productId) stockByProduct.set(row.productId, (stockByProduct.get(row.productId) ?? 0) + row.stock);
  for (const row of directStockRows)
    if (row.productId) stockByProduct.set(row.productId, (stockByProduct.get(row.productId) ?? 0) + row.stock);

  return {
    rows: rows.map((row) => ({ ...row, stock: stockByProduct.get(row.product.id) ?? 0 })),
    total: countResult[0]?.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getProduct(ctx: StoreContext, productId: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.storeId, ctx.store.id), isNull(products.deletedAt)),
    with: {
      images: { orderBy: [productImages.position] },
      variants: { orderBy: [productVariants.position] },
      category: true,
      inventory: true,
    },
  });
  if (!product) return null;

  const variantIds = product.variants.map((variant) => variant.id);
  const stocks = variantIds.length
    ? await db.select().from(inventory).where(and(eq(inventory.storeId, ctx.store.id), inArray(inventory.variantId, variantIds)))
    : [];

  return { ...product, variantStocks: stocks };
}

export async function listCategories(ctx: StoreContext) {
  return db
    .select()
    .from(productCategories)
    .where(and(eq(productCategories.storeId, ctx.store.id), isNull(productCategories.deletedAt)))
    .orderBy(productCategories.position, productCategories.name);
}

export async function listAttributes(ctx: StoreContext) {
  return db
    .select()
    .from(attributeDefinitions)
    .where(eq(attributeDefinitions.storeId, ctx.store.id))
    .orderBy(attributeDefinitions.position);
}

export async function createProduct(ctx: StoreContext, input: ProductInput) {
  ctx.assert("products.create");
  const storeId = ctx.store.id;

  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        storeId,
        name: input.name,
        slug: input.slug,
        type: input.type,
        status: input.status,
        description: input.description || null,
        shortDescription: input.shortDescription || null,
        sku: input.sku || null,
        price: input.price,
        compareAtPrice: input.compareAtPrice ?? null,
        cost: input.cost ?? null,
        categoryId: input.categoryId || null,
        tags: input.tags,
        weightGrams: input.weightGrams ?? null,
        featured: input.featured,
        trackInventory: input.trackInventory,
        requiresShipping: input.requiresShipping,
        taxable: input.taxable,
        durationMinutes: input.durationMinutes ?? null,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
      })
      .returning();

    for (const [index, image] of input.images.entries()) {
      await tx.insert(productImages).values({
        storeId,
        productId: product.id,
        url: image.url,
        alt: image.alt || null,
        position: index,
      });
    }

    if (input.variants.length > 0) {
      for (const [index, variant] of input.variants.entries()) {
        const [created] = await tx
          .insert(productVariants)
          .values({
            storeId,
            productId: product.id,
            name: variant.name,
            sku: variant.sku || null,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice ?? null,
            options: variant.options,
            position: index,
          })
          .returning();
        if (input.trackInventory) {
          const [row] = await tx
            .insert(inventory)
            .values({ storeId, variantId: created.id, quantity: variant.quantity, reserved: 0 })
            .returning();
          if (variant.quantity !== 0) {
            await tx.insert(inventoryTransactions).values({
              storeId,
              inventoryId: row.id,
              delta: variant.quantity,
              quantityAfter: variant.quantity,
              reason: "initial",
              note: "Product created",
            });
          }
        }
      }
    } else if (input.trackInventory) {
      const [row] = await tx
        .insert(inventory)
        .values({ storeId, productId: product.id, quantity: 0, reserved: 0 })
        .returning();
      await tx.insert(inventoryTransactions).values({
        storeId,
        inventoryId: row.id,
        delta: 0,
        quantityAfter: 0,
        reason: "initial",
        note: "Product created",
      });
    }

    return product;
  });
}

export async function updateProduct(ctx: StoreContext, productId: string, input: ProductInput) {
  ctx.assert("products.update");
  const storeId = ctx.store.id;

  const existing = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.storeId, storeId)),
  });
  if (!existing) throw new Error("Product not found");

  return db.transaction(async (tx) => {
    const [product] = await tx
      .update(products)
      .set({
        name: input.name,
        slug: input.slug,
        type: input.type,
        status: input.status,
        description: input.description || null,
        shortDescription: input.shortDescription || null,
        sku: input.sku || null,
        price: input.price,
        compareAtPrice: input.compareAtPrice ?? null,
        cost: input.cost ?? null,
        categoryId: input.categoryId || null,
        tags: input.tags,
        weightGrams: input.weightGrams ?? null,
        featured: input.featured,
        trackInventory: input.trackInventory,
        requiresShipping: input.requiresShipping,
        taxable: input.taxable,
        durationMinutes: input.durationMinutes ?? null,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
      .returning();

    if (input.images.length >= 0) {
      await tx.delete(productImages).where(eq(productImages.productId, productId));
      for (const [index, image] of input.images.entries()) {
        await tx.insert(productImages).values({
          storeId,
          productId,
          url: image.url,
          alt: image.alt || null,
          position: index,
        });
      }
    }

    const keptVariantIds = input.variants.map((variant) => variant.id).filter(Boolean) as string[];
    if (keptVariantIds.length) {
      await tx
        .delete(productVariants)
        .where(and(eq(productVariants.productId, productId), notInArray(productVariants.id, keptVariantIds)));
    } else {
      await tx.delete(productVariants).where(eq(productVariants.productId, productId));
    }

    for (const [index, variant] of input.variants.entries()) {
      if (variant.id) {
        await tx
          .update(productVariants)
          .set({
            name: variant.name,
            sku: variant.sku || null,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice ?? null,
            options: variant.options,
            position: index,
            updatedAt: new Date(),
          })
          .where(and(eq(productVariants.id, variant.id), eq(productVariants.storeId, storeId)));
      } else {
        const [created] = await tx
          .insert(productVariants)
          .values({
            storeId,
            productId,
            name: variant.name,
            sku: variant.sku || null,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice ?? null,
            options: variant.options,
            position: index,
          })
          .returning();
        await tx.insert(inventory).values({ storeId, variantId: created.id, quantity: variant.quantity });
      }
    }

    return product;
  });
}

export async function deleteProduct(ctx: StoreContext, productId: string) {
  ctx.assert("products.delete");
  const [product] = await db
    .update(products)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.storeId, ctx.store.id), isNull(products.deletedAt)))
    .returning();
  return Boolean(product);
}

export async function createCategory(
  ctx: StoreContext,
  input: { name: string; slug: string; description?: string; imageUrl?: string; parentId?: string | null; position?: number },
) {
  ctx.assert("products.create");
  const [category] = await db
    .insert(productCategories)
    .values({
      storeId: ctx.store.id,
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      parentId: input.parentId ?? null,
      position: input.position ?? 0,
    })
    .returning();
  return category;
}

export async function updateCategory(
  ctx: StoreContext,
  categoryId: string,
  input: { name: string; slug: string; description?: string; imageUrl?: string; parentId?: string | null; position?: number },
) {
  ctx.assert("products.update");
  const [category] = await db
    .update(productCategories)
    .set({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      parentId: input.parentId ?? null,
      position: input.position ?? 0,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.storeId, ctx.store.id),
        isNull(productCategories.deletedAt),
      ),
    )
    .returning();
  return category;
}

export async function deleteCategory(ctx: StoreContext, categoryId: string) {
  ctx.assert("products.delete");
  const [category] = await db
    .update(productCategories)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(productCategories.id, categoryId), eq(productCategories.storeId, ctx.store.id)))
    .returning();
  return Boolean(category);
}

export async function listProductOptions(ctx: StoreContext, search = "") {
  const conditions = [eq(products.storeId, ctx.store.id), isNull(products.deletedAt)];
  if (search) {
    const term = `%${search}%`;
    conditions.push(or(ilike(products.name, term), ilike(products.sku, term))!);
  }
  return db
    .select({ id: products.id, name: products.name, sku: products.sku })
    .from(products)
    .where(and(...conditions))
    .orderBy(products.name)
    .limit(50);
}
