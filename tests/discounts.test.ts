import { describe, expect, it } from "vitest";

import { applyDiscountAmount, type DiscountableItem } from "@/lib/services/orders";
import { formatMoney } from "@/lib/utils";
import type { discounts } from "@/lib/db/schema";

type DiscountRow = typeof discounts.$inferSelect;

function makeDiscount(overrides: Partial<DiscountRow> = {}): DiscountRow {
  return {
    id: "d1",
    storeId: "s1",
    name: "Test",
    code: "TEST",
    type: "percentage",
    value: 10,
    appliesTo: "all",
    productIds: [],
    categoryIds: [],
    minSubtotal: 0,
    usageLimit: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

const items: DiscountableItem[] = [
  { productId: "p1", categoryId: "c1", total: 50_000 },
  { productId: "p2", categoryId: "c2", total: 25_000 },
];

describe("applyDiscountAmount", () => {
  it("applies percentage discounts to the whole subtotal", () => {
    expect(applyDiscountAmount(makeDiscount({ value: 10 }), 75_000, items)).toBe(7_500);
  });

  it("caps fixed discounts at the applicable amount", () => {
    expect(applyDiscountAmount(makeDiscount({ type: "fixed", value: 100_000 }), 75_000, items)).toBe(75_000);
    expect(applyDiscountAmount(makeDiscount({ type: "fixed", value: 1_000 }), 75_000, items)).toBe(1_000);
  });

  it("returns 0 below the minimum subtotal", () => {
    expect(applyDiscountAmount(makeDiscount({ minSubtotal: 100_000 }), 75_000, items)).toBe(0);
  });

  it("scopes product discounts to listed products only", () => {
    const row = makeDiscount({ appliesTo: "products", productIds: ["p2"], value: 50 });
    expect(applyDiscountAmount(row, 75_000, items)).toBe(12_500);
  });

  it("scopes category discounts and ignores items without a category", () => {
    const row = makeDiscount({ appliesTo: "categories", categoryIds: ["c1"], value: 20 });
    expect(applyDiscountAmount(row, 75_000, items)).toBe(10_000);
    expect(applyDiscountAmount(row, 75_000, [{ productId: "p3", categoryId: null, total: 10_000 }])).toBe(0);
  });
});

describe("formatMoney", () => {
  it("renders integer minor units in en-PH pesos", () => {
    expect(formatMoney(12_345)).toContain("123.45");
  });

  it("renders zero", () => {
    expect(formatMoney(0)).toContain("0.00");
  });
});
