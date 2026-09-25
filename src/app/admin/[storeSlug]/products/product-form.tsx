"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { deleteProductAction, saveProductAction } from "@/lib/actions/products";
import { FormError, useSavedToast, type ActionState } from "../_components/form";

type ImageRow = { url: string; alt: string };
type OptionRow = { name: string; value: string };
type VariantRow = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  quantity: string;
  options: OptionRow[];
};

type ProductData = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  categoryId: string | null;
  tags: string[];
  weightGrams: number | null;
  featured: boolean;
  trackInventory: boolean;
  requiresShipping: boolean;
  taxable: boolean;
  durationMinutes: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: { url: string; alt: string | null }[];
  variants: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    compareAtPrice: number | null;
    options: OptionRow[];
    quantity: number;
  }[];
};

type Props = {
  storeSlug: string;
  categories: { id: string; name: string }[];
  productKinds: ("product" | "service")[];
  attributeNames: string[];
  product?: ProductData;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const money = (value: number | null) => (value === null ? "" : (value / 100).toFixed(2));

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function Check({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-zinc-300" />
      {label}
    </label>
  );
}

export function ProductForm({ storeSlug, categories, productKinds, attributeNames, product }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveProductAction, null);
  const [confirmState, confirmAction, confirmPending] = useActionState<ActionState, FormData>(deleteProductAction, null);
  const [confirming, setConfirming] = useState(false);
  const [type, setType] = useState(product?.type ?? productKinds[0]);
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [images, setImages] = useState<ImageRow[]>(
    product?.images.map((image) => ({ url: image.url, alt: image.alt ?? "" })) ?? [{ url: "", alt: "" }],
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku ?? "",
      price: money(variant.price),
      compareAtPrice: money(variant.compareAtPrice),
      quantity: String(variant.quantity),
      options: variant.options,
    })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useSavedToast(confirmState);

  const updateVariant = (index: number, patch: Partial<VariantRow>) =>
    setVariants((current) => current.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));

  const updateOption = (variantIndex: number, optionIndex: number, patch: Partial<OptionRow>) =>
    setVariants((current) =>
      current.map((variant, i) =>
        i === variantIndex
          ? { ...variant, options: variant.options.map((option, j) => (j === optionIndex ? { ...option, ...patch } : option)) }
          : variant,
      ),
    );

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("storeSlug", storeSlug);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setUploadError(data.error ?? "Upload failed — storage may not be configured for this environment");
        return;
      }
      setImages((current) => [...current.filter((image) => image.url), { url: data.url as string, alt: "" }]);
    } catch {
      setUploadError("Upload failed — storage may not be configured for this environment");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form action={formAction} className="space-y-4 lg:col-span-2">
        <input type="hidden" name="storeSlug" value={storeSlug} />
        {product ? <input type="hidden" name="productId" value={product.id} /> : null}
        <input type="hidden" name="image.count" value={images.length} />
        <input type="hidden" name="variant.count" value={variants.length} />

        <FormError state={state} />

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Name">
                <Input
                  name="name"
                  required
                  defaultValue={product?.name ?? ""}
                  placeholder="Product name"
                  onChange={(event) => {
                    if (!slugEdited) setSlug(slugify(event.target.value));
                  }}
                />
              </Field>
            </div>
            <Field label="URL" hint="Lowercase letters, numbers and dashes">
              <Input
                name="slug"
                required
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.target.value);
                }}
              />
            </Field>
            <Field label="Type">
              <Select name="type" value={type} onChange={(event) => setType(event.target.value)}>
                {productKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind === "service" ? "Service" : "Product"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={product?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Category">
              <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Short description">
                <Input name="shortDescription" defaultValue={product?.shortDescription ?? ""} maxLength={300} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea name="description" defaultValue={product?.description ?? ""} rows={5} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Tags" hint="Comma separated">
                <Input name="tags" defaultValue={product?.tags.join(", ") ?? ""} placeholder="summer, sale" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Field label="Price">
              <Input name="price" type="number" min="0" step="0.01" required defaultValue={money(product?.price ?? 0)} />
            </Field>
            <Field label="Compare-at price">
              <Input name="compareAtPrice" type="number" min="0" step="0.01" defaultValue={money(product?.compareAtPrice ?? null)} />
            </Field>
            <Field label="Cost">
              <Input name="cost" type="number" min="0" step="0.01" defaultValue={money(product?.cost ?? null)} />
            </Field>
            <Field label="SKU">
              <Input name="sku" defaultValue={product?.sku ?? ""} />
            </Field>
            <Field label="Weight (grams)">
              <Input name="weightGrams" type="number" min="0" defaultValue={product?.weightGrams ?? ""} />
            </Field>
            {type === "service" ? (
              <Field label="Duration (minutes)" hint="5–1440">
                <Input name="durationMinutes" type="number" min="5" max="1440" defaultValue={product?.durationMinutes ?? ""} />
              </Field>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Check name="trackInventory" defaultChecked={product?.trackInventory ?? true} label="Track inventory" />
            <Check name="requiresShipping" defaultChecked={product?.requiresShipping ?? true} label="Requires shipping" />
            <Check name="taxable" defaultChecked={product?.taxable ?? true} label="Taxable" />
            <Check name="featured" defaultChecked={product?.featured ?? false} label="Featured" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Upload file"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleUpload(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <span className="text-xs text-zinc-400">or paste image URLs below</span>
            </div>
            {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
            {images.map((image, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  name={`image.${index}.url`}
                  value={image.url}
                  onChange={(event) =>
                    setImages((current) =>
                      current.map((item, i) => (i === index ? { ...item, url: event.target.value } : item)),
                    )
                  }
                  placeholder="https://…"
                  className="flex-[3]"
                />
                <Input
                  name={`image.${index}.alt`}
                  value={image.alt}
                  onChange={(event) =>
                    setImages((current) =>
                      current.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)),
                    )
                  }
                  placeholder="Alt text"
                  className="flex-[2]"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  className="text-zinc-400 hover:text-red-600"
                  onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImages((current) => [...current, { url: "", alt: "" }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add image URL
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Variants</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setVariants((current) => [
                  ...current,
                  { name: "", sku: "", price: "", compareAtPrice: "", quantity: "0", options: [] },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add variant
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <datalist id="attribute-names">
              {attributeNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {variants.length === 0 ? (
              <p className="text-sm text-zinc-500">No variants. Add one for options like size or color.</p>
            ) : null}
            {variants.map((variant, index) => (
              <div key={variant.id ?? index} className="space-y-2 rounded-md border border-zinc-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Variant {index + 1}</span>
                  <button
                    type="button"
                    aria-label="Remove variant"
                    className="text-zinc-400 hover:text-red-600"
                    onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {variant.id ? <input type="hidden" name={`variant.${index}.id`} value={variant.id} /> : null}
                <input type="hidden" name={`variant.${index}.option.count`} value={variant.options.length} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Name">
                    <Input
                      name={`variant.${index}.name`}
                      value={variant.name}
                      onChange={(event) => updateVariant(index, { name: event.target.value })}
                      placeholder="Small / Blue"
                    />
                  </Field>
                  <Field label="SKU">
                    <Input
                      name={`variant.${index}.sku`}
                      value={variant.sku}
                      onChange={(event) => updateVariant(index, { sku: event.target.value })}
                    />
                  </Field>
                  <Field label="Price">
                    <Input
                      name={`variant.${index}.price`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price}
                      onChange={(event) => updateVariant(index, { price: event.target.value })}
                    />
                  </Field>
                  <Field label="Compare-at price">
                    <Input
                      name={`variant.${index}.compareAtPrice`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.compareAtPrice}
                      onChange={(event) => updateVariant(index, { compareAtPrice: event.target.value })}
                    />
                  </Field>
                  <Field label="Initial quantity">
                    <Input
                      name={`variant.${index}.quantity`}
                      type="number"
                      min="0"
                      value={variant.quantity}
                      onChange={(event) => updateVariant(index, { quantity: event.target.value })}
                    />
                  </Field>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Options</Label>
                  {variant.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex gap-2">
                      <Input
                        list="attribute-names"
                        name={`variant.${index}.option.${optionIndex}.name`}
                        value={option.name}
                        onChange={(event) => updateOption(index, optionIndex, { name: event.target.value })}
                        placeholder="Attribute (Size)"
                        className="flex-1"
                      />
                      <Input
                        name={`variant.${index}.option.${optionIndex}.value`}
                        value={option.value}
                        onChange={(event) => updateOption(index, optionIndex, { value: event.target.value })}
                        placeholder="Value (Medium)"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        aria-label="Remove option"
                        className="text-zinc-400 hover:text-red-600"
                        onClick={() =>
                          updateVariant(index, { options: variant.options.filter((_, j) => j !== optionIndex) })
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateVariant(index, { options: [...variant.options, { name: "", value: "" }] })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Field label="SEO title" hint="Up to 70 characters">
              <Input name="seoTitle" maxLength={70} defaultValue={product?.seoTitle ?? ""} />
            </Field>
            <Field label="SEO description" hint="Up to 160 characters">
              <Textarea name="seoDescription" maxLength={160} rows={2} defaultValue={product?.seoDescription ?? ""} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending || confirmPending}>
            {pending ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
          <Link href={`/admin/${storeSlug}/products`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-600">
            <p>
              Status: <strong>{product?.status ?? "draft"}</strong>
            </p>
            <p className="text-xs text-zinc-400">
              Active products appear in the storefront. Drafts and archived products stay hidden from customers.
            </p>
          </CardContent>
        </Card>

        {product ? (
          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="text-red-700">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={confirmAction}>
                <input type="hidden" name="storeSlug" value={storeSlug} />
                <input type="hidden" name="productId" value={product.id} />
                <FormError state={confirmState} />
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirming(true)}>
                  Delete product
                </Button>
                <Dialog
                  open={confirming}
                  onClose={() => setConfirming(false)}
                  title="Delete this product?"
                  description="The product is soft deleted and hidden from the storefront. This cannot be undone from here."
                  footer={
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="destructive" size="sm" disabled={confirmPending}>
                        {confirmPending ? "Deleting…" : "Delete"}
                      </Button>
                    </>
                  }
                >
                  <p className="text-sm text-zinc-600">{product.name}</p>
                </Dialog>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
