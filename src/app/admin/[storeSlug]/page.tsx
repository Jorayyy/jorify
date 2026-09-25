import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getBusinessType } from "@/lib/business-types";
import { getDashboardData, type RangeKey } from "@/lib/services/analytics";
import { requireStoreContext } from "@/lib/tenancy/context";
import { cn, formatMoney, timeAgo } from "@/lib/utils";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-zinc-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function OverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { storeSlug } = await params;
  const { range } = await searchParams;
  const ctx = await requireStoreContext(storeSlug);
  const type = getBusinessType(ctx.store.businessType);
  const rangeKey = (RANGES.some((item) => item.key === range) ? range : "30d") as RangeKey;
  const data = await getDashboardData(ctx, rangeKey);
  const widgets = new Set(type.widgets);

  const maxRevenue = Math.max(...data.sales.map((day) => day.revenue), 1);

  return (
    <div>
      <PageHeader
        title="Overview"
        description={`${type.label} · ${data.from.toLocaleDateString("en-PH")} to ${data.to.toLocaleDateString("en-PH")}`}
        actions={
          <div className="flex rounded-md border border-zinc-200 bg-white p-0.5">
            {RANGES.map((item) => (
              <Link
                key={item.key}
                href={`/admin/${storeSlug}?range=${item.key}`}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium",
                  rangeKey === item.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.has("revenue") ? (
          <Stat label="Revenue" value={formatMoney(data.revenue, ctx.store.currency)} hint="excl. cancelled orders" />
        ) : null}
        {widgets.has("orders") ? <Stat label="Orders" value={String(data.orders)} /> : null}
        {widgets.has("average_order_value") ? (
          <Stat label="Average order value" value={formatMoney(data.averageOrderValue, ctx.store.currency)} />
        ) : null}
        {widgets.has("customers") ? (
          <Stat label="New customers" value={String(data.newCustomers)} hint={`${data.totalCustomers} total`} />
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {widgets.has("sales_graph") ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {data.sales.length === 0 ? (
                <EmptyState title="No sales in this range" description="Orders placed in this period will appear here." />
              ) : (
                <div className="flex h-48 items-end gap-1.5">
                  {data.sales.map((day) => (
                    <div key={day.day} className="group relative flex-1">
                      <div
                        className="w-full rounded-t bg-emerald-500 transition-colors group-hover:bg-emerald-600"
                        style={{ height: `${Math.max(4, (day.revenue / maxRevenue) * 170)}px` }}
                      />
                      <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                        {day.day}: {formatMoney(day.revenue, ctx.store.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {widgets.has("top_products") ? (
          <Card>
            <CardHeader>
              <CardTitle>Top products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-zinc-500">Nothing sold yet.</p>
              ) : (
                data.topProducts.map((product) => (
                  <div key={product.productId ?? product.title} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-zinc-700">{product.title}</span>
                    <span className="shrink-0 text-sm font-medium text-zinc-900">
                      {formatMoney(product.revenue, ctx.store.currency)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Link href={`/admin/${storeSlug}/orders`} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
              View all
            </Link>
          </CardHeader>
          {data.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders from your storefront land here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Placed</TH>
                </TR>
              </THead>
              <TBody>
                {data.recentOrders.map((order) => (
                  <TR key={order.id}>
                    <TD>
                      <Link href={`/admin/${storeSlug}/orders/${order.id}`} className="font-medium text-zinc-900 hover:underline">
                        {order.number}
                      </Link>
                    </TD>
                    <TD className="truncate">{order.email ?? "Guest"}</TD>
                    <TD>
                      <Badge tone={order.status === "cancelled" ? "danger" : order.status === "completed" ? "success" : "default"}>
                        {order.status}
                      </Badge>
                    </TD>
                    <TD className="text-right font-medium">{formatMoney(order.total, ctx.store.currency)}</TD>
                    <TD className="text-xs text-zinc-500">{timeAgo(order.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          {widgets.has("low_stock") ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Low stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data.lowStock.length === 0 ? (
                  <p className="text-sm text-zinc-500">Everything is above its threshold.</p>
                ) : (
                  data.lowStock.map((item) => (
                    <div key={item.inventoryId} className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-zinc-700">
                        {item.productName}
                        {item.variantName ? ` — ${item.variantName}` : ""}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                        {item.quantity} left
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {widgets.has("customer_activity") || widgets.has("customers") ? (
            <Card>
              <CardHeader>
                <CardTitle>Customer activity</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Repeat</p>
                  <p className="text-lg font-semibold">{data.repeatCustomers}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
                  <p className="text-lg font-semibold">{data.totalCustomers}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
