import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getBusinessType } from "@/lib/business-types";
import { getProduct, listAttributes, listCategories } from "@/lib/services/products";
import { requireStoreContext } from "@/lib/tenancy/context";
import { ProductForm } from "../product-form";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productId: string }>;
}) {
  const { storeSlug, productId } = await params;
  const ctx = await requireStoreContext(storeSlug);
  const type = getBusinessType(ctx.store.businessType);

  const [product, categories, attributes] = await Promise.all([
    getProduct(ctx, productId),
    listCategories(ctx),
    listAttributes(ctx),
  ]);
  if (!product) notFound();

  const variantStock = (variantId: string) =>
    product.variantStocks.find((row) => row.variantId === variantId)?.quantity ?? 0;

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`Last updated ${product.updatedAt.toLocaleDateString("en-PH")}`}
        actions={
          <Link
            href={`/admin/${storeSlug}/products`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" /> All products
          </Link>
        }
      />
      <ProductForm
        storeSlug={storeSlug}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        productKinds={type.productKinds}
        attributeNames={attributes.map((attribute) => attribute.name)}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          type: product.type,
          status: product.status,
          description: product.description,
          shortDescription: product.shortDescription,
          sku: product.sku,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          cost: product.cost,
          categoryId: product.categoryId,
          tags: product.tags,
          weightGrams: product.weightGrams,
          featured: product.featured,
          trackInventory: product.trackInventory,
          requiresShipping: product.requiresShipping,
          taxable: product.taxable,
          durationMinutes: product.durationMinutes,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          images: product.images.map((image) => ({ url: image.url, alt: image.alt })),
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            options: variant.options ?? [],
            quantity: variantStock(variant.id),
          })),
        }}
      />
    </div>
  );
}
