import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, inventoryTransactions, productVariants, products } from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";

export async function listInventory(ctx: StoreContext, search?: string, lowStockOnly = false) {
  const storeId = ctx.store.id;
  const conditions = [eq(inventory.storeId, storeId)];
  if (search) {
    const term = `%${search}%`;
    conditions.push(sql`(${products.name} ILIKE ${term} OR ${productVariants.name} ILIKE ${term} OR ${products.sku} ILIKE ${term} OR ${productVariants.sku} ILIKE ${term})`);
  }
  if (lowStockOnly) {
    conditions.push(sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`);
  }

  const rows = await db
    .select({
      inventory,
      productName: products.name,
      variantName: productVariants.name,
      variantId: productVariants.id,
      productId: products.id,
    })
    .from(inventory)
    .leftJoin(productVariants, eq(productVariants.id, inventory.variantId))
    .leftJoin(products, eq(products.id, sql`coalesce(${inventory.productId}, ${productVariants.productId})`))
    .where(and(...conditions))
    .orderBy(inventory.lowStockThreshold, products.name)
    .limit(200);

  return rows;
}

export async function getInventoryHistory(ctx: StoreContext, inventoryId: string) {
  return db
    .select()
    .from(inventoryTransactions)
    .where(and(eq(inventoryTransactions.inventoryId, inventoryId), eq(inventoryTransactions.storeId, ctx.store.id)))
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(50);
}

export type AdjustmentInput = {
  inventoryId: string;
  delta: number;
  reason: string;
  note?: string;
  referenceType?: string;
  referenceId?: string;
  actorId?: string;
};

export async function adjustInventory(ctx: StoreContext, input: AdjustmentInput) {
  ctx.assert("inventory.update");

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(inventory)
      .where(and(eq(inventory.id, input.inventoryId), eq(inventory.storeId, ctx.store.id)))
      .for("update");

    const row = rows[0];
    if (!row) throw new Error("Inventory record not found");

    const quantityAfter = row.quantity + input.delta;
    if (quantityAfter < 0) throw new Error("Adjustment would make stock negative");

    const [updated] = await tx
      .update(inventory)
      .set({ quantity: quantityAfter, updatedAt: new Date() })
      .where(eq(inventory.id, row.id))
      .returning();

    const [transaction] = await tx
      .insert(inventoryTransactions)
      .values({
        storeId: ctx.store.id,
        inventoryId: row.id,
        delta: input.delta,
        quantityAfter,
        reason: input.reason,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        note: input.note ?? null,
        createdBy: input.actorId ?? null,
      })
      .returning();

    return { inventory: updated, transaction };
  });
}

export async function applyOrderStockChanges(
  storeId: string,
  items: { inventoryId: string | null; delta: number; reason: string; orderId: string }[],
) {
  for (const item of items) {
    if (!item.inventoryId || item.delta === 0) continue;
    const rows = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.id, item.inventoryId), eq(inventory.storeId, storeId)))
      .for("update");
    const row = rows[0];
    if (!row) continue;
    const quantityAfter = Math.max(0, row.quantity + item.delta);
    await db.update(inventory).set({ quantity: quantityAfter, updatedAt: new Date() }).where(eq(inventory.id, row.id));
    await db.insert(inventoryTransactions).values({
      storeId,
      inventoryId: row.id,
      delta: item.delta,
      quantityAfter,
      reason: item.reason,
      referenceType: "order",
      referenceId: item.orderId,
    });
  }
}

export async function ensureInventoryRow(
  storeId: string,
  target: { productId?: string | null; variantId?: string | null },
) {
  const where = target.variantId
    ? and(eq(inventory.storeId, storeId), eq(inventory.variantId, target.variantId))
    : and(eq(inventory.storeId, storeId), eq(inventory.productId, target.productId!), isNull(inventory.variantId));

  const existing = await db.query.inventory.findFirst({ where });
  if (existing) return existing;
  const [created] = await db
    .insert(inventory)
    .values({ storeId, productId: target.productId ?? null, variantId: target.variantId ?? null, quantity: 0 })
    .returning();
  return created;
}
