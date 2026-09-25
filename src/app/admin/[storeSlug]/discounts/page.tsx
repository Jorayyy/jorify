import { PageHeader } from "@/components/page-header";
import { listDiscounts } from "@/lib/services/marketing";
import { listCategories, listProductOptions } from "@/lib/services/products";
import { requireStoreContext } from "@/lib/tenancy/context";
import { DiscountsClient } from "./discounts-client";

export default async function DiscountsPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);

  const [discounts, categories, productOptions] = await Promise.all([
    listDiscounts(ctx),
    listCategories(ctx),
    listProductOptions(ctx),
  ]);

  return (
    <div>
      <PageHeader title="Discounts" description="Codes customers can apply at checkout" />
      <DiscountsClient
        storeSlug={storeSlug}
        currency={ctx.store.currency}
        canEdit={ctx.can("discounts.update")}
        discounts={discounts}
        products={productOptions.map((product) => ({ id: product.id, name: product.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
    </div>
  );
}
