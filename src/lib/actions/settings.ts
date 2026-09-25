"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { captureError } from "@/lib/logging";
import {
  createDeliveryZone,
  createShippingMethod,
  deleteDeliveryZone,
  deleteShippingMethod,
  updateDeliveryZone,
  updateShippingMethod,
} from "@/lib/services/fulfillment";
import { saveSettingsSection, saveStoreFields, setPrimaryDomain, switchPlan } from "@/lib/services/settings";
import { ForbiddenError, requireStoreContext } from "@/lib/tenancy/context";

type State = { error?: string; message?: string } | null;

const toMoney = (value: FormDataEntryValue | null): number | null => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
};

const toInt = (value: FormDataEntryValue | null): number => {
  const parsed = Number(String(value ?? ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Check the form fields";

const generalSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code such as PHP"),
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a locale such as en-PH"),
});

const brandSchema = z.object({
  logoUrl: z.string().url().or(z.literal("")),
  colors: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    text: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
  }),
});

const checkoutSchema = z.object({
  guestCheckout: z.boolean(),
  requirePhone: z.boolean(),
  orderNotes: z.boolean(),
});

const taxesSchema = z.object({
  enabled: z.boolean(),
  rate: z.number().min(0).max(100),
});

const notificationsSchema = z.object({
  orderUpdates: z.boolean(),
  lowStockAlerts: z.boolean(),
  marketingEmails: z.boolean(),
});

const seoSchema = z.object({
  title: z.string().max(70),
  description: z.string().max(160),
});

const storefrontSchema = z.object({
  visible: z.boolean(),
  flags: z.object({
    showAnnouncementBar: z.boolean(),
    enableSearch: z.boolean(),
    showSocialLinks: z.boolean(),
  }),
});

const shippingSchema = z.object({
  name: z.string().min(1).max(80),
  price: z.number().int().min(0),
  estimatedDays: z.string().max(40),
  active: z.boolean(),
  position: z.number().int().min(0),
});

const zoneSchema = z.object({
  name: z.string().min(1).max(80),
  regions: z.array(z.string().min(1).max(60)).min(1),
  fee: z.number().int().min(0),
  minOrder: z.number().int().min(0),
  estimatedDays: z.string().max(40),
  active: z.boolean(),
});

export async function saveGeneralAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);
  const parsed = generalSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    currency: String(formData.get("currency") ?? "").trim().toUpperCase(),
    locale: String(formData.get("locale") ?? "").trim(),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await saveStoreFields(ctx, {
      name: parsed.data.name,
      description: parsed.data.description || null,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveGeneralSettings", context: { storeId: ctx.store.id } });
    return { error: "Could not save general settings" };
  }

  revalidatePath(`/admin/${storeSlug}`);
  return { message: "General settings saved" };
}

export async function saveBrandingAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);
  const parsed = brandSchema.safeParse({
    logoUrl: String(formData.get("logoUrl") ?? "").trim(),
    colors: {
      primary: String(formData.get("colorPrimary") ?? "").trim(),
      accent: String(formData.get("colorAccent") ?? "").trim(),
      background: String(formData.get("colorBackground") ?? "").trim(),
      text: String(formData.get("colorText") ?? "").trim(),
    },
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await saveStoreFields(ctx, { logoUrl: parsed.data.logoUrl || null });
    await saveSettingsSection(ctx, "branding", { colors: parsed.data.colors });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveBrandingSettings", context: { storeId: ctx.store.id } });
    return { error: "Could not save branding settings" };
  }

  revalidatePath(`/admin/${storeSlug}`);
  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "Branding saved" };
}

export async function saveStorefrontAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);
  const parsed = storefrontSchema.safeParse({
    visible: formData.has("visible"),
    flags: {
      showAnnouncementBar: formData.has("showAnnouncementBar"),
      enableSearch: formData.has("enableSearch"),
      showSocialLinks: formData.has("showSocialLinks"),
    },
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await saveStoreFields(ctx, { status: parsed.data.visible ? "active" : "paused" });
    await saveSettingsSection(ctx, "branding", { storefront: parsed.data.flags });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveStorefrontSettings", context: { storeId: ctx.store.id } });
    return { error: "Could not save storefront settings" };
  }

  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "Storefront settings saved" };
}

