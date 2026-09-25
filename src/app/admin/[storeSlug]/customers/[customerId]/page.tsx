import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getCustomer, segmentOf, type CustomerSegment } from "@/lib/services/customers";
import { requireStoreContext } from "@/lib/tenancy/context";
import { formatDate, formatMoney, timeAgo } from "@/lib/utils";
import { CustomerForm } from "./customer-form";

const segmentTone: Record<CustomerSegment, "success" | "info" | "warning" | "default"> = {
  vip: "success",
  new: "info",
  returning: "default",
  inactive: "warning",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ storeSlug: string; customerId: string }>;
}) {
  const { storeSlug, customerId } = await params;
  const ctx = await requireStoreContext(storeSlug);
  const customer = await getCustomer(ctx, customerId);
  if (!customer) notFound();

  const segment = segmentOf(customer);
  const average = customer.ordersCount > 0 ? Math.round(customer.totalSpent / customer.ordersCount) : 0;

  return (
    <div>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`.trim() || "Customer"}
        description={customer.email ?? "No email on file"}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={segmentTone[segment]}>{segment}</Badge>
            <Link
              href={`/admin/${storeSlug}/customers`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" /> All customers
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm
              storeSlug={storeSlug}
              customerId={customer.id}
              initial={{
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email ?? "",
                phone: customer.phone ?? "",
                tags: customer.tags,
                notes: customer.notes ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifetime value</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Lifetime spend" value={formatMoney(customer.totalSpent, ctx.store.currency)} />
            <Stat label="Orders" value={String(customer.ordersCount)} />
            <Stat label="Average order" value={formatMoney(average, ctx.store.currency)} />
            <Stat label="Last order" value={customer.lastOrderAt ? timeAgo(customer.lastOrderAt) : "—"} />
            <Stat label="Customer since" value={formatDate(customer.createdAt, "en-PH").split(",")[0]} />
            {customer.tags.length ? (
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Tags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order history</CardTitle>
          </CardHeader>
          {customer.orders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders from this customer will appear here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Placed</TH>
                </TR>
              </THead>
              <TBody>
                {customer.orders.map((order) => (
                  <TR key={order.id}>
                    <TD>
                      <Link
                        href={`/admin/${storeSlug}/orders/${order.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {order.number}
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone={order.status === "cancelled" ? "danger" : order.status === "completed" ? "success" : "default"}>
                        {order.status.replace("_", " ")}
                      </Badge>
                    </TD>
                    <TD className="text-right font-medium">{formatMoney(order.total, ctx.store.currency)}</TD>
                    <TD className="text-xs text-zinc-500">{formatDate(order.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-zinc-500">No saved addresses.</p>
            ) : (
              customer.addresses.map((address) => (
                <div key={address.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                  <p className="font-medium text-zinc-900">
                    {address.label}
                    {address.isDefaultShipping ? <span className="ml-2 text-xs text-zinc-400">default shipping</span> : null}
                  </p>
                  <p className="text-zinc-600">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                  </p>
                  <p className="text-zinc-600">
                    {address.city}
                    {address.region ? `, ${address.region}` : ""} {address.postalCode ?? ""} {address.country}
                  </p>
                  {address.phone ? <p className="text-zinc-600">{address.phone}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
