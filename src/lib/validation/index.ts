import { z } from "zod";

export const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");

export const APPOINTMENT_STATUSES = ["scheduled", "confirmed", "completed", "cancelled", "no_show"] as const;

export const moneySchema = z.number().int().min(0).max(999_999_999);

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
  organizationName: z.string().min(2).max(80),
  storeName: z.string().min(2).max(80),
  storeSlug: slugSchema,
  businessType: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const productInputSchema = z.object({
  name: z.string().min(1).max(160),
  slug: slugSchema,
  type: z.enum(["product", "service"]),
  status: z.enum(["draft", "active", "archived"]),
  description: z.string().max(5000).optional().or(z.literal("")),
  shortDescription: z.string().max(300).optional().or(z.literal("")),
  sku: z.string().max(64).optional().or(z.literal("")),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable().optional(),
  cost: moneySchema.nullable().optional(),
  categoryId: z.string().nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  weightGrams: z.number().int().min(0).nullable().optional(),
  featured: z.boolean().default(false),
  trackInventory: z.boolean().default(true),
  requiresShipping: z.boolean().default(true),
  taxable: z.boolean().default(true),
  durationMinutes: z.number().int().min(5).max(1440).nullable().optional(),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(160).optional().or(z.literal("")),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(120),
        sku: z.string().max(64).optional().or(z.literal("")),
        price: moneySchema,
        compareAtPrice: moneySchema.nullable().optional(),
        options: z.array(z.object({ name: z.string().min(1).max(40), value: z.string().min(1).max(60) })).default([]),
        quantity: z.number().int().min(0).default(0),
      }),
    )
    .max(100)
    .default([]),
  images: z
    .array(z.object({ url: z.string().url(), alt: z.string().max(160).optional().or(z.literal("")) }))
    .max(10)
    .default([]),
});

export const categoryInputSchema = z.object({
  name: z.string().min(1).max(80),
  slug: slugSchema,
  description: z.string().max(500).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  parentId: z.string().nullable().optional(),
  position: z.number().int().min(0).default(0),
});

export const customerInputSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60).default(""),
  email: z.string().email().toLowerCase().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  tags: z.array(z.string().max(40)).max(20).default([]),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export const discountInputSchema = z.object({
  name: z.string().min(1).max(80),
  code: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Codes may contain letters, numbers, dashes and underscores")
    .transform((v) => v.toUpperCase()),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().int().min(0),
  appliesTo: z.enum(["all", "products", "categories"]).default("all"),
  productIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  minSubtotal: z.number().int().min(0).default(0),
  usageLimit: z.number().int().min(1).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  status: z.enum(["active", "scheduled", "paused"]).default("active"),
});

export const employeeInputSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  phone: z.string().max(30).optional().or(z.literal("")),
  role: z.enum(["admin", "manager", "staff", "viewer"]),
});

export const inventoryAdjustSchema = z.object({
  inventoryId: z.string().min(1),
  delta: z.number().int().min(-100_000).max(100_000),
  reason: z.enum(["purchase", "order", "damaged", "adjustment", "transfer", "return", "received"]),
  note: z.string().max(300).optional().or(z.literal("")),
});

export const orderStatusSchema = z.object({
  status: z.string().min(1).max(40),
  note: z.string().max(300).optional().or(z.literal("")),
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1).max(40),
  enabled: z.boolean().default(true),
  settings: z.record(z.string(), z.unknown()).default({}),
});

export const pageSchema = z.object({
  title: z.string().min(1).max(80),
  slug: slugSchema,
  published: z.boolean().default(true),
  seo: z.object({ title: z.string().max(70).optional(), description: z.string().max(160).optional() }).default({}),
  sections: z.array(sectionSchema).max(50),
});

export const themeSettingsSchema = z.object({
  colors: z
    .object({
      primary: z.string().default("#111111"),
      accent: z.string().default("#f0c14b"),
      background: z.string().default("#ffffff"),
      text: z.string().default("#111111"),
      muted: z.string().default("#6b7280"),
      border: z.string().default("#e5e7eb"),
    })
    .prefault({}),
  typography: z
    .object({
      headingFont: z.enum(["sans", "serif", "display"]).default("sans"),
      bodyFont: z.enum(["sans", "serif"]).default("sans"),
      scale: z.enum(["compact", "comfortable", "large"]).default("comfortable"),
    })
    .prefault({}),
  radius: z.enum(["none", "sm", "md", "lg"]).default("md"),
  buttonStyle: z.enum(["solid", "outline", "pill"]).default("solid"),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type DiscountInput = z.infer<typeof discountInputSchema>;
export type EmployeeInput = z.infer<typeof employeeInputSchema>;
export type PageInput = z.infer<typeof pageSchema>;
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
