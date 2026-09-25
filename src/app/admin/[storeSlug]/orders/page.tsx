import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getBusinessType } from "@/lib/business-types";
import { listOrders } from "@/lib/services/orders";
import { requireStoreContext } from "@/lib/tenancy/context";
import { cn, formatMoney, timeAgo } from "@/lib/utils";
import { ClickableRow } from "../_components/clickable-row";
import { Pagination } from "../_components/pagination";

const statusTone = (status: string): "default" | "success" | "warning" | "danger" => {
  if (status === "cancelled" || status === "refunded" || status === "no_show") return "danger";
  if (status === "completed") return "success";
  if (status === "pending" || status === "confirmed") return "warning";
  return "default";
};

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { storeSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireStoreContext(storeSlug);
  const type = getBusinessType(ctx.store.businessType);

  const status = sp.status ?? "";
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await listOrders(ctx, {
    status: status || undefined,
    search: q || undefined,
    page,
  });

  const query = (next: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ status, q, ...next })) {
      if (value) search.set(key, value);
    }
    const value = search.toString();
    return value ? `?${value}` : `?`;
  };

  return (
    <div>
      <PageHeader title="Orders" description={`${result.total} orders match the current view`} />

      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-zinc-200">
        <Link
          href={query({ status: undefined, page: undefined })}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
            !status ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
          )}
        >
          All
        </Link>
        {type.orderStatuses.map((item) => (
          <Link
            key={item}
            href={query({ status: item, page: undefined })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize",
              status === item ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {item.replace("_", " ")}
          </Link>
        ))}
      </div>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-zinc-100 p-4">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <div className="min-w-[200px] flex-1">
            <Label htmlFor="q">Search</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="Order number or email" className="mt-1" />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
          {q ? (
            <Link href={query({ q: undefined })} className="pb-2 text-xs font-medium text-zinc-500 hover:text-zinc-900">
              Clear
            </Link>
          ) : null}
        </form>

        {result.rows.length === 0 ? (
          <EmptyState title="No orders found" description="Orders placed on your storefront appear here." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH>Payment</TH>
                <TH className="text-right">Total</TH>
                <TH>Placed</TH>
              </TR>
            </THead>
            <TBody>
              {result.rows.map((row) => (
                <ClickableRow key={row.order.id} href={`/admin/${storeSlug}/orders/${row.order.id}`}>
                  <TD className="font-medium text-zinc-900">{row.order.number}</TD>
                  <TD className="truncate">{row.customerName ?? row.order.email ?? "Guest"}</TD>
                  <TD>
                    <Badge tone={statusTone(row.order.status)}>{row.order.status.replace("_", " ")}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={row.order.paymentStatus === "paid" ? "success" : "warning"}>
                      {row.order.paymentStatus}
                    </Badge>
                  </TD>
                  <TD className="text-right font-medium">{formatMoney(row.order.total, ctx.store.currency)}</TD>
                  <TD className="text-xs text-zinc-500">{timeAgo(row.order.createdAt)}</TD>
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
