import { PageHeader } from "@/components/page-header";
import { listCategories } from "@/lib/services/products";
import { requireStoreContext } from "@/lib/tenancy/context";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);
  const categories = await listCategories(ctx);

  return (
    <div>
      <PageHeader title="Categories" description="Group products so customers can browse by type." />
      <CategoriesClient
        storeSlug={storeSlug}
        categories={categories}
        canEdit={ctx.can("products.create") || ctx.can("products.update")}
        canDelete={ctx.can("products.delete")}
      />
    </div>
  );
}
