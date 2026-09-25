import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { EmptyState } from "@/components/ui/skeleton";
import { getBusinessType } from "@/lib/business-types";
import { getCart, readCartSessionKey } from "@/lib/services/cart";
import { computeCartTotals, estimateShippingFee, requirePublicStore, resolvePublicStore } from "@/lib/services/storefront";

type Props = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return {};
  const title = `Checkout — ${data.store.name}`;
  return { title: { absolute: title }, description: "Complete your order.", robots: { index: false } };
}

const FULFILLMENT_LABELS: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  shipping: "Shipping",
};

export default async function CheckoutPage({ params }: Props) {
  const { store: storeSlug } = await params;
  const data = await requirePublicStore(storeSlug);
  const sessionKey = await readCartSessionKey(data.store.id);
  const cart = sessionKey ? await getCart(data.store.id, sessionKey) : null;
  if (!cart || cart.items.length === 0) redirect(`/${storeSlug}/cart`);

  const fulfillmentOptions = getBusinessType(data.store.businessType).fulfillment;
  if (fulfillmentOptions.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <div className="mt-4 rounded-[var(--sf-radius)] border" style={{ borderColor: "var(--sf-color-border)" }}>
          <EmptyState
            title="Checkout is not available"
            description="This store does not accept orders online."
          />
        </div>
      </div>
    );
  }

  const options = fulfillmentOptions.map((value) => ({ value, label: FULFILLMENT_LABELS[value] ?? value }));
  const fees: Record<string, number> = {};
  for (const value of fulfillmentOptions) {
    fees[value] = await estimateShippingFee(data.store.id, value);
  }
  const totals = await computeCartTotals(data.store.id, cart, fulfillmentOptions[0]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1
        className="mb-6 font-semibold leading-tight tracking-tight"
        style={{ fontFamily: "var(--sf-font-heading)", fontSize: "var(--sf-h2)" }}
      >
        Checkout
      </h1>
      <CheckoutForm
        storeSlug={storeSlug}
        currency={data.store.currency}
        options={options}
        fees={fees}
        itemCount={cart.items.reduce((sum, item) => sum + item.quantity, 0)}
        subtotal={totals.subtotal}
        discount={totals.discount}
        discountCode={totals.discountCode}
        discountError={totals.discountError}
        tax={totals.tax}
        taxRate={totals.taxRate}
      />
    </div>
  );
}
