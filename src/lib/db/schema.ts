import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    image: text("image"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), index("users_created_at_idx").on(t.createdAt)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("accounts_provider_idx").on(t.provider, t.providerAccountId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.sessionToken)],
);

// ---------------------------------------------------------------------------
// Organizations & membership (tenant root)
// ---------------------------------------------------------------------------

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex("organizations_slug_idx").on(t.slug)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("staff"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("organization_members_unique_idx").on(t.organizationId, t.userId),
    index("organization_members_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Stores (tenant)
// ---------------------------------------------------------------------------

export const stores = pgTable(
  "stores",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    businessType: text("business_type").notNull().default("retail"),
    description: text("description"),
    currency: text("currency").notNull().default("PHP"),
    locale: text("locale").notNull().default("en-PH"),
    logoUrl: text("logo_url"),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("stores_slug_idx").on(t.slug),
    index("stores_org_idx").on(t.organizationId),
    index("stores_business_type_idx").on(t.businessType),
  ],
);

export const storeSettings = pgTable("store_settings", {
  storeId: text("store_id")
    .primaryKey()
    .references(() => stores.id, { onDelete: "cascade" }),
  contact: jsonb("contact").$type<Record<string, unknown>>().default({}),
  branding: jsonb("branding").$type<Record<string, unknown>>().default({}),
  checkout: jsonb("checkout").$type<Record<string, unknown>>().default({}),
  payments: jsonb("payments").$type<Record<string, unknown>>().default({}),
  taxes: jsonb("taxes").$type<Record<string, unknown>>().default({}),
  notifications: jsonb("notifications").$type<Record<string, unknown>>().default({}),
  seo: jsonb("seo").$type<Record<string, unknown>>().default({}),
  updatedAt: updatedAt(),
});

export const storeDomains = pgTable(
  "store_domains",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    verificationStatus: text("verification_status").notNull().default("pending"),
    verificationToken: text("verification_token"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("store_domains_domain_idx").on(t.domain), index("store_domains_store_idx").on(t.storeId)],
);

export const storeThemes = pgTable(
  "store_themes",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    themeKey: text("theme_key").notNull().default("minimal"),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("store_themes_store_idx").on(t.storeId)],
);

export const storePages = pgTable(
  "store_pages",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    isHomepage: boolean("is_homepage").notNull().default(false),
    sections: jsonb("sections").$type<PageSection[]>().notNull().default([]),
    seo: jsonb("seo").$type<Record<string, unknown>>().default({}),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("store_pages_slug_idx").on(t.storeId, t.slug),
    index("store_pages_store_idx").on(t.storeId),
  ],
);

export const storeNavigation = pgTable(
  "store_navigation",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    location: text("location").notNull().default("header"),
    label: text("label").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("store_navigation_store_idx").on(t.storeId)],
);

export type PageSection = {
  id: string;
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const productCategories = pgTable(
  "product_categories",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    parentId: text("parent_id"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("product_categories_slug_idx").on(t.storeId, t.slug),
    index("product_categories_store_idx").on(t.storeId),
  ],
);

export const attributeDefinitions = pgTable(
  "attribute_definitions",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    values: text("values").array().notNull().default(sql`'{}'`),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("attribute_definitions_name_idx").on(t.storeId, t.name)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull().default("product"),
    status: text("status").notNull().default("draft"),
    description: text("description"),
    shortDescription: text("short_description"),
    sku: text("sku"),
    price: integer("price").notNull().default(0),
    compareAtPrice: integer("compare_at_price"),
    cost: integer("cost"),
    categoryId: text("category_id").references(() => productCategories.id, {
      onDelete: "set null",
    }),
    tags: text("tags").array().notNull().default(sql`'{}'`),
    weightGrams: integer("weight_grams"),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    taxable: boolean("taxable").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    trackInventory: boolean("track_inventory").notNull().default(true),
    durationMinutes: integer("duration_minutes"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.storeId, t.slug),
    index("products_store_idx").on(t.storeId),
    index("products_store_status_idx").on(t.storeId, t.status),
    index("products_store_category_idx").on(t.storeId, t.categoryId),
    index("products_sku_idx").on(t.storeId, t.sku),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku"),
    price: integer("price").notNull().default(0),
    compareAtPrice: integer("compare_at_price"),
    options: jsonb("options")
      .$type<{ name: string; value: string }[]>()
      .notNull()
      .default([]),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId),
    index("product_variants_store_idx").on(t.storeId),
    uniqueIndex("product_variants_sku_idx").on(t.storeId, t.sku),
  ],
);

