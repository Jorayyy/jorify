"use client";

import { useActionState } from "react";
import { applyDiscountCode } from "@/lib/actions/storefront";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DiscountForm({ storeSlug, appliedCode }: { storeSlug: string; appliedCode: string | null }) {
  const [state, formAction, pending] = useActionState(applyDiscountCode, null);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <div className="flex gap-2">
        <Input
          name="code"
          defaultValue={appliedCode ?? ""}
          placeholder="Discount code"
          aria-label="Discount code"
          disabled={pending}
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" className="h-9" disabled={pending}>
          {pending ? "Working" : "Apply"}
        </Button>
        {appliedCode ? (
          <Button type="submit" name="clear" value="1" variant="ghost" size="sm" className="h-9" disabled={pending}>
            Remove
          </Button>
        ) : null}
      </div>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state && !state.error && state.code ? (
        <p className="text-sm text-emerald-600">{state.code} applied to your cart.</p>
      ) : null}
    </form>
  );
}
