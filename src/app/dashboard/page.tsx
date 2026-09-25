import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { type RangeKey } from "@/lib/services/analytics";
import { getPlatformOverview } from "@/lib/services/platform";
import { requireUser } from "@/lib/tenancy/context";
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const user = await requireUser();
  const rangeKey = (RANGES.some((item) => item.key === range) ? range : "30d") as RangeKey;
  const data = await getPlatformOverview(user.id, rangeKey);

  const maxRevenue = Math.max(...data.sales.map((day) => day.revenue), 1);
  const revenueByStore = new Map(data.byStore.map((row) => [row.storeId, row]));
  const totalRevenue = data.byStore.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/stores" className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-xs text-white">J</span>
              Jorify
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <span className="rounded-md bg-zinc-900 px-2.5 py-1 font-medium text-white">Dashboard</span>
              <Link href="/stores" className="rounded-md px-2.5 py-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
                Stores
              </Link>
            </nav>
          </div>
          <span className="text-sm text-zinc-500">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          title="Sales dashboard"
          description={`${data.stores.length} stores · ${data.from.toLocaleDateString("en-PH")} to ${data.to.toLocaleDateString("en-PH")}`}
          actions={
            <div className="flex rounded-md border border-zinc-200 bg-white p-0.5">
              {RANGES.map((item) => (
                <Link
                  key={item.key}
                  href={`/dashboard?range=${item.key}`}
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
        <Stat label="Revenue" value={formatMoney(data.revenue, "PHP")} hint="excl. cancelled orders" />
        <Stat label="Orders" value={String(data.orders)} />
        <Stat label="Average order value" value={formatMoney(data.averageOrderValue, "PHP")} />
        <Stat label="Stores" value={String(data.stores.length)} hint={`${data.orders} orders in range`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales across all stores</CardTitle>
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
                      {day.day}: {formatMoney(day.revenue, "PHP")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by store</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.stores.length === 0 ? (
              <p className="text-sm text-zinc-500">No stores yet.</p>
            ) : (
              data.stores.map((store) => {
                const sales = revenueByStore.get(store.id);
                const share = totalRevenue > 0 ? Math.round(((sales?.revenue ?? 0) / totalRevenue) * 100) : 0;
                return (
                  <div key={store.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/admin/${store.slug}`} className="truncate text-zinc-700 hover:underline">
                        {store.name}
                      </Link>
                      <span className="shrink-0 font-medium text-zinc-900">{formatMoney(sales?.revenue ?? 0, store.currency)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-100">
                        <div className="h-1.5 rounded-full bg-zinc-900" style={{ width: `${share}%` }} />
                      </div>
                      <span className="w-8 text-right text-[10px] text-zinc-400">{share}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent orders across all stores</CardTitle>
            <span className="text-xs text-zinc-400">latest 8</span>
          </CardHeader>
          {data.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders from your storefronts land here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Store</TH>
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
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-900 text-[10px] font-semibold text-white">
                          {order.storeName.slice(0, 1).toUpperCase()}
                        </span>
                        <Link href={`/admin/${order.storeSlug}`} className="truncate text-zinc-600 hover:underline">
                          {order.storeName}
                        </Link>
                      </span>
                    </TD>
                    <TD>
                      <Link
                        href={`/admin/${order.storeSlug}/orders/${order.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {order.number}
                      </Link>
                    </TD>
                    <TD className="truncate">{order.email ?? "Guest"}</TD>
                    <TD>
                      <Badge tone={order.status === "cancelled" ? "danger" : order.status === "completed" ? "success" : "default"}>
                        {order.status}
                      </Badge>
                    </TD>
                    <TD className="text-right font-medium">{formatMoney(order.total, "PHP")}</TD>
                    <TD className="text-xs text-zinc-500">{timeAgo(order.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
        </div>
      </main>
    </div>
  );
}
