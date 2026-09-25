"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { updateCustomerAction } from "@/lib/actions/customers";
import { FormError, useSavedToast, type ActionState } from "../../_components/form";

type Props = {
  storeSlug: string;
  customerId: string;
  initial: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    tags: string[];
    notes: string;
  };
};

export function CustomerForm({ storeSlug, customerId, initial }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateCustomerAction, null);
  useSavedToast(state);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="customerId" value={customerId} />
      <FormError state={state} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">First name</Label>
          <Input name="firstName" required defaultValue={initial.firstName} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Last name</Label>
          <Input name="lastName" defaultValue={initial.lastName} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input name="email" type="email" defaultValue={initial.email} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input name="phone" defaultValue={initial.phone} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Tags</Label>
          <Input name="tags" defaultValue={initial.tags.join(", ")} placeholder="vip, wholesale" className="mt-1" />
          <p className="mt-1 text-xs text-zinc-400">Comma separated</p>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Notes</Label>
          <Textarea name="notes" rows={3} defaultValue={initial.notes} className="mt-1" />
        </div>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
