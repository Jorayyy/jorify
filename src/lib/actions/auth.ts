"use server";

import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { getBusinessType } from "@/lib/business-types";
import { db } from "@/lib/db";
import {
  attributeDefinitions,
  organizationMembers,
  organizations,
  plans,
  storeDomains,
  storeNavigation,
  storePages,
  storeSettings,
  storeThemes,
  stores,
  subscriptions,
  users,
} from "@/lib/db/schema";
import { captureError, logger } from "@/lib/logging";
import { planEntitlement } from "@/lib/modules/entitlements";
import { registerSchema, slugSchema } from "@/lib/validation";

export type RegisterResult = { ok: true; storeSlug: string } | { ok: false; error: string };

function defaultSections() {
  return [
    { id: crypto.randomUUID(), type: "announcement", enabled: true, settings: { text: "Welcome to our store" } },
    {
      id: crypto.randomUUID(),
      type: "hero",
      enabled: true,
      settings: {
        heading: "Shop the latest",
        subheading: "",
        buttonLabel: "Browse products",
        buttonHref: "/products",
      },
    },
    { id: crypto.randomUUID(), type: "featured_products", enabled: true, settings: { title: "Featured", limit: 8 } },
    { id: crypto.randomUUID(), type: "categories", enabled: true, settings: { title: "Shop by category" } },
    {
      id: crypto.randomUUID(),
      type: "about",
      enabled: true,
      settings: { title: "About us", body: "Tell customers what makes this business special." },
    },
    {
      id: crypto.randomUUID(),
      type: "faq",
      enabled: true,
      settings: { title: "FAQ", items: [{ q: "Do you offer delivery?", a: "Yes — enter your address at checkout." }] },
    },
    { id: crypto.randomUUID(), type: "footer", enabled: true, settings: { text: `© ${new Date().getFullYear()}` } },
  ];
}

export async function registerBusiness(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  try {
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, data.email) });
    if (existingUser) return { ok: false, error: "An account with this email already exists" };

    const existingStore = await db.query.stores.findFirst({ where: eq(stores.slug, data.storeSlug) });
    if (existingStore) return { ok: false, error: "That store URL is already taken" };

    const businessType = getBusinessType(data.businessType);
    const freePlan = await db.query.plans.findFirst({ where: eq(plans.code, "free") });

    const store = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email: data.email, name: data.name, passwordHash: hashPassword(data.password) })
        .returning();

      const [organization] = await tx
        .insert(organizations)
        .values({ name: data.organizationName, slug: `${data.storeSlug}-org` })
        .returning();

      await tx.insert(organizationMembers).values({
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
      });

      const [created] = await tx
        .insert(stores)
        .values({
          organizationId: organization.id,
          name: data.storeName,
          slug: data.storeSlug,
          businessType: businessType.key,
        })
        .returning();

      await tx.insert(storeSettings).values({ storeId: created.id });
      await tx.insert(storeDomains).values({
        storeId: created.id,
        domain: `${data.storeSlug}.jorify.app`,
        verificationStatus: "pending",
        isPrimary: true,
      });
      await tx.insert(storeThemes).values({
        storeId: created.id,
        name: businessType.defaultTheme,
        themeKey: businessType.defaultTheme,
        isPublished: true,
      });
      await tx.insert(storePages).values({
        storeId: created.id,
        title: "Home",
        slug: "home",
        isHomepage: true,
        sections: defaultSections(),
        published: true,
      });
      await tx.insert(storeNavigation).values([
        { storeId: created.id, location: "header", label: "Products", url: "/products", position: 0 },
        { storeId: created.id, location: "header", label: "About", url: "/about", position: 1 },
        { storeId: created.id, location: "header", label: "Contact", url: "/contact", position: 2 },
      ]);
      await tx.insert(subscriptions).values({
        organizationId: organization.id,
        planCode: freePlan?.code ?? "free",
        status: "active",
      });

      await Promise.all(
        businessType.defaultAttributes.map((attribute, index) =>
          tx.insert(attributeDefinitions).values({
            storeId: created.id,
            name: attribute.name,
            values: attribute.values,
            position: index,
          }),
        ),
      );

      return created;
    });

    logger.info("business registered", { storeSlug: store.slug, businessType: businessType.key });
    return { ok: true, storeSlug: store.slug };
  } catch (error) {
    await captureError({ error, action: "registerBusiness", context: { email: data.email } });
    return { ok: false, error: "Could not create the workspace. Try again." };
  }
}

export async function storeExists(slug: string) {
  const store = await db.query.stores.findFirst({
    where: and(eq(stores.slug, slug), isNull(stores.deletedAt)),
    columns: { id: true },
  });
  return Boolean(store);
}

export async function createAdditionalStore(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string } | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Sign in first" };

  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const businessType = String(formData.get("businessType") ?? "retail");
  if (name.length < 2 || !slugSchema.safeParse(slug).success) {
    return { error: "Provide a valid name and store URL" };
  }

  const membership = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId)),
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) return { error: "Not allowed" };

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
    with: { plan: true },
  });
  const entitlements = (subscription?.plan?.entitlements ?? {}) as Record<string, unknown>;
  const limit = Number(planEntitlement(entitlements, "stores.limit") || 1);
  const existingCount = await db.select({ count: sql<number>`count(*)::int` }).from(stores)
    .where(and(eq(stores.organizationId, organizationId), isNull(stores.deletedAt)));
  if ((existingCount[0]?.count ?? 0) >= limit) return { error: "Your plan's store limit has been reached" };

  if (await storeExists(slug)) return { error: "That store URL is already taken" };

  try {
    const type = getBusinessType(businessType);
    const created = await db.transaction(async (tx) => {
      const [store] = await tx
        .insert(stores)
        .values({ organizationId, name, slug, businessType: type.key })
        .returning();
      await tx.insert(storeSettings).values({ storeId: store.id });
      await tx.insert(storeThemes).values({
        storeId: store.id,
        name: type.defaultTheme,
        themeKey: type.defaultTheme,
        isPublished: true,
      });
      await tx.insert(storePages).values({
        storeId: store.id,
        title: "Home",
        slug: "home",
        isHomepage: true,
        sections: [
          { id: crypto.randomUUID(), type: "hero", enabled: true, settings: { heading: name, buttonLabel: "Browse products", buttonHref: "/products" } },
          { id: crypto.randomUUID(), type: "featured_products", enabled: true, settings: { title: "Featured", limit: 8 } },
          { id: crypto.randomUUID(), type: "footer", enabled: true, settings: { text: `© ${new Date().getFullYear()} ${name}` } },
        ],
        published: true,
      });
      await tx.insert(storeDomains).values({ storeId: store.id, domain: `${slug}.jorify.app`, isPrimary: true });
      return store;
    });
    redirect(`/admin/${created.slug}`);
  } catch (error) {
    await captureError({ error, action: "createAdditionalStore", context: { organizationId, slug } });
    return { error: "Could not create the store" };
  }
}


export async function createStoreFormAction(formData: FormData) {
  const result = await createAdditionalStore(null, formData);
  if (result?.error) redirect(`/stores?error=${encodeURIComponent(result.error)}`);
}
