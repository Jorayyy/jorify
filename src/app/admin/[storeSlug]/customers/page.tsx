import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { listCustomers, segmentOf, type CustomerSegment } from "@/lib/services/customers";
import { requireStoreContext } from "@/lib/tenancy/context";
import { formatMoney, timeAgo } from "@/lib/utils";
import { ClickableRow } from "../_components/clickable-row";
import { Pagination } from "../_components/pagination";

const segmentTone: Record<CustomerSegment, "success" | "info" | "warning" | "default"> = {
  vip: "success",
  new: "info",
  returning: "default",
  inactive: "warning",
};

const SEGMENTS: CustomerSegment[] = ["new", "returning", "vip", "inactive"];

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ q?: string; segment?: string; page?: string }>;
}) {
  const { storeSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireStoreContext(storeSlug);

  const q = sp.q?.trim() ?? "";
  const segment = SEGMENTS.includes(sp.segment as CustomerSegment) ? (sp.segment as CustomerSegment) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await listCustomers(ctx, {
    search: q || undefined,
    segment: segment || undefined,
    page,
  });

  const query = (next: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, segment, ...next })) {
      if (value) search.set(key, value);
    }
    const value = search.toString();
    return value ? `?${value}` : `?`;
  };

  return (
    <div>
      <PageHeader title="Customers" description={`${result.total} customers in this store`} />

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-zinc-100 p-4">
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="q">Search</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="Name, email or phone" className="mt-1" />
          </div>
          <div className="w-44">
            <Label htmlFor="segment">Segment</Label>
            <Select id="segment" name="segment" defaultValue={segment} className="mt-1">
              <option value="">All segments</option>
              {SEGMENTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Search
            </button>
            {q || segment ? (
              <Link
                href={query({ q: undefined, segment: undefined, page: undefined })}
                className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-zinc-500 hover:text-zinc-900"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {result.rows.length === 0 ? (
          <EmptyState title="No customers found" description="Customers are created when orders are placed." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Customer</TH>
                <TH>Segment</TH>
                <TH>Phone</TH>
                <TH className="text-right">Orders</TH>
                <TH className="text-right">Lifetime spend</TH>
                <TH>Last order</TH>
              </TR>
            </THead>
            <TBody>
              {result.rows.map((customer) => {
                const rowSegment = segmentOf(customer);
                return (
                  <ClickableRow key={customer.id} href={`/admin/${storeSlug}/customers/${customer.id}`}>
                    <TD>
                      <span className="font-medium text-zinc-900">
                        {`${customer.firstName} ${customer.lastName}`.trim() || "Unnamed"}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">{customer.email ?? "No email"}</span>
                    </TD>
                    <TD>
                      <Badge tone={segmentTone[rowSegment]}>{rowSegment}</Badge>
                    </TD>
                    <TD className="text-zinc-500">{customer.phone ?? "—"}</TD>
                    <TD className="text-right">{customer.ordersCount}</TD>
                    <TD className="text-right font-medium">{formatMoney(customer.totalSpent, ctx.store.currency)}</TD>
                    <TD className="text-xs text-zinc-500">{customer.lastOrderAt ? timeAgo(customer.lastOrderAt) : "—"}</TD>
                  </ClickableRow>
                );
              })}
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