export const serviceStaff = pgTable(
  "service_staff",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("service_staff_unique_idx").on(t.productId, t.employeeId)],
);

// ---------------------------------------------------------------------------
// Inventory (ledger based)
// ---------------------------------------------------------------------------

export const inventory = pgTable(
  "inventory",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("inventory_store_idx").on(t.storeId),
    uniqueIndex("inventory_variant_idx").on(t.variantId),
    index("inventory_product_idx").on(t.productId),
  ],
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    inventoryId: text("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    reason: text("reason").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    note: text("note"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("inventory_transactions_store_idx").on(t.storeId),
    index("inventory_transactions_inventory_idx").on(t.inventoryId),
    index("inventory_transactions_created_at_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const customers = pgTable(
  "customers",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    email: text("email"),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    phone: text("phone"),
    tags: text("tags").array().notNull().default(sql`'{}'`),
    notes: text("notes"),
    totalSpent: integer("total_spent").notNull().default(0),
    ordersCount: integer("orders_count").notNull().default(0),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("customers_store_idx").on(t.storeId),
    index("customers_store_email_idx").on(t.storeId, t.email),
    index("customers_store_created_at_idx").on(t.storeId, t.createdAt),
  ],
);

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("PH"),
    phone: text("phone"),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("customer_addresses_customer_idx").on(t.customerId)],
);

export const carts = pgTable(
  "carts",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    sessionKey: text("session_key").notNull(),
    status: text("status").notNull().default("active"),
    discountCode: text("discount_code"),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("carts_session_idx").on(t.storeId, t.sessionKey),
    index("carts_store_idx").on(t.storeId),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: id(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("cart_items_cart_idx").on(t.cartId)],
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("wishlists_unique_idx").on(t.storeId, t.customerId, t.productId)],
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: text("email"),
    phone: text("phone"),
    status: text("status").notNull().default("pending"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    fulfillmentType: text("fulfillment_type").notNull().default("delivery"),
    subtotal: integer("subtotal").notNull().default(0),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    taxTotal: integer("tax_total").notNull().default(0),
    total: integer("total").notNull().default(0),
    currency: text("currency").notNull().default("PHP"),
    discountCode: text("discount_code"),
    notes: text("notes"),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>(),
    billingAddress: jsonb("billing_address").$type<Record<string, unknown>>(),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.storeId, t.number),
    index("orders_store_created_at_idx").on(t.storeId, t.createdAt),
    index("orders_store_status_idx").on(t.storeId, t.status),
    index("orders_store_payment_status_idx").on(t.storeId, t.paymentStatus),
    index("orders_customer_idx").on(t.storeId, t.customerId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    variantTitle: text("variant_title"),
    sku: text("sku"),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull().default(0),
    total: integer("total").notNull().default(0),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_store_idx").on(t.storeId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    body: text("body"),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("pending"),
    amount: integer("amount").notNull().default(0),
    currency: text("currency").notNull().default("PHP"),
    externalId: text("external_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("payments_store_idx").on(t.storeId),
    index("payments_order_idx").on(t.orderId),
    index("payments_external_idx").on(t.provider, t.externalId),
  ],
);

// ---------------------------------------------------------------------------
// Discounts & marketing
// ---------------------------------------------------------------------------

export const discounts = pgTable(
  "discounts",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    type: text("type").notNull().default("percentage"),
    value: integer("value").notNull().default(0),
    appliesTo: text("applies_to").notNull().default("all"),
    productIds: text("product_ids").array().notNull().default(sql`'{}'`),
    categoryIds: text("category_ids").array().notNull().default(sql`'{}'`),
    minSubtotal: integer("min_subtotal").default(0),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("discounts_code_idx").on(t.storeId, t.code),
    index("discounts_store_idx").on(t.storeId),
  ],
);

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export const employees = pgTable(
  "employees",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    role: text("role").notNull().default("staff"),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index("employees_store_idx").on(t.storeId), uniqueIndex("employees_email_idx").on(t.storeId, t.email)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    employeeId: text("employee_id").references(() => employees.id, { onDelete: "set null" }),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("scheduled"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("appointments_store_starts_at_idx").on(t.storeId, t.startsAt),
    index("appointments_store_status_idx").on(t.storeId, t.status),
  ],
);

