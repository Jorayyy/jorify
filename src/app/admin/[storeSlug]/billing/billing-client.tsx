"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { switchPlanAction } from "@/lib/actions/settings";
import { formatMoney } from "@/lib/utils";
import { FormError, useSavedToast, type ActionState } from "../_components/form";

type Plan = {
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  entitlements: Record<string, unknown>;
};

type Props = {
  storeSlug: string;
  canManage: boolean;
  currency: string;
  plans: Plan[];
  currentPlanCode: string | null;
};

const entitlementLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());

const entitlementValue = (value: unknown) =>
  typeof value === "boolean" ? (value ? "Included" : "Not included") : String(value);

export function BillingClient({ storeSlug, canManage, currency, plans, currentPlanCode }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(switchPlanAction, null);
  useSavedToast(state);

  return (
    <div className="space-y-4">
      <FormError state={state} />

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          return (
            <Card key={plan.code} className={isCurrent ? "border-zinc-900 ring-1 ring-zinc-900" : undefined}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">{plan.name}</h3>
                    <p className="text-sm text-zinc-500">{plan.description}</p>
                  </div>
                  {isCurrent ? <Badge tone="success">Current</Badge> : null}
                </div>

                <p className="text-2xl font-semibold text-zinc-900">
                  {formatMoney(plan.priceMonthly, currency)}
                  <span className="text-sm font-normal text-zinc-500"> /month</span>
                </p>

                <ul className="space-y-1 text-sm text-zinc-600">
                  {Object.entries(plan.entitlements).map(([key, value]) => (
                    <li key={key} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>
                        {entitlementLabel(key)}: <span className="font-medium">{entitlementValue(value)}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-2">
                  {isCurrent ? (
                    <p className="text-xs text-zinc-400">Your current plan</p>
                  ) : (
                    <form action={action}>
                      <input type="hidden" name="storeSlug" value={storeSlug} />
                      <input type="hidden" name="planCode" value={plan.code} />
                      <Button
                        type="submit"
                        variant={plan.priceMonthly > 0 ? "primary" : "outline"}
                        size="sm"
                        disabled={pending || !canManage}
                        className="w-full"
                      >
                        {pending ? "Switching…" : `Switch to ${plan.name}`}
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        No SaaS payment processor is connected — plan changes apply immediately in this demo environment. Charges,
        invoices and card storage are not implemented.
      </p>
    </div>
  );
}
