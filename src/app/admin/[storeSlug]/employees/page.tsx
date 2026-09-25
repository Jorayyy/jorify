import { PageHeader } from "@/components/page-header";
import { listEmployees, listMembers } from "@/lib/services/employees";
import { requireStoreContext } from "@/lib/tenancy/context";
import { EmployeesClient } from "./employees-client";

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);

  const [employees, members] = await Promise.all([listEmployees(ctx), listMembers(ctx)]);

  return (
    <div>
      <PageHeader title="Employees" description="Staff with access to this store" />
      <EmployeesClient
        storeSlug={storeSlug}
        canManage={ctx.can("employees.manage")}
        employees={employees}
        members={members}
      />
    </div>
  );
}
