"use server";

import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getBusinessType } from "@/lib/business-types";
import { db } from "@/lib/db";
import { storePages, storeThemes } from "@/lib/db/schema";
import { getPaymentProvider } from "@/lib/payments";
import { getCart, getCartSessionKey, removeCartItem, setCartCode, updateCartItem, addToCart } from "@/lib/services/cart";
import { createOrder, validateDiscount } from "@/lib/services/orders";
import { appBaseUrl, computeCartTotals, resolvePublicStore } from "@/lib/services/storefront";
import { ForbiddenError, requireStoreContext } from "@/lib/tenancy/context";
import { THEMES, type ThemeKey } from "@/lib/storefront/themes";
import { pageSchema, sectionSchema, themeSettingsSchema } from "@/lib/validation";

export type SaveResult = { ok: boolean; error?: string } | null;
export type DiscountFormState = { error?: string; code?: string | null } | null;
export type CheckoutFormState = { error?: string } | null;

const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).default(""),
  phone: z.string().trim().max(30).default(""),
  fulfillment: z.enum(["delivery", "pickup", "shipping"]),
  line1: z.string().trim().max(120).default(""),
  line2: z.string().trim().max(120).default(""),
  city: z.string().trim().max(80).default(""),
  region: z.string().trim().max(80).default(""),
  postalCode: z.string().trim().max(20).default(""),
  country: z.string().trim().max(60).default("PH"),
  note: z.string().trim().max(1000).default(""),
  discountCode: z.string().trim().max(32).default(""),
});

