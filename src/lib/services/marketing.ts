import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { discounts, notifications } from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";
import type { DiscountInput } from "@/lib/validation";

export async function listDiscounts(ctx: StoreContext) {
  return db
    .select()
    .from(discounts)
    .where(and(eq(discounts.storeId, ctx.store.id), isNull(discounts.deletedAt)))
    .orderBy(desc(discounts.createdAt));
}

export async function createDiscount(ctx: StoreContext, input: DiscountInput) {
  ctx.assert("discounts.update");
  const existing = await db.query.discounts.findFirst({
    where: and(eq(discounts.storeId, ctx.store.id), eq(discounts.code, input.code)),
  });
  if (existing) throw new Error("A discount with this code already exists");

  const [discount] = await db
    .insert(discounts)
    .values({
      storeId: ctx.store.id,
      name: input.name,
      code: input.code,
      type: input.type,
      value: input.value,
      appliesTo: input.appliesTo,
      productIds: input.productIds,
      categoryIds: input.categoryIds,
      minSubtotal: input.minSubtotal,
      usageLimit: input.usageLimit ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      status: input.status,
    })
    .returning();
  return discount;
}

export async function updateDiscount(ctx: StoreContext, id: string, input: Partial<DiscountInput>) {
  ctx.assert("discounts.update");
  const [discount] = await db
    .update(discounts)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(discounts.id, id), eq(discounts.storeId, ctx.store.id), isNull(discounts.deletedAt)))
    .returning();
  return discount;
}

export async function deleteDiscount(ctx: StoreContext, id: string) {
  ctx.assert("discounts.update");
  const [discount] = await db
    .update(discounts)
    .set({ deletedAt: new Date(), status: "paused", updatedAt: new Date() })
    .where(and(eq(discounts.id, id), eq(discounts.storeId, ctx.store.id)))
    .returning();
  return Boolean(discount);
}

export async function notifyStore(
  storeId: string,
  userId: string | null,
  input: { type: string; title: string; body?: string; data?: Record<string, unknown> },
) {
  const [notification] = await db
    .insert(notifications)
    .values({
      storeId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? {},
    })
    .returning();

  // Delivery to email/SMS/push is intentionally not implemented yet.
  return notification;
}

export async function listNotifications(ctx: StoreContext, userId: string) {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.storeId, ctx.store.id),
        eq(notifications.userId, userId),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(30);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
