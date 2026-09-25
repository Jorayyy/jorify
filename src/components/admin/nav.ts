import {
  BarChart3,
  Bell,
  Calendar,
  CreditCard,
  Home,
  Megaphone,
  Package,
  Receipt,
  Settings,
  Shapes,
  ShoppingBag,
  Store,
  Tags,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { BusinessTypeDef, ModuleKey, NavKey } from "@/lib/business-types";

export type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  icon: LucideIcon;
  module?: ModuleKey;
  permission?: string;
};

export const NAV_ITEMS: Record<NavKey, NavItem> = {
  overview: { key: "overview", label: "Overview", href: "", icon: Home },
  orders: { key: "orders", label: "Orders", href: "/orders", icon: Receipt, module: "orders", permission: "orders.read" },
  appointments: {
    key: "appointments",
    label: "Appointments",
    href: "/appointments",
    icon: Calendar,
    module: "appointments",
    permission: "orders.read",
  },
  products: {
    key: "products",
    label: "Products",
    href: "/products",
    icon: Package,
    module: "products",
    permission: "products.read",
  },
  categories: {
    key: "categories",
    label: "Categories",
    href: "/categories",
    icon: Shapes,
    module: "categories",
    permission: "products.read",
  },
  inventory: {
    key: "inventory",
    label: "Inventory",
    href: "/inventory",
    icon: Warehouse,
    module: "inventory",
    permission: "inventory.read",
  },
  customers: {
    key: "customers",
    label: "Customers",
    href: "/customers",
    icon: Users,
    module: "customers",
    permission: "customers.read",
  },
  discounts: {
    key: "discounts",
    label: "Discounts",
    href: "/discounts",
    icon: Tags,
    module: "discounts",
    permission: "discounts.read",
  },
  analytics: {
    key: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    module: "analytics",
    permission: "analytics.read",
  },
  storefront: {
    key: "storefront",
    label: "Storefront",
    href: "/storefront",
    icon: Store,
    module: "storefront",
    permission: "storefront.update",
  },
  marketing: {
    key: "marketing",
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    module: "marketing",
    permission: "discounts.read",
  },
  employees: {
    key: "employees",
    label: "Employees",
    href: "/employees",
    icon: ShoppingBag,
    module: "employees",
    permission: "employees.read",
  },
  settings: {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    permission: "settings.read",
  },
  billing: {
    key: "billing",
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
    module: "billing",
    permission: "settings.read",
  },
  notifications: { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
};

export function buildNav(type: BusinessTypeDef, can: (permission?: string) => boolean): NavItem[] {
  const items = type.nav
    .map((key) => NAV_ITEMS[key])
    .filter(Boolean)
    .filter((item) => (item.module ? type.modules[item.module] !== false : true))
    .filter((item) => can(item.permission));

  if (!items.some((item) => item.key === "notifications")) items.push(NAV_ITEMS.notifications);
  return items;
}
