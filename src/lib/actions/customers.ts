"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { captureError } from "@/lib/logging";
import { updateCustomer } from "@/lib/services/customers";
import { ForbiddenError, requireStoreContext } from "@/lib/tenancy/context";
import { customerInputSchema } from "@/lib/validation";

type State = { error?: string; message?: string } | null;

export async function updateCustomerAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const customerId = String(formData.get("customerId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);

  const parsed = customerInputSchema.safeParse({
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields" };

  try {
    await updateCustomer(ctx, customerId, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "updateCustomer", context: { storeId: ctx.store.id, customerId } });
    return { error: "Could not save the customer" };
  }

  revalidatePath(`/admin/${storeSlug}/customers`);
  revalidatePath(`/admin/${storeSlug}/customers/${customerId}`);
  return { message: "Customer saved" };
}
