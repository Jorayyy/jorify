export type ModuleKey =
  | "products"
  | "categories"
  | "inventory"
  | "orders"
  | "customers"
  | "discounts"
  | "analytics"
  | "storefront"
  | "marketing"
  | "employees"
  | "settings"
  | "billing"
  | "services"
  | "appointments"
  | "delivery"
  | "shipping";

export type NavKey =
  | "overview"
  | "orders"
  | "appointments"
  | "products"
  | "categories"
  | "inventory"
  | "customers"
  | "discounts"
  | "analytics"
  | "storefront"
  | "marketing"
  | "employees"
  | "settings"
  | "billing"
  | "notifications";

export type CheckoutFulfillment = "delivery" | "pickup" | "shipping";

export type BusinessTypeDef = {
  key: string;
  label: string;
  description: string;
  modules: Record<ModuleKey, boolean>;
  nav: NavKey[];
  widgets: string[];
  orderStatuses: string[];
  defaultTheme: string;
  fulfillment: CheckoutFulfillment[];
  defaultAttributes: { name: string; values: string[] }[];
  productKinds: ("product" | "service")[];
};

const baseModules = (overrides: Partial<Record<ModuleKey, boolean>> = {}): Record<ModuleKey, boolean> => ({
  products: true,
  categories: true,
  inventory: true,
  orders: true,
  customers: true,
  discounts: true,
  analytics: true,
  storefront: true,
  marketing: true,
  employees: true,
  settings: true,
  billing: true,
  services: false,
  appointments: false,
  delivery: true,
  shipping: true,
  ...overrides,
});

const CORE_NAV: NavKey[] = [
  "overview",
  "orders",
  "products",
  "categories",
  "inventory",
  "customers",
  "discounts",
  "analytics",
  "storefront",
  "marketing",
  "employees",
  "settings",
  "billing",
];

export const BASE_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
];

const CORE_WIDGETS = [
  "revenue",
  "orders",
  "customers",
  "average_order_value",
  "sales_graph",
  "recent_orders",
  "low_stock",
  "top_products",
];

