import { eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { roleCan } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { organizationMembers, organizations, orders, products, stores, users } from "@/lib/db/schema";
import { getProduct, listProducts } from "@/lib/services/products";
import { getOrder } from "@/lib/services/orders";
import { getStoreContext, type StoreContext } from "@/lib/tenancy/context";

const TEST_EMAIL = "isolation-test@jorify.test";

type Loaded = {
  storeA: typeof stores.$inferSelect;
  orgA: typeof organizations.$inferSelect;
  storeB: typeof stores.$inferSelect;
  member: typeof users.$inferSelect;
  productB: { id: string } | null;
  orderB: string | null;
};

function getProductRow(storeId: string) {
  return db.query.products.findFirst({ where: eq(products.storeId, storeId) });
}

function ctxFor(store: typeof stores.$inferSelect, organization: typeof organizations.$inferSelect): StoreContext {
  const role = "owner" as const;
  return {
    user: { id: "ctx-user", email: "ctx@example.com", name: "Ctx" },
    organization,
    store,
    role,
    planCode: "professional",
    entitlements: {},
    can: (permission) => roleCan(role, permission),
    entitlement: () => 1000,
    assert: (permission) => {
      if (!roleCan(role, permission)) throw new Error(`Missing permission: ${permission}`);
    },
  };
}

const describeDb = describe.skipIf(!process.env.DATABASE_URL);

describeDb("tenant isolation (live database)", () => {
  let state!: Loaded;

  beforeAll(async () => {
    const rows = await db
      .select({ store: stores, organization: organizations })
      .from(stores)
      .innerJoin(organizations, eq(organizations.id, stores.organizationId))
      .where(isNull(stores.deletedAt))
      .limit(2);

    const [a, b] = rows;
    if (!a || !b) throw new Error("Seed at least two stores before running this test");

    const existing = await db.query.users.findFirst({ where: eq(users.email, TEST_EMAIL) });
    const [member] = existing
      ? [existing]
      : await db
          .insert(users)
          .values({ email: TEST_EMAIL, name: "Isolation Test", passwordHash: "not-a-real-hash" })
          .returning();

    await db
      .insert(organizationMembers)
      .values({ organizationId: a.organization.id, userId: member.id, role: "viewer" })
      .onConflictDoNothing();

    const productB = (await getProductRow(b.store.id)) ?? null;
    const orderRow = await db.query.orders.findFirst({ where: eq(orders.storeId, b.store.id) });

    state = {
      storeA: a.store,
      orgA: a.organization,
      storeB: b.store,
      member,
      productB,
      orderB: orderRow?.id ?? null,
    };
  });

  afterAll(async () => {
    if (!state?.member) return;
    await db.delete(organizationMembers).where(eq(organizationMembers.userId, state.member.id));
    await db.delete(users).where(eq(users.id, state.member.id));
  });

  it("returns a context for a store the user is a member of", async () => {
    const ctx = await getStoreContext(state.storeA.slug, {
      id: state.member.id,
      email: state.member.email,
      name: state.member.name,
    });
    expect(ctx).not.toBeNull();
    expect(ctx?.store.id).toBe(state.storeA.id);
  });

  it("returns null when the user is not a member of the store's organization", async () => {
    const ctx = await getStoreContext(state.storeB.slug, {
      id: state.member.id,
      email: state.member.email,
      name: state.member.name,
    });
    expect(ctx).toBeNull();
  });

  it("lists only records belonging to the caller's store", async () => {
    const ctx = ctxFor(state.storeA, state.orgA);
    const result = await listProducts(ctx, {});
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((row) => row.product.storeId === state.storeA.id)).toBe(true);
    const productB = state.productB;
    if (productB) {
      expect(result.rows.some((row) => row.product.id === productB.id)).toBe(false);
    }
  });

  it("cannot read another tenant's product by id", async () => {
    const ctx = ctxFor(state.storeA, state.orgA);
    const productB = state.productB;
    expect(productB).not.toBeNull();
    if (!productB) return;
    expect(await getProduct(ctx, productB.id)).toBeNull();
  });

  it("cannot read another tenant's order by id", async () => {
    const ctx = ctxFor(state.storeA, state.orgA);
    if (!state.orderB) return;
    expect(await getOrder(ctx, state.orderB)).toBeNull();
  });
});
