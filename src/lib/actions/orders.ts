"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getBusinessType } from "@/lib/business-types";
import { captureError } from "@/lib/logging";
import { APPOINTMENT_STATUSES, createAppointment, updateAppointmentStatus } from "@/lib/services/appointments";
import { getOrder, markOrderPaid, updateOrderStatus } from "@/lib/services/orders";
import { ForbiddenError, requireStoreContext } from "@/lib/tenancy/context";
import { orderStatusSchema } from "@/lib/validation";

type State = { error?: string; message?: string } | null;

export async function updateOrderStatusAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);

  const parsed = orderStatusSchema.safeParse({
    status: String(formData.get("status") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields" };

  const allowed = getBusinessType(ctx.store.businessType).orderStatuses;
  if (!allowed.includes(parsed.data.status)) {
    return { error: "That status does not exist for this store type" };
  }

  try {
    await updateOrderStatus(ctx, orderId, parsed.data.status, parsed.data.note || undefined);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "updateOrderStatus", context: { storeId: ctx.store.id, orderId } });
    return { error: "Could not update the order" };
  }

  revalidatePath(`/admin/${storeSlug}/orders`);
  revalidatePath(`/admin/${storeSlug}/orders/${orderId}`);
  return { message: `Order marked ${parsed.data.status}` };
}

export async function markPaidAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);

  const order = await getOrder(ctx, orderId);
  if (!order) return { error: "Order not found" };
  if (order.paymentStatus === "paid") return { error: "This order is already paid" };

  try {
    await markOrderPaid(ctx, orderId, "manual");
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "markPaid", context: { storeId: ctx.store.id, orderId } });
    return { error: "Could not record the payment" };
  }

  revalidatePath(`/admin/${storeSlug}/orders`);
  revalidatePath(`/admin/${storeSlug}/orders/${orderId}`);
  return { message: "Payment recorded" };
}

export async function createAppointmentAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const ctx = await requireStoreContext(storeSlug);

  const type = getBusinessType(ctx.store.businessType);
  if (!type.modules.appointments) return { error: "Appointments are not enabled for this store type" };

  const title = String(formData.get("title") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Provide a valid start and end time" };
  }
  if (endsAt <= startsAt) return { error: "End time must be after the start time" };

  const status = String(formData.get("status") ?? "scheduled");
  if (!(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
    return { error: "That appointment status does not exist" };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  try {
    await createAppointment(ctx, {
      customerId: String(formData.get("customerId") ?? "").trim() || null,
      employeeId: String(formData.get("employeeId") ?? "").trim() || null,
      productId: productId || null,
      title: title || "Appointment",
      startsAt,
      endsAt,
      status,
      notes: String(formData.get("notes") ?? ""),
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "createAppointment", context: { storeId: ctx.store.id } });
    return { error: "Could not create the appointment" };
  }

  revalidatePath(`/admin/${storeSlug}/appointments`);
  return { message: "Appointment created" };
}

export async function updateAppointmentStatusAction(_prev: State, formData: FormData): Promise<State> {
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "").trim();
  const ctx = await requireStoreContext(storeSlug);

  const status = String(formData.get("status") ?? "");
  if (!(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
    return { error: "That appointment status does not exist" };
  }

  try {
    await updateAppointmentStatus(ctx, appointmentId, status, String(formData.get("note") ?? "") || undefined);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "You do not have permission to do that" };
    await captureError({ error, action: "updateAppointmentStatus", context: { storeId: ctx.store.id } });
    return { error: "Could not update the appointment" };
  }

  revalidatePath(`/admin/${storeSlug}/appointments`);
  return { message: `Appointment marked ${status.replace("_", " ")}` };
}
