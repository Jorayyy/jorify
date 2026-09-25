"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { createAppointmentAction, updateAppointmentStatusAction } from "@/lib/actions/orders";
import { APPOINTMENT_STATUSES } from "@/lib/validation";
import { FormError, useCloseOnSuccess, useSavedToast, type ActionState } from "../_components/form";

type Row = {
  appointment: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    notes: string | null;
  };
  customerName: string | null;
  customerEmail: string | null;
  employeeName: string | null;
  productName: string | null;
};

type Option = { id: string; name: string };

type Props = {
  storeSlug: string;
  canManage: boolean;
  rows: Row[];
  customers: Option[];
  employees: Option[];
  products: Option[];
};

const statusTone = (status: string) => {
  if (status === "cancelled" || status === "no_show") return "danger" as const;
  if (status === "completed") return "success" as const;
  if (status === "confirmed") return "info" as const;
  return "warning" as const;
};

const formatSlot = (value: Date) =>
  new Date(value).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function StatusForm({ storeSlug, appointmentId, currentStatus, canManage }: {
  storeSlug: string;
  appointmentId: string;
  currentStatus: string;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateAppointmentStatusAction, null);
  useSavedToast(state);

  if (!canManage) return <Badge tone={statusTone(currentStatus)}>{currentStatus.replace("_", " ")}</Badge>;

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <Select name="status" defaultValue={currentStatus} className="h-8 w-32 capitalize">
        {APPOINTMENT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.replace("_", " ")}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : "Update"}
      </Button>
      {state?.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}

export function AppointmentsClient({ storeSlug, canManage, rows, customers, employees, products }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAppointmentAction, null);

  useSavedToast(state);
  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage ? (
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New appointment
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              title="No appointments"
              description="Bookings for services, staff and time slots appear here."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <li key={row.appointment.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{row.appointment.title}</p>
                    <p className="text-xs text-zinc-500">
                      {formatSlot(row.appointment.startsAt)} → {formatSlot(row.appointment.endsAt)}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-600">
                      {row.customerName ?? "Walk-in"}
                      {row.employeeName ? ` · ${row.employeeName}` : ""}
                      {row.productName ? ` · ${row.productName}` : ""}
                    </p>
                    {row.appointment.notes ? (
                      <p className="mt-0.5 text-xs text-zinc-400">{row.appointment.notes}</p>
                    ) : null}
                  </div>
                  <StatusForm
                    storeSlug={storeSlug}
                    appointmentId={row.appointment.id}
                    currentStatus={row.appointment.status}
                    canManage={canManage}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New appointment"
        description="Pick a time slot, then attach a customer, staff member or service"
        className="max-w-lg"
      >
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />

          <div>
            <Label className="text-xs">Title</Label>
            <Input name="title" required placeholder="Haircut with Ana" className="mt-1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Starts</Label>
              <Input name="startsAt" type="datetime-local" required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Ends</Label>
              <Input name="endsAt" type="datetime-local" required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Customer</Label>
              <Select name="customerId" defaultValue="" className="mt-1">
                <option value="">None</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
              {customers.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-400">No customers yet — first 20 are listed.</p>
              ) : null}
            </div>
            <div>
              <Label className="text-xs">Staff</Label>
              <Select name="employeeId" defaultValue="" className="mt-1">
                <option value="">None</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Service / product</Label>
              <Select name="productId" defaultValue="" className="mt-1">
                <option value="">None</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select name="status" defaultValue="scheduled" className="mt-1">
                {APPOINTMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" rows={2} className="mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Creating…" : "Create appointment"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