const cartActionSchema = z.object({
  storeSlug: z.string().min(1).max(64),
  itemId: z.string().min(1).max(64),
  delta: z.coerce.number().int().min(-1).max(1),
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function duplicateKey(error: unknown): boolean {
  return errorMessage(error).toLowerCase().includes("duplicate");
}

export async function addItemToCart(formData: FormData) {
  const rawStoreSlug = String(formData.get("storeSlug") ?? "").trim();
  const parsed = z
    .object({
      storeSlug: z.string().min(1).max(64),
      productId: z.string().min(1).max(64),
      variantId: z.string().max(64).default(""),
      quantity: z.coerce.number().int().min(1).max(999),
    })
    .safeParse({
      storeSlug: rawStoreSlug,
      productId: String(formData.get("productId") ?? "").trim(),
      variantId: String(formData.get("variantId") ?? "").trim(),
      quantity: Number(formData.get("quantity") || 1),
    });
  if (!parsed.success) redirect(rawStoreSlug ? `/${rawStoreSlug}` : "/");

  const data = await resolvePublicStore(parsed.data.storeSlug);
  if (!data) notFound();

  const sessionKey = await getCartSessionKey(data.store.id);
  try {
    await addToCart(data.store.id, sessionKey, {
      productId: parsed.data.productId,
      variantId: parsed.data.variantId || null,
      quantity: Math.min(99, parsed.data.quantity),
    });
  } catch {
    redirect(`/${data.store.slug}/products`);
  }
  redirect(`/${data.store.slug}/cart`);
}

export async function updateCartAction(formData: FormData) {
  const parsed = cartActionSchema.safeParse({
    storeSlug: String(formData.get("storeSlug") ?? "").trim(),
    itemId: String(formData.get("itemId") ?? "").trim(),
    delta: Number(formData.get("delta") ?? 0),
  });
  if (!parsed.success) return;

  const data = await resolvePublicStore(parsed.data.storeSlug);
  if (!data) return;

  const sessionKey = await getCartSessionKey(data.store.id);
  const cart = await getCart(data.store.id, sessionKey);
  const item = cart?.items.find((row) => row.id === parsed.data.itemId);
  if (!item) return;

  const next = Math.max(1, Math.min(999, item.quantity + parsed.data.delta));
  if (next === item.quantity) return;
  await updateCartItem(data.store.id, sessionKey, item.id, next);
  revalidatePath(`/${data.store.slug}/cart`);
}

export async function removeCartAction(formData: FormData) {
  const parsed = z
    .object({ storeSlug: z.string().min(1).max(64), itemId: z.string().min(1).max(64) })
    .safeParse({
      storeSlug: String(formData.get("storeSlug") ?? "").trim(),
      itemId: String(formData.get("itemId") ?? "").trim(),
    });
  if (!parsed.success) return;

  const data = await resolvePublicStore(parsed.data.storeSlug);
  if (!data) return;

  const sessionKey = await getCartSessionKey(data.store.id);
  await removeCartItem(data.store.id, sessionKey, parsed.data.itemId);
  revalidatePath(`/${data.store.slug}/cart`);
}

export async function applyDiscountCode(_prev: DiscountFormState, formData: FormData): Promise<DiscountFormState> {
  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const clear = Boolean(formData.get("clear"));

  const data = await resolvePublicStore(storeSlug);
  if (!data) return { error: "Store not found" };

  const sessionKey = await getCartSessionKey(data.store.id);
  const cart = await getCart(data.store.id, sessionKey);
  if (!cart || cart.items.length === 0) return { error: "Your cart is empty" };

  if (clear || !code) {
    await setCartCode(data.store.id, sessionKey, null);
    revalidatePath(`/${storeSlug}/cart`);
    return { code: null };
  }

  const parsedCode = z.string().min(3).max(32).safeParse(code);
  if (!parsedCode.success) return { error: "Discount code is not valid" };

  const result = await validateDiscount(
    data.store.id,
    code,
    cart.subtotal,
    cart.items.map((item) => ({
      productId: item.productId,
      categoryId: item.product.categoryId,
      total: item.unitPrice * item.quantity,
    })),
  );
  if (!result.ok) return { error: result.error };

  await setCartCode(data.store.id, sessionKey, code);
  revalidatePath(`/${storeSlug}/cart`);
  return { code };
}

export async function placeOrderAction(
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const parsed = checkoutSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    fulfillment: String(formData.get("fulfillment") ?? ""),
    line1: String(formData.get("line1") ?? ""),
    line2: String(formData.get("line2") ?? ""),
    city: String(formData.get("city") ?? ""),
    region: String(formData.get("region") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    country: String(formData.get("country") ?? ""),
    note: String(formData.get("note") ?? ""),
    discountCode: String(formData.get("discountCode") ?? ""),
    storeSlug: String(formData.get("storeSlug") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };

  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  const data = await resolvePublicStore(storeSlug);
  if (!data) return { error: "Store not found" };

  const allowed = getBusinessType(data.store.businessType).fulfillment;
  if (!allowed.includes(parsed.data.fulfillment)) {
    return { error: "That fulfillment option is not available for this store" };
  }

  const needsAddress = parsed.data.fulfillment !== "pickup";
  if (needsAddress && (!parsed.data.line1 || !parsed.data.city)) {
    return { error: "Enter a street address and city for delivery or shipping" };
  }

  const sessionKey = await getCartSessionKey(data.store.id);
  const cart = await getCart(data.store.id, sessionKey);
  if (!cart || cart.items.length === 0) return { error: "Your cart is empty" };

  const totals = await computeCartTotals(data.store.id, cart, parsed.data.fulfillment);
  if (totals.discountError) return { error: totals.discountError };

  const address = needsAddress
    ? {
        line1: parsed.data.line1,
        line2: parsed.data.line2,
        city: parsed.data.city,
        region: parsed.data.region,
        postalCode: parsed.data.postalCode,
        country: parsed.data.country,
        phone: parsed.data.phone,
      }
    : null;

  const provider = getPaymentProvider();
  const result = await createOrder(data.store.id, {
    email: parsed.data.email,
    phone: parsed.data.phone || undefined,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName || undefined,
    fulfillment: parsed.data.fulfillment,
    address,
    shippingTotal: totals.shipping,
    discountCode: totals.discountCode,
    note: parsed.data.note || null,
    items: cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
    paymentProvider: provider.key,
    cartId: cart.id,
  });
  if (!result.ok) return { error: result.error };

  let checkoutUrl: string | null = null;
  try {
    const checkout = await provider.createCheckout({
      storeId: data.store.id,
      orderId: result.orderId,
      orderNumber: result.number,
      amount: result.total,
      currency: data.store.currency,
      description: `Order ${result.number} from ${data.store.name}`,
      successUrl: `${appBaseUrl()}/${data.store.slug}/order-confirmation/${result.orderId}`,
      cancelUrl: `${appBaseUrl()}/${data.store.slug}/checkout`,
      customerEmail: parsed.data.email,
      shippingAmount: totals.shipping,
      taxAmount: totals.tax,
      discountAmount: totals.discount,
    });
    if (checkout.mode === "redirect") checkoutUrl = checkout.url;
  } catch {
    checkoutUrl = null;
  }

  if (checkoutUrl) redirect(checkoutUrl);
  redirect(`/${data.store.slug}/order-confirmation/${result.orderId}`);
}

export async function savePageSections(
  storeSlug: string,
  pageId: string,
  sections: unknown,
): Promise<SaveResult> {
  const ctx = await requireStoreContext(storeSlug);
  try {
    ctx.assert("storefront.update");
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: "You do not have permission to edit this storefront" };
    throw error;
  }

  const parsed = z.array(sectionSchema).max(50).safeParse(sections);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sections" };

  const rows = await db
    .update(storePages)
    .set({ sections: parsed.data, updatedAt: new Date() })
    .where(and(eq(storePages.id, pageId), eq(storePages.storeId, ctx.store.id)))
    .returning({ id: storePages.id });
  if (rows.length === 0) return { ok: false, error: "Page not found" };

  revalidatePath(`/${ctx.store.slug}`, "layout");
  return { ok: true };
}

export async function savePageMeta(storeSlug: string, pageId: string, input: unknown): Promise<SaveResult> {
  const ctx = await requireStoreContext(storeSlug);
  try {
    ctx.assert("storefront.update");
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: "You do not have permission to edit this storefront" };
    throw error;
  }

  const parsed = pageSchema
    .pick({ title: true, slug: true, published: true, seo: true })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page details" };

  try {
    const rows = await db
      .update(storePages)
      .set({
        title: parsed.data.title,
        slug: parsed.data.slug,
        published: parsed.data.published,
        seo: parsed.data.seo,
        updatedAt: new Date(),
      })
      .where(and(eq(storePages.id, pageId), eq(storePages.storeId, ctx.store.id)))
      .returning({ id: storePages.id });
    if (rows.length === 0) return { ok: false, error: "Page not found" };
  } catch (error) {
    if (duplicateKey(error)) return { ok: false, error: "That page URL is already taken" };
    throw error;
  }

  revalidatePath(`/${ctx.store.slug}`, "layout");
  return { ok: true };
}

export async function createPageAction(formData: FormData) {
  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  const errorBase = `/admin/${storeSlug}/storefront`;
  const parsed = pageSchema
    .pick({ title: true, slug: true })
    .safeParse({
      title: String(formData.get("title") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    });
  if (!parsed.success) {
    redirect(`${errorBase}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid page")}`);
  }

  const ctx = await requireStoreContext(storeSlug);
  try {
    ctx.assert("storefront.update");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect(`${errorBase}?error=${encodeURIComponent("You do not have permission to edit this storefront")}`);
    }
    throw error;
  }

  let pageId = "";
  try {
    const rows = await db
      .insert(storePages)
      .values({
        storeId: ctx.store.id,
        title: parsed.data.title,
        slug: parsed.data.slug,
        sections: [],
        published: true,
        seo: {},
      })
      .returning({ id: storePages.id });
    pageId = rows[0].id;
  } catch (error) {
    if (duplicateKey(error)) redirect(`${errorBase}?error=${encodeURIComponent("That page URL is already taken")}`);
    throw error;
  }

  revalidatePath(`/${ctx.store.slug}`, "layout");
  redirect(`${errorBase}/pages/${pageId}`);
}

export async function deletePageAction(formData: FormData) {
  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  const pageId = String(formData.get("pageId") ?? "").trim();
  const errorBase = `/admin/${storeSlug}/storefront`;
  const ctx = await requireStoreContext(storeSlug);
  try {
    ctx.assert("storefront.update");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect(`${errorBase}?error=${encodeURIComponent("You do not have permission to edit this storefront")}`);
    }
    throw error;
  }

  const page = await db.query.storePages.findFirst({
    where: and(eq(storePages.id, pageId), eq(storePages.storeId, ctx.store.id)),
    columns: { id: true, isHomepage: true },
  });
  if (page?.isHomepage) redirect(`${errorBase}?error=${encodeURIComponent("The homepage cannot be deleted")}`);

  await db.delete(storePages).where(and(eq(storePages.id, pageId), eq(storePages.storeId, ctx.store.id)));
  revalidatePath(`/${ctx.store.slug}`, "layout");
  redirect(errorBase);
}

