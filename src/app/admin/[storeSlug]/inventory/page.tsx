import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getInventoryHistory, listInventory } from "@/lib/services/inventory";
import { requireStoreContext } from "@/lib/tenancy/context";
import { cn } from "@/lib/utils";
import { InventoryDialogs } from "./inventory-dialogs";

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ q?: string; low?: string; history?: string; adjust?: string }>;
}) {
  const { storeSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireStoreContext(storeSlug);

  const q = sp.q?.trim() ?? "";
  const lowOnly = sp.low === "1";
  const rows = await listInventory(ctx, q || undefined, lowOnly);

  const historyRow = sp.history ? rows.find((row) => row.inventory.id === sp.history) ?? null : null;
  const history = historyRow ? await getInventoryHistory(ctx, historyRow.inventory.id) : [];
  const adjustRow = sp.adjust ? rows.find((row) => row.inventory.id === sp.adjust) ?? null : null;

  const query = (next: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, low: lowOnly ? "1" : undefined, ...next })) {
      if (value) search.set(key, value);
    }
    const value = search.toString();
    return value ? `?${value}` : `?`;
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={`${rows.length} stock records${lowOnly ? " · low stock only" : ""}`}
        actions={
          lowOnly ? (
            <Link href={query({ low: undefined })}>
              <Button variant="outline" size="sm">
                Show all stock
              </Button>
            </Link>
          ) : (
            <Link href={query({ low: "1" })}>
              <Button variant="outline" size="sm">
                <AlertTriangle className="h-4 w-4" /> Low stock only
              </Button>
            </Link>
          )
        }
      />

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-zinc-100 p-4">
          <div className="min-w-[200px] flex-1">
            <Label htmlFor="q">Search</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="Product, variant or SKU" className="mt-1" />
          </div>
          {lowOnly ? <input type="hidden" name="low" value="1" /> : null}
          <Button type="submit" variant="outline">
            Search
          </Button>
          {q ? (
            <Link href={query({ q: undefined })} className="pb-2 text-xs font-medium text-zinc-500 hover:text-zinc-900">
              Clear
            </Link>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title="No stock records"
            description="Inventory rows appear once you create products with stock tracking enabled."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH>Variant</TH>
                <TH className="text-right">On hand</TH>
                <TH className="text-right">Reserved</TH>
                <TH className="text-right">Available</TH>
                <TH>Threshold</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => {
                const low = row.inventory.quantity <= row.inventory.lowStockThreshold;
                const available = row.inventory.quantity - row.inventory.reserved;
                return (
                  <TR key={row.inventory.id}>
                    <TD className="font-medium text-zinc-900">{row.productName ?? "—"}</TD>
                    <TD className="truncate text-zinc-500">{row.variantName ?? "—"}</TD>
                    <TD className={cn("text-right", low && "font-medium text-red-600")}>
                      {row.inventory.quantity}
                      {low ? (
                        <Badge tone="danger" className="ml-2">
                          Low
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-right">{row.inventory.reserved}</TD>
                    <TD className="text-right">{available}</TD>
                    <TD className="text-zinc-500">{row.inventory.lowStockThreshold}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-3 text-xs font-medium">
                        <Link
                          href={query({ history: row.inventory.id, adjust: undefined })}
                          className="text-zinc-500 hover:text-zinc-900"
                        >
                          History
                        </Link>
                        {ctx.can("inventory.update") ? (
                          <Link
                            href={query({ adjust: row.inventory.id, history: undefined })}
                            className="text-zinc-900 hover:underline"
                          >
                            Adjust stock
                          </Link>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <InventoryDialogs
        storeSlug={storeSlug}
        backHref={`/admin/${storeSlug}/inventory${query({ history: undefined, adjust: undefined })}`}
        history={
          historyRow
            ? {
                title: [historyRow.productName, historyRow.variantName].filter(Boolean).join(" — "),
                entries: history.map((entry) => ({
                  id: entry.id,
                  delta: entry.delta,
                  quantityAfter: entry.quantityAfter,
                  reason: entry.reason,
                  note: entry.note,
                  createdAt: entry.createdAt,
                })),
              }
            : null
        }
        adjust={
          adjustRow
            ? {
                id: adjustRow.inventory.id,
                title: [adjustRow.productName, adjustRow.variantName].filter(Boolean).join(" — "),
                quantity: adjustRow.inventory.quantity,
                available: adjustRow.inventory.quantity - adjustRow.inventory.reserved,
                canAdjust: ctx.can("inventory.update"),
              }
            : null
        }
      />

      <p className="mt-4 text-xs text-zinc-400">
        Available = on hand − reserved. Reserved stock is held for orders that have not shipped yet.
      </p>
    </div>
  );
}
