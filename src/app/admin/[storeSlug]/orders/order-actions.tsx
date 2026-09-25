"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { markPaidAction, updateOrderStatusAction } from "@/lib/actions/orders";
import { FormError, useSavedToast, type ActionState } from "../_components/form";

type Props = {
  storeSlug: string;
  orderId: string;
  statuses: string[];
  currentStatus: string;
  paymentStatus: string;
  canUpdate: boolean;
};

export function OrderActions({ storeSlug, orderId, statuses, currentStatus, paymentStatus, canUpdate }: Props) {
  const [state, statusAction, pending] = useActionState<ActionState, FormData>(updateOrderStatusAction, null);
  const [paidState, paidAction, paidPending] = useActionState<ActionState, FormData>(markPaidAction, null);

  useSavedToast(state);
  useSavedToast(paidState);

  if (!canUpdate) {
    return <p className="text-sm text-zinc-500">You have view-only access to orders.</p>;
  }

  const options = statuses.includes(currentStatus) ? statuses : [currentStatus, ...statuses];

  return (
    <div className="space-y-4">
      <form action={statusAction} className="space-y-3">
        <input type="hidden" name="storeSlug" value={storeSlug} />
        <input type="hidden" name="orderId" value={orderId} />
        <FormError state={state} />
        <div>
          <Label className="text-xs">Status</Label>
          <Select name="status" defaultValue={currentStatus} className="mt-1 capitalize">
            {options.map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs">Note (optional)</Label>
          <Input name="note" maxLength={300} placeholder="Added to the timeline" className="mt-1" />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Update status"}
        </Button>
      </form>

      {paymentStatus !== "paid" ? (
        <form
          action={paidAction}
          className="space-y-2 border-t border-zinc-100 pt-4"
        >
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="orderId" value={orderId} />
          <FormError state={paidState} />
          <p className="text-xs text-zinc-500">
            Record an offline payment (cash, GCash, bank transfer). Online payment processing is not configured.
          </p>
          <Button type="submit" variant="primary" size="sm" disabled={paidPending}>
            {paidPending ? "Saving…" : "Mark paid"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
