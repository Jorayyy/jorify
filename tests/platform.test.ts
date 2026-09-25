import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getPlatformOverview, listOwnedStores, salesByStore } from "@/lib/services/platform";

const describeDb = describe.skipIf(!process.env.DATABASE_URL);

describeDb("platform overview (live database)", () => {
  it("aggregates sales across the caller's stores only", async () => {
    const owner = await db.query.users.findFirst({ where: eq(users.email, "demo@jorify.test") });
    expect(owner).toBeTruthy();
    if (!owner) return;

    const owned = await listOwnedStores(owner.id);
    expect(owned.length).toBeGreaterThanOrEqual(5);

    const from = new Date(Date.now() - 90 * 86_400_000);
    const overview = await getPlatformOverview(owner.id, "90d");
    expect(overview.stores.length).toBe(owned.length);
    expect(overview.orders).toBeGreaterThan(0);
    expect(overview.revenue).toBeGreaterThan(0);
    expect(overview.revenue).toBe(overview.byStore.reduce((sum, row) => sum + row.revenue, 0));
    expect(overview.recentOrders.length).toBeGreaterThan(0);

    const byStore = await salesByStore(owned.map((store) => store.id), from, new Date());
    expect(byStore.length).toBeGreaterThan(0);

    const outsider = await listOwnedStores("user-does-not-exist");
    expect(outsider).toEqual([]);
  });
});
