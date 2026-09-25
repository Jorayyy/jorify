"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { captureError } from "@/lib/logging";
import { createEmployee } from "@/lib/services/employees";
import { ForbiddenError, requireStoreContext } from "@/lib/tenancy/context";
import { employeeInputSchema } from "@/lib/validation";

type State = { error?: string; message?: string } | null;

export async function addEmployeeAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);

  const parsed = employeeInputSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    role: String(formData.get("role") ?? "staff"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields" };

  try {
    const result = await createEmployee(ctx, parsed.data);
    revalidatePath(`/admin/${storeSlug}/employees`);
    if (result.linkedUser) {
      return { message: `${parsed.data.name} linked to their existing account as ${parsed.data.role}` };
    }
    return {
      message: `${parsed.data.name} added as invited — invite emails are not sent yet, they get access after signing up with this email`,
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "addEmployee", context: { storeId: ctx.store.id } });
    return { error: "Could not add the employee. Their email may already be on this store." };
  }
}
