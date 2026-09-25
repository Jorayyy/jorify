import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { customerAddresses, customers, orders } from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";

export type CustomerSegment = "new" | "returning" | "vip" | "inactive";

export function segmentOf(customer: typeof customers.$inferSelect): CustomerSegment {
  if (!customer.lastOrderAt) return "new";
  const daysSinceLastOrder = (Date.now() - customer.lastOrderAt.getTime()) / 86_400_000;
  if (daysSinceLastOrder > 120) return "inactive";
  if (customer.totalSpent >= 100_000 || customer.ordersCount >= 5) return "vip";
  if (customer.ordersCount > 1) return "returning";
  return "new";
}

export async function listCustomers(
  ctx: StoreContext,
  filters: { search?: string; segment?: string; page?: number } = {},
) {
  const storeId = ctx.store.id;
  const page = Math.max(1, filters.page ?? 1);
  const conditions = [eq(customers.storeId, storeId), isNull(customers.deletedAt)];
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        sql`${customers.firstName} ILIKE ${term}`,
        sql`${customers.lastName} ILIKE ${term}`,
        sql`${customers.email} ILIKE ${term}`,
        sql`${customers.phone} ILIKE ${term}`,
      )!,
    );
  }
  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt))
      .limit(20)
      .offset((page - 1) * 20),
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
  ]);

  const filtered = filters.segment ? rows.filter((row) => segmentOf(row) === filters.segment) : rows;

  return { rows: filtered, total: countResult[0]?.count ?? 0, page, pageSize: 20 };
}

export async function getCustomer(ctx: StoreContext, customerId: string) {
  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.storeId, ctx.store.id), isNull(customers.deletedAt)),
    with: { addresses: true, orders: { orderBy: [desc(orders.createdAt)], limit: 20 } },
  });
  return customer ?? null;
}

export async function createCustomer(
  ctx: StoreContext,
  input: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    tags?: string[];
    notes?: string;
  },
) {
  ctx.assert("customers.update");
  const [customer] = await db
    .insert(customers)
    .values({
      storeId: ctx.store.id,
      firstName: input.firstName,
      lastName: input.lastName ?? "",
      email: input.email?.toLowerCase() || null,
      phone: input.phone || null,
      tags: input.tags ?? [],
      notes: input.notes || null,
    })
    .returning();
  return customer;
}

export async function updateCustomer(
  ctx: StoreContext,
  customerId: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    tags: string[];
    notes: string;
  }>,
) {
  ctx.assert("customers.update");
  const [customer] = await db
    .update(customers)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.storeId, ctx.store.id), isNull(customers.deletedAt)))
    .returning();
  return customer;
}

export async function deleteCustomer(ctx: StoreContext, customerId: string) {
  ctx.assert("customers.delete");
  const [customer] = await db
    .update(customers)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.storeId, ctx.store.id)))
    .returning();
  return Boolean(customer);
}

export async function listCustomerAddresses(storeId: string, customerId: string) {
  return db
    .select()
    .from(customerAddresses)
    .where(and(eq(customerAddresses.storeId, storeId), eq(customerAddresses.customerId, customerId)))
    .orderBy(asc(customerAddresses.createdAt));
}