export async function saveCheckoutAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);
  const parsed = checkoutSchema.safeParse({
    guestCheckout: formData.has("guestCheckout"),
    requirePhone: formData.has("requirePhone"),
    orderNotes: formData.has("orderNotes"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await saveSettingsSection(ctx, "checkout", parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveCheckoutSettings", context: { storeId: ctx.store.id } });
    return { error: "Could not save checkout settings" };
  }

  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "Checkout settings saved" };
}

export async function saveTaxesAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);
  const parsed = taxesSchema.safeParse({
    enabled: formData.has("enabled"),
    rate: Number(String(formData.get("rate") ?? "0")),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await saveSettingsSection(ctx, "taxes", parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveTaxSettings", context: { storeId: ctx.store.id } });
    return { error: "Could not save tax settings" };
  }

  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "Tax settings saved" };
}

export async function saveNotificationsAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);
  const parsed = notificationsSchema.safeParse({
    orderUpdates: formData.has("orderUpdates"),
    lowStockAlerts: formData.has("lowStockAlerts"),
    marketingEmails: formData.has("marketingEmails"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await saveSettingsSection(ctx, "notifications", parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveNotificationSettings", context: { storeId: ctx.store.id } });
    return { error: "Could not save notification settings" };
  }

  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "Notification settings saved" };
}

export async function saveSeoAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);
  const parsed = seoSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await saveSettingsSection(ctx, "seo", parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveSeoSettings", context: { storeId: ctx.store.id } });
    return { error: "Could not save SEO settings" };
  }

  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "SEO settings saved" };
}

export async function setPrimaryDomainAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const domainId = String(formData.get("domainId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  try {
    const updated = await setPrimaryDomain(ctx, domainId);
    if (!updated) return { error: "Domain not found" };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "setPrimaryDomain", context: { storeId: ctx.store.id, domainId } });
    return { error: "Could not set the primary domain" };
  }
  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "Primary domain updated" };
}

export async function saveShippingAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const methodId = String(formData.get("methodId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  const price = toMoney(formData.get("price"));
  if (price === null) return { error: "Enter a valid price" };

  const parsed = shippingSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    price,
    estimatedDays: String(formData.get("estimatedDays") ?? "").trim(),
    active: formData.has("active"),
    position: toInt(formData.get("position")),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    if (methodId) {
      await updateShippingMethod(ctx, methodId, parsed.data);
    } else {
      await createShippingMethod(ctx, parsed.data);
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveShippingMethod", context: { storeId: ctx.store.id } });
    return { error: "Could not save the shipping method" };
  }

  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: methodId ? "Shipping method updated" : "Shipping method added" };
}

export async function deleteShippingAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const methodId = String(formData.get("methodId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  try {
    await deleteShippingMethod(ctx, methodId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "deleteShippingMethod", context: { storeId: ctx.store.id } });
    return { error: "Could not delete the shipping method" };
  }
  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "Shipping method deleted" };
}

export async function saveZoneAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const zoneId = String(formData.get("zoneId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  const fee = toMoney(formData.get("fee"));
  const minOrder = toMoney(formData.get("minOrder"));
  if (fee === null || minOrder === null) return { error: "Enter a valid amount" };

  const parsed = zoneSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    regions: String(formData.get("regions") ?? "")
      .split(",")
      .map((region) => region.trim())
      .filter(Boolean),
    fee,
    minOrder,
    estimatedDays: String(formData.get("estimatedDays") ?? "").trim(),
    active: formData.has("active"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    if (zoneId) {
      await updateDeliveryZone(ctx, zoneId, parsed.data);
    } else {
      await createDeliveryZone(ctx, parsed.data);
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveDeliveryZone", context: { storeId: ctx.store.id } });
    return { error: "Could not save the delivery zone" };
  }

  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: zoneId ? "Delivery zone updated" : "Delivery zone added" };
}

export async function deleteZoneAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const zoneId = String(formData.get("zoneId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  try {
    await deleteDeliveryZone(ctx, zoneId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "deleteDeliveryZone", context: { storeId: ctx.store.id } });
    return { error: "Could not delete the delivery zone" };
  }
  revalidatePath(`/admin/${storeSlug}/settings`);
  return { message: "Delivery zone deleted" };
}

export async function switchPlanAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const planCode = String(formData.get("planCode") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  try {
    const plan = await switchPlan(ctx, planCode);
    revalidatePath(`/admin/${storeSlug}/billing`);
    return { message: `Switched to the ${plan.name} plan` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "switchPlan", context: { storeId: ctx.store.id, planCode } });
    return { error: error instanceof Error ? error.message : "Could not switch the plan" };
  }
}
