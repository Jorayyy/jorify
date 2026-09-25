import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getDashboardData, getInventoryTurnover, rangeToDates, salesByCategory, type RangeKey } from "@/lib/services/analytics";
import { requireStoreContext } from "@/lib/tenancy/context";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { storeSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireStoreContext(storeSlug);

  const range: RangeKey = sp.range === "custom" ? "custom" : RANGES.some((item) => item.key === sp.range) ? (sp.range as RangeKey) : "30d";

  const { from: dateFrom, to: dateTo } = rangeToDates(range, sp.from, sp.to);
  const [data, turnover, categories] = await Promise.all([
    getDashboardData(ctx, range, sp.from, sp.to),
    getInventoryTurnover(ctx, 30),
    salesByCategory(ctx, dateFrom, dateTo),
  ]);

  const currency = ctx.store.currency;
  const maxRevenue = Math.max(...data.sales.map((day) => day.revenue), 1);

  const stats = [
    { label: "Revenue", value: formatMoney(data.revenue, currency) },
    { label: "Orders", value: String(data.orders) },
    { label: "Average order", value: formatMoney(data.averageOrderValue, currency) },
    { label: "New customers", value: String(data.newCustomers) },
    { label: "Repeat customers", value: String(data.repeatCustomers) },
    { label: "Total customers", value: String(data.totalCustomers) },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={`${formatDate(data.from)} – ${formatDate(data.to)}`}
        actions={
          <div className="flex flex-wrap gap-1">
            {RANGES.map((item) => (
              <Link
                key={item.key}
                href={`/admin/${storeSlug}/analytics?range=${item.key}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  range === item.key ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sales by day</CardTitle>
        </CardHeader>
        <CardContent>
          {data.sales.length === 0 ? (
            <EmptyState title="No sales in this range" description="Orders placed in the selected range show up here." />
          ) : (
            <div className="flex h-48 items-end gap-1 overflow-x-auto">
              {data.sales.map((day) => (
                <div
                  key={day.day}
                  title={`${day.day}: ${formatMoney(day.revenue, currency)} · ${day.count} orders`}
                  className="min-w-[10px] flex-1 rounded-t bg-emerald-500 hover:bg-emerald-600"
                  style={{ height: `${Math.max(4, (day.revenue / maxRevenue) * 100)}%` }}
                />
              ))}
            </div>
          )}
          {data.sales.length ? (
            <div className="mt-2 flex justify-between text-xs text-zinc-400">
              <span>{data.sales[0]?.day}</span>
              <span>{data.sales[data.sales.length - 1]?.day}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
          </CardHeader>
          {data.topProducts.length === 0 ? (
            <EmptyState title="No product sales yet" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH className="text-right">Sold</TH>
                  <TH className="text-right">Revenue</TH>
                </TR>
              </THead>
              <TBody>
                {data.topProducts.map((product, index) => (
                  <TR key={`${product.productId ?? "gift"}-${index}`}>
                    <TD className="font-medium text-zinc-900">{product.title}</TD>
                    <TD className="text-right">{product.quantity}</TD>
                    <TD className="text-right">{formatMoney(product.revenue, currency)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by category</CardTitle>
          </CardHeader>
          {categories.length === 0 ? (
            <EmptyState title="No category sales yet" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Category</TH>
                  <TH className="text-right">Units</TH>
                  <TH className="text-right">Revenue</TH>
                </TR>
              </THead>
              <TBody>
                {categories.map((row) => (
                  <TR key={row.categoryId ?? "uncategorized"}>
                    <TD className="font-medium text-zinc-900">{row.categoryName}</TD>
                    <TD className="text-right">{row.quantity}</TD>
                    <TD className="text-right">{formatMoney(row.revenue, currency)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventory turnover (30 days)</CardTitle>
          <Badge tone="default">top 10 by revenue</Badge>
        </CardHeader>
        {turnover.length === 0 ? (
          <EmptyState title="Nothing sold in the last 30 days" description="Best-moving products appear here once orders come in." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH className="text-right">Units sold</TH>
                <TH className="text-right">Revenue</TH>
              </TR>
            </THead>
            <TBody>
              {turnover.map((row) => (
                <TR key={row.productId ?? row.title}>
                  <TD className="font-medium text-zinc-900">{row.title}</TD>
                  <TD className="text-right">{row.sold}</TD>
                  <TD className="text-right">{formatMoney(row.revenue, currency)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <p className="mt-4 text-xs text-zinc-400">
        Conversion rate is not shown — traffic tracking is not wired up in this environment.
      </p>
    </div>
  );
}
