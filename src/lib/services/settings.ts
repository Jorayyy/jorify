import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, storeDomains, storeSettings, stores, subscriptions } from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";

export type SettingsSectionKey =
  | "contact"
  | "branding"
  | "checkout"
  | "payments"
  | "taxes"
  | "notifications"
  | "seo";

export async function getSettings(ctx: StoreContext) {
  const existing = await db.query.storeSettings.findFirst({
    where: eq(storeSettings.storeId, ctx.store.id),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(storeSettings)
    .values({ storeId: ctx.store.id })
    .onConflictDoNothing({ target: storeSettings.storeId })
    .returning();
  if (created) return created;
  return db.query.storeSettings.findFirst({ where: eq(storeSettings.storeId, ctx.store.id) }) ?? null;
}

export async function saveSettingsSection(
  ctx: StoreContext,
  key: SettingsSectionKey,
  patch: Record<string, unknown>,
) {
  ctx.assert("settings.update");
  const current = await getSettings(ctx);
  const section = { ...(((current?.[key] as Record<string, unknown> | null) ?? {}) as Record<string, unknown>), ...patch };
  await db
    .insert(storeSettings)
    .values({ storeId: ctx.store.id, [key]: section })
    .onConflictDoUpdate({
      target: storeSettings.storeId,
      set: { [key]: section, updatedAt: new Date() },
    });
  return section;
}

export async function saveStoreFields(
  ctx: StoreContext,
  fields: {
    name?: string;
    description?: string | null;
    currency?: string;
    locale?: string;
    status?: string;
    logoUrl?: string | null;
  },
) {
  ctx.assert("settings.update");
  const [store] = await db
    .update(stores)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(stores.id, ctx.store.id))
    .returning();
  return store;
}

export async function listDomains(ctx: StoreContext) {
  return db
    .select()
    .from(storeDomains)
    .where(eq(storeDomains.storeId, ctx.store.id))
    .orderBy(asc(storeDomains.createdAt));
}

export async function setPrimaryDomain(ctx: StoreContext, domainId: string) {
  ctx.assert("settings.update");
  return db.transaction(async (tx) => {
    await tx
      .update(storeDomains)
      .set({ isPrimary: false })
      .where(eq(storeDomains.storeId, ctx.store.id));
    const [updated] = await tx
      .update(storeDomains)
      .set({ isPrimary: true })
      .where(and(eq(storeDomains.id, domainId), eq(storeDomains.storeId, ctx.store.id)))
      .returning();
    return updated;
  });
}

export async function switchPlan(ctx: StoreContext, planCode: string) {
  ctx.assert("billing.manage");
  const plan = await db.query.plans.findFirst({
    where: and(eq(plans.code, planCode), eq(plans.active, true)),
  });
  if (!plan) throw new Error("Plan not available");
  await db
    .insert(subscriptions)
    .values({ organizationId: ctx.organization.id, planCode, status: "active" })
    .onConflictDoUpdate({
      target: subscriptions.organizationId,
      set: { planCode, status: "active", updatedAt: new Date() },
    });
  return plan;
}

export async function listPlans() {
  return db.select().from(plans).where(eq(plans.active, true)).orderBy(plans.position, plans.priceMonthly);
}

export async function getSubscription(organizationId: string) {
  return db.query.subscriptions.findFirst({ where: eq(subscriptions.organizationId, organizationId) });
}
