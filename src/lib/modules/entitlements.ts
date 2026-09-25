export type EntitlementKey =
  | "products.limit"
  | "employees.limit"
  | "stores.limit"
  | "orders.limit"
  | "custom_domain"
  | "analytics"
  | "advanced_themes"
  | "abandoned_cart";

export const DEFAULT_ENTITLEMENTS: Record<EntitlementKey, number | boolean> = {
  "products.limit": 20,
  "employees.limit": 2,
  "stores.limit": 1,
  "orders.limit": 100,
  custom_domain: false,
  analytics: false,
  advanced_themes: false,
  abandoned_cart: false,
};

export function planEntitlement(
  entitlements: Record<string, unknown>,
  key: EntitlementKey,
): number | boolean {
  const value = entitlements?.[key];
  if (value === undefined || value === null) return DEFAULT_ENTITLEMENTS[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? DEFAULT_ENTITLEMENTS[key] : parsed;
  }
  return DEFAULT_ENTITLEMENTS[key];
}

export function withinLimit(current: number, entitlement: number | boolean): boolean {
  if (typeof entitlement === "boolean") return entitlement;
  return current < entitlement;
}
