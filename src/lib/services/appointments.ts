import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customers, employees, products } from "@/lib/db/schema";
import type { StoreContext } from "@/lib/tenancy/context";
import { APPOINTMENT_STATUSES } from "@/lib/validation";

export { APPOINTMENT_STATUSES };

export type AppointmentInput = {
  customerId?: string | null;
  employeeId?: string | null;
  productId?: string | null;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status?: string;
  notes?: string;
};

export async function listAppointments(
  ctx: StoreContext,
  filters: { from?: Date; to?: Date; status?: string } = {},
) {
  const conditions = [eq(appointments.storeId, ctx.store.id)];
  if (filters.from) conditions.push(gte(appointments.startsAt, filters.from));
  if (filters.to) conditions.push(lte(appointments.startsAt, filters.to));
  if (filters.status) conditions.push(eq(appointments.status, filters.status));

  return db
    .select({
      appointment: appointments,
      customerName: sql<string | null>`concat(${customers.firstName}, ' ', ${customers.lastName})`,
      customerEmail: customers.email,
      employeeName: employees.name,
      productName: products.name,
    })
    .from(appointments)
    .leftJoin(customers, eq(customers.id, appointments.customerId))
    .leftJoin(employees, eq(employees.id, appointments.employeeId))
    .leftJoin(products, eq(products.id, appointments.productId))
    .where(and(...conditions))
    .orderBy(asc(appointments.startsAt))
    .limit(200);
}

export async function createAppointment(ctx: StoreContext, input: AppointmentInput) {
  ctx.assert("orders.update");
  const [row] = await db
    .insert(appointments)
    .values({
      storeId: ctx.store.id,
      customerId: input.customerId || null,
      employeeId: input.employeeId || null,
      productId: input.productId || null,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status ?? "scheduled",
      notes: input.notes || null,
    })
    .returning();
  return row;
}

export async function updateAppointmentStatus(ctx: StoreContext, id: string, status: string, note?: string) {
  ctx.assert("orders.update");
  const [row] = await db
    .update(appointments)
    .set({
      status,
      notes: note ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(appointments.id, id), eq(appointments.storeId, ctx.store.id)))
    .returning();
  return row;
}
