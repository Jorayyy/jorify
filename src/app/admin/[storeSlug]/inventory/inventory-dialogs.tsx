"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { adjustInventoryAction } from "@/lib/actions/products";
import { cn, formatDate } from "@/lib/utils";
import { FormError, useCloseOnSuccess, useSavedToast, type ActionState } from "../_components/form";

type HistoryData = {
  title: string;
  entries: {
    id: string;
    delta: number;
    quantityAfter: number;
    reason: string;
    note: string | null;
    createdAt: Date;
  }[];
};

type AdjustData = {
  id: string;
  title: string;
  quantity: number;
  available: number;
  canAdjust: boolean;
};

type Props = {
  storeSlug: string;
  backHref: string;
  history: HistoryData | null;
  adjust: AdjustData | null;
};

export function InventoryDialogs({ storeSlug, backHref, history, adjust }: Props) {
  const router = useRouter();
  const close = () => router.replace(backHref);

  return (
    <>
      <Dialog
        open={Boolean(history)}
        onClose={close}
        title="Stock history"
        description={history?.title}
        className="sm:max-w-xl"
      >
        {history && history.entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No stock movements recorded yet.</p>
        ) : null}
        {history ? (
          <ul className="space-y-2.5">
            {history.entries.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-zinc-800">
                    {formatDate(entry.createdAt)} · {entry.reason}
                  </p>
                  {entry.note ? <p className="text-xs text-zinc-500">{entry.note}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-medium", entry.delta >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                  </p>
                  <p className="text-xs text-zinc-400">{entry.quantityAfter} after</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(adjust)}
        onClose={close}
        title="Adjust stock"
        description={adjust?.title}
        footer={null}
      >
        {adjust && adjust.canAdjust ? (
          <AdjustForm storeSlug={storeSlug} backHref={backHref} adjust={adjust} />
        ) : (
          <p className="text-sm text-zinc-500">You do not have permission to adjust stock.</p>
        )}
      </Dialog>
    </>
  );
}

function AdjustForm({
  storeSlug,
  backHref,
  adjust,
}: {
  storeSlug: string;
  backHref: string;
  adjust: AdjustData;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(adjustInventoryAction, null);
  const router = useRouter();
  const [delta, setDelta] = useState("0");
  const after = adjust.quantity + (Number(delta) || 0);

  useSavedToast(state);
  useCloseOnSuccess(state, () => router.replace(backHref));

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="inventoryId" value={adjust.id} />
      <FormError state={state} />

      <div className="grid grid-cols-3 gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-center">
        <div>
          <p className="text-xs text-zinc-500">On hand</p>
          <p className="font-semibold text-zinc-900">{adjust.quantity}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Available</p>
          <p className="font-semibold text-zinc-900">{adjust.available}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">After</p>
          <p className={cn("font-semibold", after < 0 ? "text-red-600" : "text-zinc-900")}>{after}</p>
        </div>
      </div>

      <div>
        <Label className="text-xs">Change by</Label>
        <Input
          name="delta"
          type="number"
          step="1"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-zinc-400">Use a negative number to remove stock.</p>
      </div>

      <div>
        <Label className="text-xs">Reason</Label>
        <Select name="reason" defaultValue="adjustment" className="mt-1">
          <option value="purchase">Purchase</option>
          <option value="received">Received</option>
          <option value="damaged">Damaged</option>
          <option value="adjustment">Adjustment</option>
          <option value="transfer">Transfer</option>
          <option value="return">Return</option>
          <option value="order">Order</option>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Note (optional)</Label>
        <Input name="note" maxLength={300} className="mt-1" />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => router.replace(backHref)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Apply adjustment"}
        </Button>
      </div>
    </form>
  );
}
