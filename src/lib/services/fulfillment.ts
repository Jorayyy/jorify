import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deliveryZones, shippingMethods } from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";

export type ShippingMethodInput = {
  name: string;
  price: number;
  estimatedDays?: string;
  active?: boolean;
  position?: number;
};

export type DeliveryZoneInput = {
  name: string;
  regions: string[];
  fee: number;
  minOrder?: number;
  estimatedDays?: string;
  active?: boolean;
};

export async function listShippingMethods(ctx: StoreContext) {
  return db
    .select()
    .from(shippingMethods)
    .where(eq(shippingMethods.storeId, ctx.store.id))
    .orderBy(asc(shippingMethods.position), asc(shippingMethods.name));
}

export async function createShippingMethod(ctx: StoreContext, input: ShippingMethodInput) {
  ctx.assert("settings.update");
  const [row] = await db
    .insert(shippingMethods)
    .values({
      storeId: ctx.store.id,
      name: input.name,
      price: input.price,
      estimatedDays: input.estimatedDays || null,
      active: input.active ?? true,
      position: input.position ?? 0,
    })
    .returning();
  return row;
}

export async function updateShippingMethod(ctx: StoreContext, id: string, input: ShippingMethodInput) {
  ctx.assert("settings.update");
  const [row] = await db
    .update(shippingMethods)
    .set({
      name: input.name,
      price: input.price,
      estimatedDays: input.estimatedDays || null,
      active: input.active ?? true,
      position: input.position ?? 0,
    })
    .where(and(eq(shippingMethods.id, id), eq(shippingMethods.storeId, ctx.store.id)))
    .returning();
  return row;
}

export async function deleteShippingMethod(ctx: StoreContext, id: string) {
  ctx.assert("settings.update");
  await db
    .delete(shippingMethods)
    .where(and(eq(shippingMethods.id, id), eq(shippingMethods.storeId, ctx.store.id)));
}

export async function listDeliveryZones(ctx: StoreContext) {
  return db
    .select()
    .from(deliveryZones)
    .where(eq(deliveryZones.storeId, ctx.store.id))
    .orderBy(asc(deliveryZones.name));
}

export async function createDeliveryZone(ctx: StoreContext, input: DeliveryZoneInput) {
  ctx.assert("settings.update");
  const [row] = await db
    .insert(deliveryZones)
    .values({
      storeId: ctx.store.id,
      name: input.name,
      regions: input.regions,
      fee: input.fee,
      minOrder: input.minOrder ?? 0,
      estimatedDays: input.estimatedDays || null,
      active: input.active ?? true,
    })
    .returning();
  return row;
}

export async function updateDeliveryZone(ctx: StoreContext, id: string, input: DeliveryZoneInput) {
  ctx.assert("settings.update");
  const [row] = await db
    .update(deliveryZones)
    .set({
      name: input.name,
      regions: input.regions,
      fee: input.fee,
      minOrder: input.minOrder ?? 0,
      estimatedDays: input.estimatedDays || null,
      active: input.active ?? true,
    })
    .where(and(eq(deliveryZones.id, id), eq(deliveryZones.storeId, ctx.store.id)))
    .returning();
  return row;
}

export async function deleteDeliveryZone(ctx: StoreContext, id: string) {
  ctx.assert("settings.update");
  await db.delete(deliveryZones).where(and(eq(deliveryZones.id, id), eq(deliveryZones.storeId, ctx.store.id)));
}