export const BUSINESS_TYPES: Record<string, BusinessTypeDef> = {
  retail: {
    key: "retail",
    label: "Retail store",
    description: "Physical goods with variants, inventory and shipping.",
    modules: baseModules(),
    nav: CORE_NAV,
    widgets: CORE_WIDGETS,
    orderStatuses: BASE_ORDER_STATUSES,
    defaultTheme: "minimal",
    fulfillment: ["delivery", "pickup", "shipping"],
    defaultAttributes: [
      { name: "Size", values: ["XS", "S", "M", "L", "XL"] },
      { name: "Color", values: ["Black", "White", "Blue"] },
    ],
    productKinds: ["product"],
  },
  fashion: {
    key: "fashion",
    label: "Clothing brand",
    description: "Apparel with rich variant options and lookbook storefronts.",
    modules: baseModules(),
    nav: CORE_NAV,
    widgets: [...CORE_WIDGETS, "customer_activity"],
    orderStatuses: BASE_ORDER_STATUSES,
    defaultTheme: "editorial",
    fulfillment: ["delivery", "pickup", "shipping"],
    defaultAttributes: [
      { name: "Size", values: ["XS", "S", "M", "L", "XL"] },
      { name: "Color", values: ["Black", "White", "Beige", "Navy"] },
    ],
    productKinds: ["product"],
  },
  electronics: {
    key: "electronics",
    label: "Electronics store",
    description: "Tech products with SKUs, specs and warranty tracking.",
    modules: baseModules(),
    nav: CORE_NAV,
    widgets: CORE_WIDGETS,
    orderStatuses: BASE_ORDER_STATUSES,
    defaultTheme: "minimal",
    fulfillment: ["delivery", "pickup", "shipping"],
    defaultAttributes: [{ name: "Storage", values: ["64GB", "128GB", "256GB"] }],
    productKinds: ["product"],
  },
  grocery: {
    key: "grocery",
    label: "Grocery store",
    description: "High-volume goods with weight-based units and local delivery.",
    modules: baseModules(),
    nav: CORE_NAV,
    widgets: [...CORE_WIDGETS, "low_stock"],
    orderStatuses: ["pending", "confirmed", "processing", "ready", "shipped", "completed", "cancelled"],
    defaultTheme: "local",
    fulfillment: ["delivery", "pickup"],
    defaultAttributes: [{ name: "Size", values: ["Small", "Medium", "Large"] }],
    productKinds: ["product"],
  },
  bakery: {
    key: "bakery",
    label: "Bakery",
    description: "Fresh goods with daily inventory and pre-orders.",
    modules: baseModules({ shipping: false }),
    nav: CORE_NAV.filter((n) => n !== "marketing"),
    widgets: [...CORE_WIDGETS, "low_stock"],
    orderStatuses: ["pending", "confirmed", "ready", "completed", "cancelled"],
    defaultTheme: "local",
    fulfillment: ["pickup", "delivery"],
    defaultAttributes: [{ name: "Size", values: ["6\", 10\", 14\""] }],
    productKinds: ["product", "service"],
  },
  restaurant: {
    key: "restaurant",
    label: "Restaurant",
    description: "Menu-driven ordering with pickup and delivery.",
    modules: baseModules({ shipping: false, categories: true }),
    nav: ["overview", "orders", "products", "categories", "customers", "analytics", "storefront", "employees", "settings", "billing"],
    widgets: ["revenue", "orders", "average_order_value", "sales_graph", "recent_orders", "top_products"],
    orderStatuses: ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],
    defaultTheme: "restaurant",
    fulfillment: ["pickup", "delivery"],
    defaultAttributes: [
      { name: "Portion", values: ["Regular", "Large"] },
      { name: "Spice", values: ["Mild", "Medium", "Hot"] },
    ],
    productKinds: ["product"],
  },
  cafe: {
    key: "cafe",
    label: "Cafe",
    description: "Drinks and bites with quick pickup ordering.",
    modules: baseModules({ shipping: false }),
    nav: ["overview", "orders", "products", "categories", "inventory", "customers", "analytics", "storefront", "employees", "settings", "billing"],
    widgets: ["revenue", "orders", "average_order_value", "sales_graph", "recent_orders", "top_products"],
    orderStatuses: ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],
    defaultTheme: "restaurant",
    fulfillment: ["pickup", "delivery"],
    defaultAttributes: [
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Milk", values: ["Regular", "Oat", "Almond"] },
    ],
    productKinds: ["product"],
  },
  beauty: {
    key: "beauty",
    label: "Beauty business",
    description: "Cosmetics with shades and bundled services.",
    modules: baseModules({ services: true, appointments: true }),
    nav: [...CORE_NAV.slice(0, 6), "appointments", ...CORE_NAV.slice(6)],
    widgets: [...CORE_WIDGETS, "appointments_today"],
    orderStatuses: BASE_ORDER_STATUSES,
    defaultTheme: "premium",
    fulfillment: ["delivery", "pickup", "shipping"],
    defaultAttributes: [
      { name: "Shade", values: ["Fair", "Medium", "Deep"] },
      { name: "Size", values: ["Mini", "Full"] },
    ],
    productKinds: ["product", "service"],
  },
  salon: {
    key: "salon",
    label: "Salon",
    description: "Services, staff scheduling and appointments.",
    modules: baseModules({ shipping: false, delivery: false, inventory: true }),
    nav: ["overview", "orders", "appointments", "products", "customers", "employees", "analytics", "storefront", "settings", "billing"],
    widgets: ["revenue", "orders", "appointments_today", "customers", "sales_graph", "recent_orders"],
    orderStatuses: ["pending", "confirmed", "ready", "completed", "cancelled", "no_show"],
    defaultTheme: "premium",
    fulfillment: ["pickup"],
    defaultAttributes: [{ name: "Length", values: ["Short", "Medium", "Long"] }],
    productKinds: ["product", "service"],
  },
  pet_shop: {
    key: "pet_shop",
    label: "Pet shop",
    description: "Pet products, grooming services and pet records.",
    modules: baseModules({ services: true, appointments: true }),
    nav: [...CORE_NAV],
    widgets: [...CORE_WIDGETS, "appointments_today"],
    orderStatuses: BASE_ORDER_STATUSES,
    defaultTheme: "local",
    fulfillment: ["delivery", "pickup", "shipping"],
    defaultAttributes: [
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Flavor", values: ["Chicken", "Beef", "Fish"] },
    ],
    productKinds: ["product", "service"],
  },
  services: {
    key: "services",
    label: "Service business",
    description: "Bookable services with staff availability.",
    modules: baseModules({ inventory: false, shipping: false, delivery: false }),
    nav: ["overview", "orders", "products", "customers", "employees", "analytics", "storefront", "settings", "billing"],
    widgets: ["revenue", "orders", "customers", "average_order_value", "sales_graph", "recent_orders"],
    orderStatuses: ["pending", "confirmed", "processing", "completed", "cancelled"],
    defaultTheme: "minimal",
    fulfillment: ["pickup"],
    defaultAttributes: [{ name: "Duration", values: ["30 min", "60 min", "90 min"] }],
    productKinds: ["service"],
  },
  digital_products: {
    key: "digital_products",
    label: "Digital products",
    description: "Downloads and licenses, no shipping required.",
    modules: baseModules({ inventory: false, shipping: false, delivery: false }),
    nav: CORE_NAV.filter((n) => n !== "inventory"),
    widgets: CORE_WIDGETS,
    orderStatuses: ["pending", "confirmed", "completed", "cancelled", "refunded"],
    defaultTheme: "editorial",
    fulfillment: [],
    defaultAttributes: [{ name: "License", values: ["Personal", "Commercial"] }],
    productKinds: ["product"],
  },
  custom: {
    key: "custom",
    label: "Custom business",
    description: "Every module enabled. Configure what you need.",
    modules: baseModules({ services: true, appointments: true }),
    nav: CORE_NAV,
    widgets: CORE_WIDGETS,
    orderStatuses: BASE_ORDER_STATUSES,
    defaultTheme: "minimal",
    fulfillment: ["delivery", "pickup", "shipping"],
    defaultAttributes: [{ name: "Option", values: ["Default"] }],
    productKinds: ["product", "service"],
  },
};

export const DEFAULT_BUSINESS_TYPE = "retail";

export function getBusinessType(key: string | null | undefined): BusinessTypeDef {
  return BUSINESS_TYPES[key ?? ""] ?? BUSINESS_TYPES[DEFAULT_BUSINESS_TYPE];
}

export function moduleEnabled(type: BusinessTypeDef, module: ModuleKey): boolean {
  return Boolean(type.modules[module]);
}
