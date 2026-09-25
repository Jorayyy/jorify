"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { captureError } from "@/lib/logging";
import { createDiscount, deleteDiscount, markNotificationRead, updateDiscount } from "@/lib/services/marketing";
import { getSessionUser, ForbiddenError, requireStoreContext } from "@/lib/tenancy/context";
import { discountInputSchema } from "@/lib/validation";

type State = { error?: string; message?: string } | null;

const toInt = (value: FormDataEntryValue | null): number | null => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

export async function saveDiscountAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const discountId = String(formData.get("discountId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);

  const type = String(formData.get("type") ?? "percentage");
  const rawValue = toInt(formData.get("value"));
  if (rawValue === null || rawValue < 0) return { error: "Enter a valid discount value" };
  const value = type === "fixed" ? Math.round(rawValue * 100) : rawValue;

  const minSubtotalRaw = toInt(formData.get("minSubtotal")) ?? 0;
  const usageLimitRaw = toInt(formData.get("usageLimit"));
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const endsAt = String(formData.get("endsAt") ?? "").trim();

  const parsed = discountInputSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim(),
    type,
    value,
    appliesTo: String(formData.get("appliesTo") ?? "all"),
    productIds: formData.getAll("productIds").map(String).filter(Boolean),
    categoryIds: formData.getAll("categoryIds").map(String).filter(Boolean),
    minSubtotal: Math.round(minSubtotalRaw * 100),
    usageLimit: usageLimitRaw,
    startsAt: startsAt || null,
    endsAt: endsAt || null,
    status: String(formData.get("status") ?? "active"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields" };

  if (parsed.data.startsAt && parsed.data.endsAt && parsed.data.endsAt <= parsed.data.startsAt) {
    return { error: "The end date must be after the start date" };
  }

  try {
    if (discountId) {
      await updateDiscount(ctx, discountId, parsed.data);
    } else {
      await createDiscount(ctx, parsed.data);
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveDiscount", context: { storeId: ctx.store.id, discountId } });
    return { error: error instanceof Error ? error.message : "Could not save the discount" };
  }

  revalidatePath(`/admin/${storeSlug}/discounts`);
  revalidatePath(`/admin/${storeSlug}/marketing`);
  return { message: discountId ? "Discount updated" : "Discount created" };
}

export async function deleteDiscountAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const discountId = String(formData.get("discountId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  try {
    await deleteDiscount(ctx, discountId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "deleteDiscount", context: { storeId: ctx.store.id, discountId } });
    return { error: "Could not delete the discount" };
  }
  revalidatePath(`/admin/${storeSlug}/discounts`);
  revalidatePath(`/admin/${storeSlug}/marketing`);
  return { message: "Discount deleted" };
}

export async function markNotificationReadAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const notificationId = String(formData.get("notificationId") ?? "").trim();
  if (!notificationId) return { error: "Notification not found" };
  const user = await getSessionUser();
  if (!user) return { error: "Sign in first" };
  await markNotificationRead(user.id, notificationId);
  revalidatePath(`/admin/${storeSlug}/notifications`);
  return { message: "Marked as read" };
}
