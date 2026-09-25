import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getBusinessType } from "@/lib/business-types";
import { listAppointments } from "@/lib/services/appointments";
import { listCustomers } from "@/lib/services/customers";
import { listEmployees } from "@/lib/services/employees";
import { listProductOptions } from "@/lib/services/products";
import { requireStoreContext } from "@/lib/tenancy/context";
import { AppointmentsClient } from "./appointments-client";

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { storeSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireStoreContext(storeSlug);

  if (!getBusinessType(ctx.store.businessType).modules.appointments) {
    redirect(`/admin/${storeSlug}`);
  }

  const [appointments, customers, employees, products] = await Promise.all([
    listAppointments(ctx, sp.status ? { status: sp.status } : {}),
    listCustomers(ctx),
    listEmployees(ctx),
    listProductOptions(ctx),
  ]);

  return (
    <div>
      <PageHeader title="Appointments" description="Bookings, staff assignments and time slots" />
      <AppointmentsClient
        storeSlug={storeSlug}
        canManage={ctx.can("orders.update")}
        rows={appointments}
        customers={customers.rows.map((row) => ({
          id: row.id,
          name: `${row.firstName} ${row.lastName}`.trim() || row.email || "Unnamed",
        }))}
        employees={employees.map((row) => ({ id: row.id, name: row.name }))}
        products={products.map((row) => ({ id: row.id, name: row.name }))}
      />
    </div>
  );
}
