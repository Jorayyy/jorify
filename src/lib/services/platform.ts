import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { rangeToDates, type RangeKey } from "@/lib/services/analytics";
import { listUserOrganizations } from "@/lib/tenancy/context";

export async function listOwnedStores(userId: string) {
  const memberships = await listUserOrganizations(userId);
  const organizationIds = memberships.map((row) => row.organization.id);
  if (organizationIds.length === 0) return [];
  return db
    .select()
    .from(stores)
    .where(and(inArray(stores.organizationId, organizationIds), isNull(stores.deletedAt)));
}

const rangeCondition = (storeIds: string[], from: Date, to: Date) =>
  and(
    inArray(orders.storeId, storeIds),
    gte(orders.createdAt, from),
    lte(orders.createdAt, to),
    sql`${orders.status} <> 'cancelled'`,
  );

export async function salesByStore(storeIds: string[], from: Date, to: Date) {
  if (storeIds.length === 0) return [];
  return db
    .select({
      storeId: orders.storeId,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(rangeCondition(storeIds, from, to))
    .groupBy(orders.storeId);
}

export async function getPlatformOverview(userId: string, range: RangeKey) {
  const storeRows = await listOwnedStores(userId);
  const storeIds = storeRows.map((store) => store.id);
  const { from, to } = rangeToDates(range);

  const empty = {
    from,
    to,
    revenue: 0,
    orders: 0,
    averageOrderValue: 0,
    stores: storeRows,
    byStore: [] as { storeId: string; revenue: number; count: number }[],
    sales: [] as { day: string; revenue: number; count: number }[],
    recentOrders: [] as {
      id: string;
      number: string;
      total: number;
      status: string;
      email: string | null;
      createdAt: Date;
      storeId: string;
      storeSlug: string;
      storeName: string;
    }[],
  };
  if (storeIds.length === 0) return empty;

  const [totals, byStore, sales, recentOrders] = await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
        count: sql<number>`count(*)::int`,
        average: sql<number>`coalesce(avg(${orders.total}), 0)::int`,
      })
      .from(orders)
      .where(rangeCondition(storeIds, from, to)),
    salesByStore(storeIds, from, to),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(rangeCondition(storeIds, from, to))
      .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt})`),
    db
      .select({
        id: orders.id,
        number: orders.number,
        total: orders.total,
        status: orders.status,
        email: orders.email,
        createdAt: orders.createdAt,
        storeId: orders.storeId,
        storeSlug: stores.slug,
        storeName: stores.name,
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(inArray(orders.storeId, storeIds))
      .orderBy(desc(orders.createdAt))
      .limit(8),
  ]);

  const totalsRow = totals[0] ?? { revenue: 0, count: 0, average: 0 };
  return {
    ...empty,
    revenue: totalsRow.revenue ?? 0,
    orders: totalsRow.count ?? 0,
    averageOrderValue: totalsRow.average ?? 0,
    byStore,
    sales,
    recentOrders,
  };
}
