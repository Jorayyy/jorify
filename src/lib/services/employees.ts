import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, organizationMembers, users } from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";
import type { EmployeeInput } from "@/lib/validation";

export async function listEmployees(ctx: StoreContext) {
  return db
    .select()
    .from(employees)
    .where(and(eq(employees.storeId, ctx.store.id), isNull(employees.deletedAt)))
    .orderBy(employees.name);
}

export type EmployeeResult = { employee: typeof employees.$inferSelect; linkedUser: boolean };

export async function createEmployee(ctx: StoreContext, input: EmployeeInput): Promise<EmployeeResult> {
  ctx.assert("employees.manage");
  const existingUser = await db.query.users.findFirst({
    where: and(eq(users.email, input.email), isNull(users.deletedAt)),
  });

  if (existingUser) {
    await db
      .insert(organizationMembers)
      .values({ organizationId: ctx.organization.id, userId: existingUser.id, role: input.role })
      .onConflictDoUpdate({
        target: [organizationMembers.organizationId, organizationMembers.userId],
        set: { role: input.role },
      });
    const [employee] = await db
      .insert(employees)
      .values({
        storeId: ctx.store.id,
        userId: existingUser.id,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
        status: "active",
      })
      .returning();
    return { employee, linkedUser: true };
  }

  const [employee] = await db
    .insert(employees)
    .values({
      storeId: ctx.store.id,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      role: input.role,
      status: "invited",
    })
    .returning();
  return { employee, linkedUser: false };
}

export async function listMembers(ctx: StoreContext) {
  return db
    .select({
      id: organizationMembers.id,
      role: organizationMembers.role,
      createdAt: organizationMembers.createdAt,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, ctx.organization.id))
    .orderBy(asc(organizationMembers.createdAt));
}