export async function saveThemeSettings(storeSlug: string, input: unknown): Promise<SaveResult> {
  const ctx = await requireStoreContext(storeSlug);
  try {
    ctx.assert("storefront.update");
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: "You do not have permission to edit this storefront" };
    throw error;
  }

  const parsed = themeSettingsSchema
    .extend({ themeKey: z.string().refine((value) => value in THEMES, "Pick a valid theme") })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid theme settings" };

  const themeKey = parsed.data.themeKey as ThemeKey;
  const settings = {
    colors: parsed.data.colors,
    typography: parsed.data.typography,
    radius: parsed.data.radius,
    buttonStyle: parsed.data.buttonStyle,
  } as Record<string, unknown>;

  await db.transaction(async (tx) => {
    const rows = await tx.select().from(storeThemes).where(eq(storeThemes.storeId, ctx.store.id));
    const target = rows.find((row) => row.themeKey === themeKey);
    if (target) {
      await tx
        .update(storeThemes)
        .set({ settings, isPublished: true, updatedAt: new Date() })
        .where(eq(storeThemes.id, target.id));
    } else {
      await tx
        .insert(storeThemes)
        .values({ storeId: ctx.store.id, name: themeKey, themeKey, settings, isPublished: true });
    }
    await tx
      .update(storeThemes)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(and(eq(storeThemes.storeId, ctx.store.id), ne(storeThemes.themeKey, themeKey)));
  });

  revalidatePath(`/${ctx.store.slug}`, "layout");
  return { ok: true };
}
