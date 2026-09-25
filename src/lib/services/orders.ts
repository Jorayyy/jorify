import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import {
  carts,
  customers,
  discounts,
  inventory,
  inventoryTransactions,
  orderEvents,
  orderItems,
  orders,
  productVariants,
  products,
  storeSettings,
} from "@/lib/db/schema";
import { captureError } from "@/lib/logging";
import type { StoreContext } from "@/lib/tenancy/context";

export type OrderItemInput = { productId: string; variantId?: string | null; quantity: number };
export type FulfillmentType = "delivery" | "pickup" | "shipping";

export type CreateOrderInput = {
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  fulfillment: FulfillmentType;
  address?: Record<string, unknown> | null;
  shippingTotal?: number;
  discountCode?: string | null;
  note?: string | null;
  items: OrderItemInput[];
  paymentProvider: string;
  cartId?: string | null;
  actorId?: string | null;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; number: string; total: number }
  | { ok: false; error: string };

const storeSettingsFor = async (storeId: string) => {
  const settings = await db.query.storeSettings.findFirst({ where: eq(storeSettings.storeId, storeId) });
  return settings;
};

export async function listOrders(
  ctx: StoreContext,
  filters: { status?: string; search?: string; page?: number; from?: Date; to?: Date } = {},
) {
  const storeId = ctx.store.id;
  const page = Math.max(1, filters.page ?? 1);
  const conditions = [eq(orders.storeId, storeId)];
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.from) conditions.push(gte(orders.createdAt, filters.from));
  if (filters.to) conditions.push(lte(orders.createdAt, filters.to));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(sql`(${orders.number} ILIKE ${term} OR ${orders.email} ILIKE ${term})`);
  }
  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select({
        order: orders,
        customerName: sql<string | null>`concat(${customers.firstName}, ' ', ${customers.lastName})`,
      })
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(20)
      .offset((page - 1) * 20),
    db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0, page, pageSize: 20 };
}

export async function getOrder(ctx: StoreContext, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.storeId, ctx.store.id)),
    with: { items: true, events: { orderBy: [desc(orderEvents.createdAt)] }, payments: true, customer: true },
  });
  return order ?? null;
}

type ResolvedItem = {
  product: typeof products.$inferSelect;
  variant: typeof productVariants.$inferSelect | null;
  inventoryId: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

type ResolveResult = { ok: true; items: ResolvedItem[] } | { ok: false; error: string };

async function resolveItems(storeId: string, items: OrderItemInput[]): Promise<ResolveResult> {
  const resolved: ResolvedItem[] = [];
  for (const item of items) {
    const product = await db.query.products.findFirst({
      where: and(eq(products.id, item.productId), eq(products.storeId, storeId), isNull(products.deletedAt)),
    });
    if (!product) return { ok: false, error: `Product unavailable: ${item.productId}` };

    let variant: (typeof productVariants.$inferSelect) | null = null;
    if (item.variantId) {
      variant =
        (await db.query.productVariants.findFirst({
          where: and(eq(productVariants.id, item.variantId), eq(productVariants.storeId, storeId)),
        })) ?? null;
      if (!variant) return { ok: false, error: `Variant unavailable: ${item.variantId}` };
    }

    const unitPrice = variant ? variant.price : product.price;
    let inventoryId: string | null = null;
    let available = Number.POSITIVE_INFINITY;

    if (product.trackInventory) {
      const row = item.variantId
        ? await db.query.inventory.findFirst({
            where: and(eq(inventory.storeId, storeId), eq(inventory.variantId, item.variantId)),
          })
        : await db.query.inventory.findFirst({
            where: and(eq(inventory.storeId, storeId), eq(inventory.productId, product.id), isNull(inventory.variantId)),
          });
      if (row) {
        inventoryId = row.id;
        available = row.quantity - row.reserved;
      }
    }

    if (item.quantity > available) return { ok: false, error: `Not enough stock for ${product.name}` };

    resolved.push({
      product,
      variant,
      inventoryId,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
    });
  }
  return { ok: true, items: resolved };
}

export type DiscountableItem = { productId: string; categoryId: string | null; total: number };

export function applyDiscountAmount(
  discountRow: typeof discounts.$inferSelect,
  subtotal: number,
  items: DiscountableItem[],
): number {
  if (discountRow.minSubtotal && subtotal < discountRow.minSubtotal) return 0;

  let applicable = subtotal;
  if (discountRow.appliesTo === "products") {
    applicable = items
      .filter((item) => discountRow.productIds.includes(item.productId))
      .reduce((sum, item) => sum + item.total, 0);
  } else if (discountRow.appliesTo === "categories") {
    applicable = items
      .filter((item) => item.categoryId && discountRow.categoryIds.includes(item.categoryId))
      .reduce((sum, item) => sum + item.total, 0);
  }
  if (applicable <= 0) return 0;

  if (discountRow.type === "percentage") return Math.round((applicable * discountRow.value) / 100);
  return Math.min(discountRow.value, applicable);
}

export async function validateDiscount(
  storeId: string,
  code: string,
  subtotal: number,
  items: DiscountableItem[],
): Promise<{ ok: true; discount: typeof discounts.$inferSelect; amount: number } | { ok: false; error: string }> {
  const row = await db.query.discounts.findFirst({
    where: and(eq(discounts.storeId, storeId), eq(discounts.code, code.toUpperCase()), isNull(discounts.deletedAt)),
  });
  if (!row || row.status !== "active") return { ok: false, error: "Discount code is not valid" };
  const now = new Date();
  if (row.startsAt && row.startsAt > now) return { ok: false, error: "Discount code is not active yet" };
  if (row.endsAt && row.endsAt < now) return { ok: false, error: "Discount code has expired" };
  if (row.usageLimit !== null && row.usedCount >= row.usageLimit)
    return { ok: false, error: "Discount code has reached its usage limit" };

  const amount = applyDiscountAmount(row, subtotal, items);
  if (amount <= 0) return { ok: false, error: "Discount does not apply to this order" };
  return { ok: true, discount: row, amount };
}

async function lockStore(tx: Tx, storeId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${storeId}))`);
}

async function nextOrderNumber(tx: Tx, storeId: string) {
  await lockStore(tx, storeId);
  const result = await tx.execute<{ count: number | string }>(
    sql`select count(*) as count from orders where store_id = ${storeId}`,
  );
  const count = Number(result.rows?.[0]?.count ?? 0);
  return `#${1001 + count}`;
}

