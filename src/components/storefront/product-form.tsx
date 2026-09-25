"use client";

import * as React from "react";
import { addItemToCart } from "@/lib/actions/storefront";
import { sfButtonStyle } from "@/lib/storefront/themes";
import { formatMoney } from "@/lib/utils";

type VariantOption = { name: string; value: string };
type Variant = { id: string; price: number; compareAtPrice: number | null; options: VariantOption[] };

export function ProductForm({
  storeSlug,
  currency,
  productId,
  price,
  compareAtPrice,
  variants,
  variantStock,
  baseStock,
}: {
  storeSlug: string;
  currency: string;
  productId: string;
  price: number;
  compareAtPrice: number | null;
  variants: Variant[];
  variantStock: Record<string, number>;
  baseStock: number | null;
}) {
  const optionNames = React.useMemo(() => {
    const names: string[] = [];
    for (const variant of variants) {
      for (const option of variant.options) {
        if (!names.includes(option.name)) names.push(option.name);
      }
    }
    return names;
  }, [variants]);

  const [selected, setSelected] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const first = variants[0];
    for (const name of optionNames) {
      initial[name] = first?.options.find((option) => option.name === name)?.value ?? "";
    }
    return initial;
  });
  const [quantity, setQuantity] = React.useState(1);

  const matched = React.useMemo(() => {
    if (optionNames.length === 0) return null;
    return (
      variants.find((variant) =>
        optionNames.every((name) => variant.options.find((option) => option.name === name)?.value === selected[name]),
      ) ?? null
    );
  }, [optionNames, selected, variants]);

  function valuesFor(name: string): string[] {
    const values: string[] = [];
    for (const variant of variants) {
      const othersMatch = optionNames.every(
        (other) => other === name || variant.options.find((option) => option.name === other)?.value === selected[other],
      );
      if (!othersMatch) continue;
      const value = variant.options.find((option) => option.name === name)?.value;
      if (value && !values.includes(value)) values.push(value);
    }
    return values;
  }

  const unavailable = optionNames.length > 0 && !matched;
  const currentPrice = matched ? matched.price : price;
  const currentCompare = matched ? matched.compareAtPrice : compareAtPrice;
  const availableStock = matched ? variantStock[matched.id] ?? null : baseStock;
  const soldOut = availableStock !== null && availableStock <= 0;
  const disabled = unavailable || soldOut;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold" style={{ color: "var(--sf-color-text)" }}>
          {formatMoney(currentPrice, currency)}
        </span>
        {currentCompare && currentCompare > currentPrice ? (
          <span className="text-sm line-through" style={{ color: "var(--sf-color-muted)" }}>
            {formatMoney(currentCompare, currency)}
          </span>
        ) : null}
      </div>

      {optionNames.map((name) => (
        <div key={name} className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--sf-color-muted)" }}>
            {name}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {valuesFor(name).map((value) => {
              const active = selected[name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelected((current) => ({ ...current, [name]: value }))}
                  className="h-9 rounded-[var(--sf-radius)] border px-3 text-sm font-medium"
                  style={
                    active
                      ? { background: "var(--sf-color-primary)", borderColor: "var(--sf-color-primary)", color: "var(--sf-color-on-primary)" }
                      : { borderColor: "var(--sf-color-border)", color: "var(--sf-color-text)" }
                  }
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <form action={addItemToCart} className="mt-6 flex flex-wrap items-center gap-3">
        <input type="hidden" name="storeSlug" value={storeSlug} />
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantId" value={matched?.id ?? ""} />
        <input
          type="number"
          name="quantity"
          min={1}
          max={99}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
          aria-label="Quantity"
          className="h-11 w-20 rounded-[var(--sf-radius)] border bg-white px-3 text-center text-sm"
          style={{ borderColor: "var(--sf-color-border)", color: "var(--sf-color-text)" }}
        />
        <button
          type="submit"
          disabled={disabled}
          className="h-11 min-w-[180px] flex-1 px-6 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          style={sfButtonStyle()}
        >
          {soldOut ? "Out of stock" : unavailable ? "Option unavailable" : "Add to cart"}
        </button>
      </form>

      {unavailable ? (
        <p className="mt-2 text-sm text-red-600">This combination is not available. Pick another option.</p>
      ) : null}
      {!unavailable && soldOut ? <p className="mt-2 text-sm text-red-600">This item is out of stock.</p> : null}
      {!disabled && availableStock !== null && availableStock > 0 ? (
        <p className="mt-2 text-sm" style={{ color: "var(--sf-color-muted)" }}>
          {availableStock} in stock
        </p>
      ) : null}
    </div>
  );
}
