import { and, eq, isNull } from "drizzle-orm";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleCan, type Permission, type Role } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { organizations, organizationMembers, plans, stores, subscriptions } from "@/lib/db/schema";
import { planEntitlement, type EntitlementKey } from "@/lib/modules/entitlements";

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this resource") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type SessionUser = { id: string; email: string; name: string };

export type StoreContext = {
  user: SessionUser;
  organization: typeof organizations.$inferSelect;
  store: typeof stores.$inferSelect;
  role: Role;
  planCode: string;
  entitlements: Record<string, unknown>;
  can: (permission: Permission) => boolean;
  entitlement: (key: EntitlementKey) => number | boolean;
  assert: (permission: Permission) => void;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? "", name: user.name ?? "" };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export const listUserOrganizations = cache(async (userId: string) => {
  return db
    .select({ organization: organizations, role: organizationMembers.role })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), isNull(organizations.deletedAt)));
});

export const getStoreContext = cache(
  async (storeSlug: string, user: SessionUser | null): Promise<StoreContext | null> => {
    if (!user) return null;

    const rows = await db
      .select({ store: stores, organization: organizations, role: organizationMembers.role })
      .from(stores)
      .innerJoin(organizations, eq(organizations.id, stores.organizationId))
      .innerJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
      .where(
        and(
          eq(stores.slug, storeSlug),
          isNull(stores.deletedAt),
          isNull(organizations.deletedAt),
          eq(organizationMembers.userId, user.id),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, row.organization.id),
      with: { plan: true },
    });
    const plan = subscription?.plan ?? (await db.query.plans.findFirst({ where: eq(plans.code, "free") }));
    const entitlements = (plan?.entitlements ?? {}) as Record<string, unknown>;
    const role = (row.role as Role) ?? "viewer";

    return {
      user,
      organization: row.organization,
      store: row.store,
      role,
      planCode: plan?.code ?? "free",
      entitlements,
      can: (permission) => roleCan(role, permission),
      entitlement: (key) => planEntitlement(entitlements, key),
      assert: (permission) => {
        if (!roleCan(role, permission)) throw new ForbiddenError(`Missing permission: ${permission}`);
      },
    };
  },
);

export async function requireStoreContext(storeSlug: string): Promise<StoreContext> {
  const user = await requireUser();
  const ctx = await getStoreContext(storeSlug, user);
  if (!ctx) redirect("/stores");
  return ctx;
}

export function assertPermission(ctx: StoreContext, permission: Permission) {
  if (!ctx.can(permission)) throw new ForbiddenError(`Missing permission: ${permission}`);
}
