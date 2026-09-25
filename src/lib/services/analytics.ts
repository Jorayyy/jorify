import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, inventory, orderItems, orders, productCategories, productVariants, products } from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

export function rangeToDates(range: RangeKey, customFrom?: string, customTo?: string) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);

  switch (range) {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;
    case "7d":
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      break;
    case "90d":
      from.setDate(from.getDate() - 89);
      from.setHours(0, 0, 0, 0);
      break;
    case "custom": {
      const parsedFrom = customFrom ? new Date(customFrom) : new Date(to.getTime() - 30 * 86_400_000);
      const parsedTo = customTo ? new Date(customTo) : to;
      return {
        from: new Date(parsedFrom.setHours(0, 0, 0, 0)),
        to: new Date(parsedTo.setHours(23, 59, 59, 999)),
      };
    }
  }
  return { from, to };
}

const paidCondition = (storeId: string, from: Date, to: Date) =>
  and(
    eq(orders.storeId, storeId),
    gte(orders.createdAt, from),
    lte(orders.createdAt, to),
    sql`${orders.status} <> 'cancelled'`,
  );

export async function getDashboardData(ctx: StoreContext, range: RangeKey, customFrom?: string, customTo?: string) {
  const storeId = ctx.store.id;
  const { from, to } = rangeToDates(range, customFrom, customTo);

  const [totals, sales, topProducts, recentOrders, lowStock, newCustomers, repeatCount, totalCount] =
    await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
        count: sql<number>`count(*)::int`,
        average: sql<number>`coalesce(avg(${orders.total}), 0)::int`,
      })
      .from(orders)
      .where(paidCondition(storeId, from, to)),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(paidCondition(storeId, from, to))
      .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt})`),
    db
      .select({
        productId: orderItems.productId,
        title: orderItems.title,
        quantity: sql<number>`sum(${orderItems.quantity})::int`,
        revenue: sql<number>`sum(${orderItems.total})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(paidCondition(storeId, from, to))
      .groupBy(orderItems.productId, orderItems.title)
      .orderBy(desc(sql`sum(${orderItems.total})`))
      .limit(5),
    db
      .select({
        id: orders.id,
        number: orders.number,
        total: orders.total,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
        email: orders.email,
      })
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .orderBy(desc(orders.createdAt))
      .limit(6),
    db
      .select({
        inventoryId: inventory.id,
        quantity: inventory.quantity,
        threshold: inventory.lowStockThreshold,
        productId: productVariants.productId,
        variantName: productVariants.name,
        productName: products.name,
        sku: sql<string | null>`coalesce(${productVariants.sku}, ${products.sku})`,
      })
      .from(inventory)
      .leftJoin(productVariants, eq(productVariants.id, inventory.variantId))
      .leftJoin(products, eq(products.id, sql`coalesce(${inventory.productId}, ${productVariants.productId})`))
      .where(and(eq(inventory.storeId, storeId), sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`))
      .orderBy(inventory.quantity)
      .limit(8),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(and(eq(customers.storeId, storeId), gte(customers.createdAt, from), lte(customers.createdAt, to))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(and(eq(customers.storeId, storeId), gte(customers.ordersCount, 2))),
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.storeId, storeId)),
    ]);

  const totalsRow = totals[0] ?? { revenue: 0, count: 0, average: 0 };
  const totalCustomers = totalCount[0]?.count ?? 0;

  return {
    from,
    to,
    revenue: totalsRow.revenue ?? 0,
    orders: totalsRow.count ?? 0,
    averageOrderValue: totalsRow.average ?? 0,
    newCustomers: newCustomers[0]?.count ?? 0,
    totalCustomers,
    repeatCustomers: repeatCount[0]?.count ?? 0,
    sales,
    topProducts,
    recentOrders,
    lowStock,
  };
}

export async function getInventoryTurnover(ctx: StoreContext, days = 30) {
  const from = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({
      productId: orderItems.productId,
      title: orderItems.title,
      sold: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.total})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.storeId, ctx.store.id), gte(orders.createdAt, from)))
    .groupBy(orderItems.productId, orderItems.title)
    .orderBy(desc(sql`sum(${orderItems.total})`))
    .limit(10);
  return rows;
}

export async function salesByCategory(ctx: StoreContext, from: Date, to: Date) {
  return db
    .select({
      categoryId: products.categoryId,
      categoryName: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
      revenue: sql<number>`coalesce(sum(${orderItems.total}), 0)::int`,
      quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .leftJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
    .where(paidCondition(ctx.store.id, from, to))
    .groupBy(products.categoryId, productCategories.name)
    .orderBy(desc(sql`sum(${orderItems.total})`))
    .limit(10);
}
