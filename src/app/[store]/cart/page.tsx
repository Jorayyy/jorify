import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { removeCartAction, updateCartAction } from "@/lib/actions/storefront";
import { DiscountForm } from "@/components/storefront/discount-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/skeleton";
import { getCart, readCartSessionKey } from "@/lib/services/cart";
import { computeCartTotals, requirePublicStore, resolvePublicStore } from "@/lib/services/storefront";
import { formatMoney } from "@/lib/utils";

type Props = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return {};
  const title = `Cart — ${data.store.name}`;
  return { title: { absolute: title }, description: "Your shopping cart.", robots: { index: false } };
}

function assetUrl(value: string | null | undefined): string {
  const url = (value ?? "").trim();
  return /^https?:\/\//i.test(url) || url.startsWith("/") ? url : "";
}

export default async function CartPage({ params }: Props) {
  const { store: storeSlug } = await params;
  const data = await requirePublicStore(storeSlug);
  const currency = data.store.currency;
  const sessionKey = await readCartSessionKey(data.store.id);
  const cart = sessionKey ? await getCart(data.store.id, sessionKey) : null;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <h1
          className="font-semibold leading-tight tracking-tight"
          style={{ fontFamily: "var(--sf-font-heading)", fontSize: "var(--sf-h2)" }}
        >
          Cart
        </h1>
        <div className="mt-4 rounded-[var(--sf-radius)] border" style={{ borderColor: "var(--sf-color-border)" }}>
          <EmptyState
            title="Your cart is empty"
            description="Browse the store and add something you like."
            action={
              <Link
                href={`/${storeSlug}/products`}
                className="inline-flex h-10 items-center px-5 text-sm font-medium"
                style={{ background: "var(--sf-button-bg)", color: "var(--sf-button-fg)", border: "1px solid var(--sf-button-border)", borderRadius: "var(--sf-radius-button)" }}
              >
                Browse products
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const totals = await computeCartTotals(data.store.id, cart);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1
          className="font-semibold leading-tight tracking-tight"
          style={{ fontFamily: "var(--sf-font-heading)", fontSize: "var(--sf-h2)" }}
        >
          Cart
        </h1>
        <p className="text-sm" style={{ color: "var(--sf-color-muted)" }}>
          {cart.items.length} {cart.items.length === 1 ? "line" : "lines"}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,340px]">
        <div className="space-y-4">
          {cart.items.map((item) => {
            const image = assetUrl(item.product.images[0]?.url);
            return (
              <div
                key={item.id}
                className="flex gap-4 rounded-[var(--sf-radius)] border p-4"
                style={{ borderColor: "var(--sf-color-border)" }}
              >
                <Link
                  href={`/${storeSlug}/products/${item.product.slug}`}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--sf-radius)] border"
                  style={{ borderColor: "var(--sf-color-border)", background: "var(--sf-color-border)" }}
                >
                  {image ? (
                    <Image src={image} alt={item.product.name} fill unoptimized sizes="80px" className="object-cover" />
                  ) : (
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xl opacity-60"
                      style={{ color: "var(--sf-color-muted)" }}
                    >
                      {item.product.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/${storeSlug}/products/${item.product.slug}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      {item.variant?.name ? (
                        <p className="text-xs" style={{ color: "var(--sf-color-muted)" }}>
                          {item.variant.name}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs" style={{ color: "var(--sf-color-muted)" }}>
                        {formatMoney(item.unitPrice, currency)} each
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatMoney(item.unitPrice * item.quantity, currency)}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    <form action={updateCartAction} className="flex items-center gap-1">
                      <input type="hidden" name="storeSlug" value={storeSlug} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <Button
                        type="submit"
                        name="delta"
                        value={-1}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 px-0"
                        aria-label="Decrease quantity"
                      >
                        −
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        type="submit"
                        name="delta"
                        value={1}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 px-0"
                        aria-label="Increase quantity"
                      >
                        +
                      </Button>
                    </form>

                    <form action={removeCartAction}>
                      <input type="hidden" name="storeSlug" value={storeSlug} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit" className="text-xs font-medium underline underline-offset-4 hover:opacity-70">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside
          className="h-fit rounded-[var(--sf-radius)] border p-5"
          style={{ borderColor: "var(--sf-color-border)" }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--sf-color-muted)" }}
          >
            Order summary
          </h2>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt style={{ color: "var(--sf-color-muted)" }}>Subtotal</dt>
              <dd className="font-medium">{formatMoney(totals.subtotal, currency)}</dd>
            </div>
            {totals.discount > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <dt style={{ color: "var(--sf-color-muted)" }}>
                  Discount {totals.discountCode ? `(${totals.discountCode})` : ""}
                </dt>
                <dd className="font-medium text-emerald-600">−{formatMoney(totals.discount, currency)}</dd>
              </div>
            ) : null}
            {totals.discountError ? (
              <div className="rounded border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                {totals.discountError}
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt style={{ color: "var(--sf-color-muted)" }}>Shipping</dt>
              <dd className="text-xs" style={{ color: "var(--sf-color-muted)" }}>
                Calculated at checkout
              </dd>
            </div>
            {totals.taxRate !== null ? (
              <div className="flex items-center justify-between gap-3">
                <dt style={{ color: "var(--sf-color-muted)" }}>Tax ({totals.taxRate}%)</dt>
                <dd className="font-medium">{formatMoney(totals.tax, currency)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--sf-color-border)" }}>
              <dt className="font-semibold">Estimated total</dt>
              <dd className="text-base font-semibold">
                {formatMoney(Math.max(0, totals.subtotal - totals.discount) + totals.tax, currency)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--sf-color-border)" }}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--sf-color-muted)" }}>
              Discount code
            </p>
            <DiscountForm storeSlug={storeSlug} appliedCode={totals.discountCode} />
          </div>

          <Link
            href={`/${storeSlug}/checkout`}
            className="mt-5 flex h-11 w-full items-center justify-center px-5 text-sm font-medium"
            style={{ background: "var(--sf-button-bg)", color: "var(--sf-button-fg)", border: "1px solid var(--sf-button-border)", borderRadius: "var(--sf-radius-button)" }}
          >
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
