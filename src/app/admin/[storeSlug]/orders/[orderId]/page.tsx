import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getBusinessType } from "@/lib/business-types";
import { getOrder } from "@/lib/services/orders";
import { requireStoreContext } from "@/lib/tenancy/context";
import { formatDate, formatMoney, timeAgo } from "@/lib/utils";
import { OrderActions } from "../order-actions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ storeSlug: string; orderId: string }>;
}) {
  const { storeSlug, orderId } = await params;
  const ctx = await requireStoreContext(storeSlug);
  const type = getBusinessType(ctx.store.businessType);
  const order = await getOrder(ctx, orderId);
  if (!order) notFound();

  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim() || order.customer.email
    : order.email ?? "Guest";

  const totals = [
    { label: "Subtotal", value: order.subtotal },
    ...(order.discountTotal ? [{ label: `Discount${order.discountCode ? ` (${order.discountCode})` : ""}`, value: -order.discountTotal }] : []),
    { label: "Shipping", value: order.shippingTotal },
    { label: "Tax", value: order.taxTotal },
  ];

  return (
    <div>
      <PageHeader
        title={`Order ${order.number}`}
        description={`${customerName} · placed ${formatDate(order.placedAt)}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={order.paymentStatus === "paid" ? "success" : "warning"}>{order.paymentStatus}</Badge>
            <Badge tone={order.status === "cancelled" ? "danger" : order.status === "completed" ? "success" : "default"}>
              {order.status.replace("_", " ")}
            </Badge>
            <Link
              href={`/admin/${storeSlug}/orders`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" /> All orders
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Contact</p>
                <p className="mt-1 font-medium text-zinc-900">{customerName}</p>
                {order.email ? <p className="text-zinc-600">{order.email}</p> : null}
                {order.phone ? <p className="text-zinc-600">{order.phone}</p> : null}
                {order.customer ? (
                  <Link
                    href={`/admin/${storeSlug}/customers/${order.customer.id}`}
                    className="mt-1 inline-block text-xs font-medium text-zinc-500 hover:text-zinc-900"
                  >
                    View customer →
                  </Link>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {order.fulfillmentType === "pickup" ? "Pickup" : "Shipping address"}
                </p>
                {order.shippingAddress ? (
                  <div className="mt-1 text-zinc-600">
                    {Object.values(order.shippingAddress)
                      .filter((value) => typeof value === "string" && value.trim())
                      .map((value) => (
                        <p key={String(value)}>{String(value)}</p>
                      ))}
                  </div>
                ) : (
                  <p className="mt-1 text-zinc-400">No address provided</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <Table>
              <THead>
                <TR>
                  <TH>Item</TH>
                  <TH className="text-right">Qty</TH>
                  <TH className="text-right">Unit</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {order.items.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <span className="font-medium text-zinc-900">{item.title}</span>
                      {item.variantTitle ? <span className="text-zinc-500"> — {item.variantTitle}</span> : null}
                      {item.sku ? <span className="ml-2 text-xs text-zinc-400">{item.sku}</span> : null}
                    </TD>
                    <TD className="text-right">{item.quantity}</TD>
                    <TD className="text-right">{formatMoney(item.unitPrice, order.currency)}</TD>
                    <TD className="text-right font-medium">{formatMoney(item.total, order.currency)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.events.length === 0 ? <p className="text-sm text-zinc-500">No events yet.</p> : null}
              {order.events.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="text-zinc-700">{event.body}</p>
                    <p className="text-xs text-zinc-400">{event.type}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">{timeAgo(event.createdAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Update order</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderActions
                storeSlug={storeSlug}
                orderId={order.id}
                statuses={type.orderStatuses}
                currentStatus={order.status}
                paymentStatus={order.paymentStatus}
                canUpdate={ctx.can("orders.update")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {totals.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">{row.label}</span>
                  <span className={row.value < 0 ? "text-emerald-600" : "text-zinc-700"}>
                    {formatMoney(row.value, order.currency)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-2">
                <span className="font-medium text-zinc-900">Total</span>
                <span className="text-base font-semibold text-zinc-900">{formatMoney(order.total, order.currency)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.payments.length === 0 ? (
                <p className="text-zinc-500">
                  No payment records. {order.paymentStatus === "paid" ? "Marked as paid manually." : "Use “Mark paid” once money is received."}
                </p>
              ) : (
                order.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-800">{payment.provider}</p>
                      <p className="text-xs text-zinc-400">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p>{formatMoney(payment.amount, payment.currency)}</p>
                      <Badge tone={payment.status === "succeeded" ? "success" : "default"}>{payment.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