export async function createOrder(storeId: string, input: CreateOrderInput): Promise<CreateOrderResult> {
  try {
    const resolved = await resolveItems(storeId, input.items);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    const items = resolved.items;
    if (!items.length) return { ok: false, error: "Your cart is empty" };

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountableItems: DiscountableItem[] = items.map((item) => ({
      productId: item.product.id,
      categoryId: item.product.categoryId,
      total: item.total,
    }));

    let discountTotal = 0;
    let discountCode: string | null = null;
    if (input.discountCode) {
      const result = await validateDiscount(storeId, input.discountCode, subtotal, discountableItems);
      if (!result.ok) return { ok: false, error: result.error };
      discountTotal = result.amount;
      discountCode = result.discount.code;
    }

    const shippingTotal = input.fulfillment === "pickup" ? 0 : (input.shippingTotal ?? 0);
    const settings = await storeSettingsFor(storeId);
    const taxConfig = (settings?.taxes ?? {}) as { enabled?: boolean; rate?: number };
    const taxableSubtotal = Math.max(0, subtotal - discountTotal);
    const taxTotal = taxConfig.enabled && taxConfig.rate
      ? Math.round((taxableSubtotal * Number(taxConfig.rate)) / 100)
      : 0;
    const total = taxableSubtotal + shippingTotal + taxTotal;

    const orderId = await db.transaction(async (tx) => {
      let customerId: string | null = null;
      if (input.email) {
        const existing = await tx.query.customers.findFirst({
          where: and(eq(customers.storeId, storeId), eq(customers.email, input.email.toLowerCase())),
        });
        if (existing) {
          customerId = existing.id;
        } else {
          const [created] = await tx
            .insert(customers)
            .values({
              storeId,
              email: input.email.toLowerCase(),
              firstName: input.firstName,
              lastName: input.lastName ?? "",
              phone: input.phone ?? null,
            })
            .returning();
          customerId = created.id;
        }
      }

      const number = await nextOrderNumber(tx, storeId);
      const [order] = await tx
        .insert(orders)
        .values({
          storeId,
          number,
          customerId,
          email: input.email.toLowerCase(),
          phone: input.phone ?? null,
          status: input.fulfillment === "pickup" ? "confirmed" : "pending",
          paymentStatus: input.paymentProvider === "manual" ? "pending" : "pending",
          fulfillmentType: input.fulfillment,
          subtotal,
          discountTotal,
          shippingTotal,
          taxTotal,
          total,
          currency: "PHP",
          discountCode,
          notes: input.note ?? null,
          shippingAddress: input.address ?? null,
          billingAddress: input.address ?? null,
        })
        .returning();

      for (const item of items) {
        await tx.insert(orderItems).values({
          storeId,
          orderId: order.id,
          productId: item.product.id,
          variantId: item.variant?.id ?? null,
          title: item.product.name,
          variantTitle: item.variant?.name ?? null,
          sku: item.variant?.sku ?? item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          requiresShipping: item.product.requiresShipping,
        });

        if (item.inventoryId) {
          const rows = await tx
            .select()
            .from(inventory)
            .where(and(eq(inventory.id, item.inventoryId), eq(inventory.storeId, storeId)))
            .for("update");
          const row = rows[0];
          if (row) {
            const quantityAfter = Math.max(0, row.quantity - item.quantity);
            await tx.update(inventory).set({ quantity: quantityAfter, updatedAt: new Date() }).where(eq(inventory.id, row.id));
            await tx.insert(inventoryTransactions).values({
              storeId,
              inventoryId: row.id,
              delta: -item.quantity,
              quantityAfter,
              reason: "order",
              referenceType: "order",
              referenceId: order.id,
            });
          }
        }
      }

      if (discountCode) {
        await tx
          .update(discounts)
          .set({ usedCount: sql`${discounts.usedCount} + 1`, updatedAt: new Date() })
          .where(and(eq(discounts.storeId, storeId), eq(discounts.code, discountCode)));
      }

      if (customerId) {
        await tx
          .update(customers)
          .set({
            ordersCount: sql`${customers.ordersCount} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${total}`,
            lastOrderAt: order.placedAt,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customerId));
      }

      await tx.insert(orderEvents).values({
        storeId,
        orderId: order.id,
        type: "created",
        body: `Order ${number} placed via ${input.fulfillment}`,
        actorId: input.actorId ?? null,
      });

      if (input.cartId) {
        await tx
          .update(carts)
          .set({ status: "converted", updatedAt: new Date() })
          .where(and(eq(carts.id, input.cartId), eq(carts.storeId, storeId)));
      }

      return order.id;
    });

    const created = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    return { ok: true, orderId, number: created?.number ?? "", total };
  } catch (error) {
    await captureError({ error, action: "createOrder", context: { storeId, items: input.items.length } });
    return { ok: false, error: "Could not place the order. Please try again." };
  }
}