// ---------------------------------------------------------------------------
// Fulfillment
// ---------------------------------------------------------------------------

export const shippingMethods = pgTable(
  "shipping_methods",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: integer("price").notNull().default(0),
    estimatedDays: text("estimated_days"),
    active: boolean("active").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("shipping_methods_store_idx").on(t.storeId)],
);

export const deliveryZones = pgTable(
  "delivery_zones",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    regions: text("regions").array().notNull().default(sql`'{}'`),
    fee: integer("fee").notNull().default(0),
    minOrder: integer("min_order").default(0),
    estimatedDays: text("estimated_days"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("delivery_zones_store_idx").on(t.storeId)],
);

// ---------------------------------------------------------------------------
// SaaS: plans, subscriptions, notifications, audit, errors
// ---------------------------------------------------------------------------

export const plans = pgTable("plans", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull().default(0),
  entitlements: jsonb("entitlements").$type<Record<string, unknown>>().notNull().default({}),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planCode: text("plan_code")
      .notNull()
      .references(() => plans.code),
    status: text("status").notNull().default("active"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("subscriptions_org_idx").on(t.organizationId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    storeId: text("store_id").references(() => stores.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    data: jsonb("data").$type<Record<string, unknown>>().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt), index("notifications_store_idx").on(t.storeId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    storeId: text("store_id").references(() => stores.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>().default({}),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_store_idx").on(t.storeId, t.createdAt), index("audit_logs_org_idx").on(t.organizationId)],
);

export const errorEvents = pgTable(
  "error_events",
  {
    id: id(),
    requestId: text("request_id"),
    storeId: text("store_id").references(() => stores.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    route: text("route"),
    action: text("action"),
    message: text("message").notNull(),
    stack: text("stack"),
    severity: text("severity").notNull().default("error"),
    environment: text("environment").default(process.env.NODE_ENV),
    context: jsonb("context").$type<Record<string, unknown>>().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("error_events_created_at_idx").on(t.createdAt), index("error_events_store_idx").on(t.storeId)],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  stores: many(stores),
  subscriptions: many(subscriptions),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  organization: one(organizations, { fields: [stores.organizationId], references: [organizations.id] }),
  settings: one(storeSettings),
  themes: many(storeThemes),
  pages: many(storePages),
  products: many(products),
  orders: many(orders),
  customers: many(customers),
}));

export const storeSettingsRelations = relations(storeSettings, ({ one }) => ({
  store: one(stores, { fields: [storeSettings.storeId], references: [stores.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
  images: many(productImages),
  variants: many(productVariants),
  inventory: one(inventory),
}));

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  store: one(stores, { fields: [productCategories.storeId], references: [stores.id] }),
  products: many(products),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  inventory: one(inventory),
  cartItems: many(cartItems),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  store: one(stores, { fields: [inventory.storeId], references: [stores.id] }),
  product: one(products, { fields: [inventory.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [inventory.variantId], references: [productVariants.id] }),
  transactions: many(inventoryTransactions),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  inventory: one(inventory, { fields: [inventoryTransactions.inventoryId], references: [inventory.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  store: one(stores, { fields: [customers.storeId], references: [stores.id] }),
  addresses: many(customerAddresses),
  orders: many(orders),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(customers, { fields: [customerAddresses.customerId], references: [customers.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  store: one(stores, { fields: [carts.storeId], references: [stores.id] }),
  customer: one(customers, { fields: [carts.customerId], references: [customers.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  store: one(stores, { fields: [employees.storeId], references: [stores.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  store: one(stores, { fields: [appointments.storeId], references: [stores.id] }),
  customer: one(customers, { fields: [appointments.customerId], references: [customers.id] }),
  employee: one(employees, { fields: [appointments.employeeId], references: [employees.id] }),
  product: one(products, { fields: [appointments.productId], references: [products.id] }),
}));

export const storePagesRelations = relations(storePages, ({ one }) => ({
  store: one(stores, { fields: [storePages.storeId], references: [stores.id] }),
}));

export const storeThemesRelations = relations(storeThemes, ({ one }) => ({
  store: one(stores, { fields: [storeThemes.storeId], references: [stores.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, { fields: [subscriptions.organizationId], references: [organizations.id] }),
  plan: one(plans, { fields: [subscriptions.planCode], references: [plans.code] }),
}));
