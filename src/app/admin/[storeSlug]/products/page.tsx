import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { listCategories, listProducts } from "@/lib/services/products";
import { requireStoreContext } from "@/lib/tenancy/context";
import { cn, formatMoney, timeAgo } from "@/lib/utils";
import { ClickableRow } from "../_components/clickable-row";
import { Pagination } from "../_components/pagination";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }>;
}) {
  const { storeSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireStoreContext(storeSlug);

  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const categoryId = sp.category ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const [categories, result] = await Promise.all([
    listCategories(ctx),
    listProducts(ctx, {
      search: q || undefined,
      status: status || undefined,
      categoryId: categoryId || undefined,
      page,
    }),
  ]);

  const query = (next: Record<string, string | undefined> = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, status, category: categoryId, ...next })) {
      if (value) search.set(key, value);
    }
    const value = search.toString();
    return value ? `?${value}` : `?`;
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${result.total} products in this store`}
        actions={
          <Link href={`/admin/${storeSlug}/products/new`}>
            <Button>
              <Plus className="h-4 w-4" /> Add product
            </Button>
          </Link>
        }
      />

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-zinc-100 p-4">
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="q">Search</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="Name, SKU or URL" className="mt-1" />
          </div>
          <div className="w-40">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={status} className="mt-1">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          <div className="w-52">
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue={categoryId} className="mt-1">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="outline">
            Filter
          </Button>
          {q || status || categoryId ? (
            <Link href="?" className="pb-2 text-xs font-medium text-zinc-500 hover:text-zinc-900">
              Clear
            </Link>
          ) : null}
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Add your first product or change the filters."
            action={
              <Link href={`/admin/${storeSlug}/products/new`}>
                <Button size="sm">Add product</Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH>Status</TH>
                <TH>Category</TH>
                <TH className="text-right">Price</TH>
                <TH className="text-right">Stock</TH>
                <TH>Updated</TH>
              </TR>
            </THead>
            <TBody>
              {result.rows.map((row) => (
                <ClickableRow key={row.product.id} href={`/admin/${storeSlug}/products/${row.product.id}`}>
                  <TD>
                    <span className="font-medium text-zinc-900">{row.product.name}</span>
                    <span className="ml-2 text-xs text-zinc-400">{row.product.type}</span>
                  </TD>
                  <TD>
                    <Badge tone={row.product.status === "active" ? "success" : row.product.status === "draft" ? "warning" : "default"}>
                      {row.product.status}
                    </Badge>
                  </TD>
                  <TD className="truncate">{row.categoryName ?? "—"}</TD>
                  <TD className="text-right">{formatMoney(row.product.price, ctx.store.currency)}</TD>
                  <TD className={cn("text-right", row.stock <= 5 && "font-medium text-red-600")}>{row.stock}</TD>
                  <TD className="text-xs text-zinc-500">{timeAgo(row.product.updatedAt)}</TD>
                </ClickableRow>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Pagination
        href={(next) => query({ page: next > 1 ? String(next) : undefined })}
        page={result.page}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
