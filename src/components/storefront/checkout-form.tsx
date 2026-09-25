"use client";

import * as React from "react";
import { useActionState } from "react";
import { placeOrderAction, type CheckoutFormState } from "@/lib/actions/storefront";
import { formatMoney } from "@/lib/utils";

type Option = { value: string; label: string };

export function CheckoutForm({
  storeSlug,
  currency,
  options,
  fees,
  itemCount,
  subtotal,
  discount,
  discountCode,
  discountError,
  tax,
  taxRate,
}: {
  storeSlug: string;
  currency: string;
  options: Option[];
  fees: Record<string, number>;
  itemCount: number;
  subtotal: number;
  discount: number;
  discountCode: string | null;
  discountError: string | null;
  tax: number;
  taxRate: number | null;
}) {
  const [state, formAction, pending] = useActionState<CheckoutFormState, FormData>(placeOrderAction, null);
  const [fulfillment, setFulfillment] = React.useState(options[0]?.value ?? "delivery");
  const shipping = fees[fulfillment] ?? 0;
  const total = Math.max(0, subtotal - discount) + shipping + tax;
  const needsAddress = fulfillment === "delivery" || fulfillment === "shipping";

  const fieldClass =
    "h-10 w-full rounded-[var(--sf-radius)] border bg-white px-3 text-sm";
  const fieldStyle: React.CSSProperties = { borderColor: "var(--sf-color-border)", color: "var(--sf-color-text)" };
  const labelClass = "block text-xs font-medium uppercase tracking-wide";
  const labelStyle: React.CSSProperties = { color: "var(--sf-color-muted)" };

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr,340px]">
      <div className="space-y-8">
        <input type="hidden" name="storeSlug" value={storeSlug} />

        <section className="rounded-[var(--sf-radius)] border p-5" style={{ borderColor: "var(--sf-color-border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--sf-color-muted)" }}>
            Contact
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="email" className={labelClass} style={labelStyle}>
                Email
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label htmlFor="firstName" className={labelClass} style={labelStyle}>
                First name
              </label>
              <input id="firstName" name="firstName" required autoComplete="given-name" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass} style={labelStyle}>
                Last name
              </label>
              <input id="lastName" name="lastName" autoComplete="family-name" className={fieldClass} style={fieldStyle} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="phone" className={labelClass} style={labelStyle}>
                Phone
              </label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" className={fieldClass} style={fieldStyle} />
            </div>
          </div>
        </section>

        <section className="rounded-[var(--sf-radius)] border p-5" style={{ borderColor: "var(--sf-color-border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--sf-color-muted)" }}>
            Fulfillment
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {options.map((option) => {
              const active = fulfillment === option.value;
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--sf-radius)] border px-3 py-2.5 text-sm"
                  style={{ borderColor: active ? "var(--sf-color-primary)" : "var(--sf-color-border)" }}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value={option.value}
                    checked={active}
                    onChange={() => setFulfillment(option.value)}
                    className="accent-[var(--sf-color-primary)]"
                  />
                  <span className="font-medium">{option.label}</span>
                  {option.value !== "pickup" && fees[option.value] > 0 ? (
                    <span className="ml-auto text-xs" style={{ color: "var(--sf-color-muted)" }}>
                      {formatMoney(fees[option.value], currency)}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </section>

        <section className="rounded-[var(--sf-radius)] border p-5" style={{ borderColor: "var(--sf-color-border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--sf-color-muted)" }}>
            {fulfillment === "pickup" ? "Pickup details" : "Delivery address"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="line1" className={labelClass} style={labelStyle}>
                Street address {needsAddress ? "" : "(optional)"}
              </label>
              <input
                id="line1"
                name="line1"
                autoComplete="address-line1"
                required={needsAddress}
                className={fieldClass}
                style={fieldStyle}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="line2" className={labelClass} style={labelStyle}>
                Apartment, unit, floor
              </label>
              <input id="line2" name="line2" autoComplete="address-line2" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label htmlFor="city" className={labelClass} style={labelStyle}>
                City {needsAddress ? "" : "(optional)"}
              </label>
              <input
                id="city"
                name="city"
                autoComplete="address-level2"
                required={needsAddress}
                className={fieldClass}
                style={fieldStyle}
              />
            </div>
            <div>
              <label htmlFor="region" className={labelClass} style={labelStyle}>
                State / province
              </label>
              <input id="region" name="region" autoComplete="address-level1" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label htmlFor="postalCode" className={labelClass} style={labelStyle}>
                Postal code
              </label>
              <input id="postalCode" name="postalCode" autoComplete="postal-code" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label htmlFor="country" className={labelClass} style={labelStyle}>
                Country
              </label>
              <input id="country" name="country" autoComplete="country" className={fieldClass} style={fieldStyle} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="note" className={labelClass} style={labelStyle}>
                Order note
              </label>
              <textarea id="note" name="note" rows={3} className="w-full rounded-[var(--sf-radius)] border bg-white px-3 py-2 text-sm" style={fieldStyle} />
            </div>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-[var(--sf-radius)] border p-5" style={{ borderColor: "var(--sf-color-border)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--sf-color-muted)" }}>
          Order summary
        </h2>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt style={{ color: "var(--sf-color-muted)" }}>
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
            </dt>
            <dd className="font-medium">{formatMoney(subtotal, currency)}</dd>
          </div>
          {discount > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt style={{ color: "var(--sf-color-muted)" }}>
                Discount {discountCode ? `(${discountCode})` : ""}
              </dt>
              <dd className="font-medium text-emerald-600">−{formatMoney(discount, currency)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <dt style={{ color: "var(--sf-color-muted)" }}>
              {fulfillment === "pickup" ? "Pickup" : "Shipping"}
            </dt>
            <dd className="font-medium">
              {fulfillment === "pickup" ? "—" : formatMoney(shipping, currency)}
            </dd>
          </div>
          {taxRate !== null ? (
            <div className="flex items-center justify-between gap-3">
              <dt style={{ color: "var(--sf-color-muted)" }}>Tax ({taxRate}%)</dt>
              <dd className="font-medium">{formatMoney(tax, currency)}</dd>
            </div>
          ) : null}
          <div
            className="flex items-center justify-between gap-3 border-t pt-3"
            style={{ borderColor: "var(--sf-color-border)" }}
          >
            <dt className="font-semibold">Total</dt>
            <dd className="text-base font-semibold">{formatMoney(total, currency)}</dd>
          </div>
        </dl>

        {discountError ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">{discountError}</p>
        ) : null}
        {state?.error ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 h-11 w-full px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "var(--sf-button-bg)",
            color: "var(--sf-button-fg)",
            border: "1px solid var(--sf-button-border)",
            borderRadius: "var(--sf-radius-button)",
          }}
        >
          {pending ? "Placing order" : "Place order"}
        </button>

        <p className="mt-3 text-xs" style={{ color: "var(--sf-color-muted)" }}>
          Totals are re-checked when the order is placed. If anything changed, the form will say so.
        </p>
      </aside>
    </form>
  );
}
