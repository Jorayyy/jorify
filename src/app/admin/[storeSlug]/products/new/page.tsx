import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getBusinessType } from "@/lib/business-types";
import { listAttributes, listCategories } from "@/lib/services/products";
import { requireStoreContext } from "@/lib/tenancy/context";
import { ProductForm } from "../product-form";

export default async function NewProductPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);
  const type = getBusinessType(ctx.store.businessType);
  if (!type.modules.products) notFound();

  const [categories, attributes] = await Promise.all([listCategories(ctx), listAttributes(ctx)]);

  return (
    <div>
      <PageHeader title="Add product" description="Create a new product or service for this store." />
      <ProductForm
        storeSlug={storeSlug}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        productKinds={type.productKinds}
        attributeNames={attributes.map((attribute) => attribute.name)}
      />
    </div>
  );
}