export async function updateOrderStatus(
  ctx: StoreContext,
  orderId: string,
  status: string,
  note?: string,
) {
  ctx.assert("orders.update");
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.storeId, ctx.store.id)),
  });
  if (!order) throw new Error("Order not found");

  const cancelled = status === "cancelled";
  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(orders)
      .set({ status, updatedAt: new Date(), cancelledAt: cancelled ? new Date() : order.cancelledAt })
      .where(and(eq(orders.id, orderId), eq(orders.storeId, ctx.store.id)))
      .returning();

    await tx.insert(orderEvents).values({
      storeId: ctx.store.id,
      orderId,
      type: "status",
      body: note || `Status changed to ${status}`,
      actorId: ctx.user.id,
    });

    if (cancelled) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) {
        const row = item.variantId
          ? await tx.query.inventory.findFirst({
              where: and(eq(inventory.storeId, ctx.store.id), eq(inventory.variantId, item.variantId)),
            })
          : await tx.query.inventory.findFirst({
              where: and(
                eq(inventory.storeId, ctx.store.id),
                eq(inventory.productId, item.productId!),
                isNull(inventory.variantId),
              ),
            });
        if (!row) continue;
        const quantityAfter = row.quantity + item.quantity;
        await tx.update(inventory).set({ quantity: quantityAfter, updatedAt: new Date() }).where(eq(inventory.id, row.id));
        await tx.insert(inventoryTransactions).values({
          storeId: ctx.store.id,
          inventoryId: row.id,
          delta: item.quantity,
          quantityAfter,
          reason: "return",
          referenceType: "order",
          referenceId: orderId,
        });
      }
    }

    return updated;
  });

  return result;
}

export async function markOrderPaid(ctx: StoreContext, orderId: string, provider: string) {
  ctx.assert("orders.update");
  const [updated] = await db
    .update(orders)
    .set({ paymentStatus: "paid", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.storeId, ctx.store.id)))
    .returning();
  if (updated) {
    await db.insert(orderEvents).values({
      storeId: ctx.store.id,
      orderId,
      type: "payment",
      body: `Payment received via ${provider}`,
      actorId: ctx.user.id,
    });
  }
  return updated;
}

export async function orderStats(storeId: string, from: Date, to: Date) {
  const condition = and(
    eq(orders.storeId, storeId),
    gte(orders.createdAt, from),
    lte(orders.createdAt, to),
    sql`${orders.status} NOT IN ('cancelled')`,
  );
  const [row] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      count: sql<number>`count(*)::int`,
      average: sql<number>`coalesce(avg(${orders.total}), 0)::int`,
    })
    .from(orders)
    .where(condition);
  return row ?? { revenue: 0, count: 0, average: 0 };
}

export async function salesByDay(storeId: string, from: Date, to: Date) {
  return db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
        sql`${orders.status} NOT IN ('cancelled')`,
      ),
    )
    .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
    .orderBy(asc(sql`date_trunc('day', ${orders.createdAt})`));
}
