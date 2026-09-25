export const ROLES = ["owner", "admin", "manager", "staff", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "orders.read",
  "orders.update",
  "orders.delete",
  "products.read",
  "products.create",
  "products.update",
  "products.delete",
  "inventory.read",
  "inventory.update",
  "customers.read",
  "customers.update",
  "customers.delete",
  "discounts.read",
  "discounts.update",
  "analytics.read",
  "employees.read",
  "employees.manage",
  "settings.read",
  "settings.update",
  "storefront.update",
  "billing.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== "billing.manage"),
  manager: [
    "orders.read",
    "orders.update",
    "products.read",
    "products.create",
    "products.update",
    "inventory.read",
    "inventory.update",
    "customers.read",
    "customers.update",
    "discounts.read",
    "analytics.read",
    "employees.read",
    "settings.read",
    "storefront.update",
  ],
  staff: ["orders.read", "orders.update", "products.read", "inventory.read", "customers.read", "customers.update"],
  viewer: ["orders.read", "products.read", "inventory.read", "customers.read", "analytics.read", "settings.read"],
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function roleCan(role: string, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
