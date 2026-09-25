import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requirePublicStore, resolvePublicStore } from "@/lib/services/storefront";
import { formatMoney } from "@/lib/utils";

type Props = { params: Promise<{ store: string; orderId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return {};
  const title = `Order confirmation — ${data.store.name}`;
  return { title: { absolute: title }, robots: { index: false } };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { store: storeSlug, orderId } = await params;
  const data = await requirePublicStore(storeSlug);

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.storeId, data.store.id)),
    with: { items: true, customer: true },
  });
  if (!order) notFound();

  const address = (order.shippingAddress ?? {}) as Record<string, unknown>;
  const addressLine = [asString(address.line1), asString(address.line2), asString(address.city)]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--sf-color-muted)" }}>
        Order received
      </p>
      <h1
        className="mt-2 font-semibold leading-tight tracking-tight"
        style={{ fontFamily: "var(--sf-font-heading)", fontSize: "var(--sf-h2)" }}
      >
        Thank you{order.customer?.firstName ? `, ${order.customer.firstName}` : ""}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--sf-color-muted)" }}>
        Order {order.number} · {new Date(order.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })} · We sent
        a confirmation to {order.email}.
      </p>

      <div className="mt-6 rounded-[var(--sf-radius)] border p-5" style={{ borderColor: "var(--sf-color-border)" }}>
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt style={{ color: "var(--sf-color-muted)" }}>Order status</dt>
            <dd className="font-medium capitalize">{order.status}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt style={{ color: "var(--sf-color-muted)" }}>Fulfillment</dt>
            <dd className="font-medium capitalize">{order.fulfillmentType}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt style={{ color: "var(--sf-color-muted)" }}>Payment</dt>
            <dd className="font-medium capitalize">{order.paymentStatus}</dd>
          </div>
          {addressLine ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0" style={{ color: "var(--sf-color-muted)" }}>
                Ship to
              </dt>
              <dd className="text-right">{addressLine}</dd>
            </div>
          ) : null}
        </dl>
        {order.paymentStatus === "pending" ? (
          <p className="mt-4 rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--sf-color-border)", color: "var(--sf-color-muted)" }}>
            Payment has not been recorded yet. The store will confirm it once it arrives.
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-[var(--sf-radius)] border" style={{ borderColor: "var(--sf-color-border)" }}>
        <ul className="divide-y" style={{ borderColor: "var(--sf-color-border)" }}>
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 p-4 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                {item.variantTitle ? (
                  <p className="text-xs" style={{ color: "var(--sf-color-muted)" }}>
                    {item.variantTitle}
                  </p>
                ) : null}
                <p className="mt-1 text-xs" style={{ color: "var(--sf-color-muted)" }}>
                  {item.quantity} × {formatMoney(item.unitPrice, data.store.currency)}
                </p>
              </div>
              <p className="shrink-0 font-medium">{formatMoney(item.total, data.store.currency)}</p>
            </li>
          ))}
        </ul>
        <dl
          className="space-y-2 border-t p-4 text-sm"
          style={{ borderColor: "var(--sf-color-border)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <dt style={{ color: "var(--sf-color-muted)" }}>Subtotal</dt>
            <dd>{formatMoney(order.subtotal, data.store.currency)}</dd>
          </div>
          {order.discountTotal > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt style={{ color: "var(--sf-color-muted)" }}>Discount {order.discountCode ? `(${order.discountCode})` : ""}</dt>
              <dd className="text-emerald-600">−{formatMoney(order.discountTotal, data.store.currency)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <dt style={{ color: "var(--sf-color-muted)" }}>Shipping</dt>
            <dd>{formatMoney(order.shippingTotal, data.store.currency)}</dd>
          </div>
          {order.taxTotal > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt style={{ color: "var(--sf-color-muted)" }}>Tax</dt>
              <dd>{formatMoney(order.taxTotal, data.store.currency)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 border-t pt-3 font-semibold" style={{ borderColor: "var(--sf-color-border)" }}>
            <dt>Total</dt>
            <dd>{formatMoney(order.total, data.store.currency)}</dd>
          </div>
        </dl>
      </div>

      <Link
        href={`/${storeSlug}`}
        className="mt-6 inline-flex h-10 items-center px-5 text-sm font-medium"
        style={{
          background: "var(--sf-button-bg)",
          color: "var(--sf-button-fg)",
          border: "1px solid var(--sf-button-border)",
          borderRadius: "var(--sf-radius-button)",
        }}
      >
        Back to store
      </Link>
    </div>
  );
}
