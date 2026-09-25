"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBusinessType } from "@/lib/business-types";
import { captureError } from "@/lib/logging";
import { adjustInventory } from "@/lib/services/inventory";
import { createCategory, createProduct, deleteCategory, deleteProduct, updateCategory, updateProduct } from "@/lib/services/products";
import { ForbiddenError, requireStoreContext } from "@/lib/tenancy/context";
import { categoryInputSchema, inventoryAdjustSchema, productInputSchema, type ProductInput } from "@/lib/validation";

type State = { error?: string; message?: string } | null;

type ParseResult = { ok: true; data: ProductInput } | { ok: false; error: string };

const toMoney = (value: FormDataEntryValue | null): number | null => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
};

const toInt = (value: FormDataEntryValue | null): number | null => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const repeatCount = (formData: FormData, key: string) => Math.max(0, Number(formData.get(key) ?? 0) || 0);

function parseProduct(formData: FormData): ParseResult {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase() || slugify(name);
  const price = toMoney(formData.get("price"));
  if (price === null) return { ok: false, error: "Enter a valid price" };

  const images: { url: string; alt: string }[] = [];
  for (let index = 0; index < repeatCount(formData, "image.count"); index++) {
    const url = String(formData.get(`image.${index}.url`) ?? "").trim();
    if (!url) continue;
    images.push({ url, alt: String(formData.get(`image.${index}.alt`) ?? "").trim() });
  }

  const variants: ProductInput["variants"] = [];
  for (let index = 0; index < repeatCount(formData, "variant.count"); index++) {
    const variantName = String(formData.get(`variant.${index}.name`) ?? "").trim();
    if (!variantName) continue;
    const variantPrice = toMoney(formData.get(`variant.${index}.price`));
    if (variantPrice === null) return { ok: false, error: `Enter a valid price for variant ${index + 1}` };
    const options: { name: string; value: string }[] = [];
    for (let optionIndex = 0; optionIndex < repeatCount(formData, `variant.${index}.option.count`); optionIndex++) {
      const optionName = String(formData.get(`variant.${index}.option.${optionIndex}.name`) ?? "").trim();
      const optionValue = String(formData.get(`variant.${index}.option.${optionIndex}.value`) ?? "").trim();
      if (optionName && optionValue) options.push({ name: optionName, value: optionValue });
    }
    variants.push({
      id: String(formData.get(`variant.${index}.id`) ?? "").trim() || undefined,
      name: variantName,
      sku: String(formData.get(`variant.${index}.sku`) ?? "").trim(),
      price: variantPrice,
      compareAtPrice: toMoney(formData.get(`variant.${index}.compareAtPrice`)),
      options,
      quantity: toInt(formData.get(`variant.${index}.quantity`)) ?? 0,
    });
  }

  const result = productInputSchema.safeParse({
    name,
    slug,
    type: String(formData.get("type") ?? "product"),
    status: String(formData.get("status") ?? "draft"),
    description: String(formData.get("description") ?? ""),
    shortDescription: String(formData.get("shortDescription") ?? ""),
    sku: String(formData.get("sku") ?? "").trim(),
    price,
    compareAtPrice: toMoney(formData.get("compareAtPrice")),
    cost: toMoney(formData.get("cost")),
    categoryId: String(formData.get("categoryId") ?? "").trim() || null,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    weightGrams: toInt(formData.get("weightGrams")),
    featured: formData.has("featured"),
    trackInventory: formData.has("trackInventory"),
    requiresShipping: formData.has("requiresShipping"),
    taxable: formData.has("taxable"),
    durationMinutes: toInt(formData.get("durationMinutes")),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    variants,
    images,
  });

  if (!result.success) return { ok: false, error: result.error.issues[0]?.message ?? "Check the form fields" };
  return { ok: true, data: result.data };
}

export async function saveProductAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const productId = String(formData.get("productId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);

  const parsed = parseProduct(formData);
  if (!parsed.ok) return { error: parsed.error };

  const kind = getBusinessType(ctx.store.businessType);
  if (!kind.productKinds.includes(parsed.data.type)) {
    return { error: `${parsed.data.type === "service" ? "Services" : "Products"} are not available for this store type` };
  }

  let savedId = productId;
  try {
    if (productId) {
      await updateProduct(ctx, productId, parsed.data);
    } else {
      const product = await createProduct(ctx, parsed.data);
      savedId = product.id;
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveProduct", context: { storeId: ctx.store.id, productId } });
    return { error: "Could not save the product. The slug or SKU may already be in use." };
  }

  revalidatePath(`/admin/${storeSlug}/products`);
  redirect(`/admin/${storeSlug}/products/${savedId}`);
}

export async function deleteProductAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const productId = String(formData.get("productId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  try {
    await deleteProduct(ctx, productId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "deleteProduct", context: { storeId: ctx.store.id, productId } });
    return { error: "Could not delete the product" };
  }
  revalidatePath(`/admin/${storeSlug}/products`);
  redirect(`/admin/${storeSlug}/products`);
}

export async function saveCategoryAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase() || slugify(name);
  const parsed = categoryInputSchema.safeParse({
    name,
    slug,
    description: String(formData.get("description") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    parentId: String(formData.get("parentId") ?? "").trim() || null,
    position: toInt(formData.get("position")) ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields" };

  try {
    if (categoryId) {
      await updateCategory(ctx, categoryId, parsed.data);
    } else {
      await createCategory(ctx, parsed.data);
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "saveCategory", context: { storeId: ctx.store.id, categoryId } });
    return { error: "Could not save the category. The URL may already be in use." };
  }

  revalidatePath(`/admin/${storeSlug}/categories`);
  revalidatePath(`/admin/${storeSlug}/products`);
  return { message: categoryId ? "Category updated" : "Category created" };
}

export async function deleteCategoryAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);
  try {
    await deleteCategory(ctx, categoryId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "deleteCategory", context: { storeId: ctx.store.id, categoryId } });
    return { error: "Could not delete the category" };
  }
  revalidatePath(`/admin/${storeSlug}/categories`);
  revalidatePath(`/admin/${storeSlug}/products`);
  return { message: "Category deleted" };
}

export async function adjustInventoryAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);

  const parsed = inventoryAdjustSchema.safeParse({
    inventoryId: String(formData.get("inventoryId") ?? ""),
    delta: toInt(formData.get("delta")) ?? 0,
    reason: String(formData.get("reason") ?? "adjustment"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields" };

  try {
    await adjustInventory(ctx, { ...parsed.data, actorId: ctx.user.id });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "adjustInventory", context: { storeId: ctx.store.id } });
    return { error: error instanceof Error ? error.message : "Could not adjust stock" };
  }

  revalidatePath(`/admin/${storeSlug}/inventory`);
  return { message: "Stock adjusted" };
}
