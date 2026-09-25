"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { deleteDiscountAction, saveDiscountAction } from "@/lib/actions/marketing";
import { formatMoney } from "@/lib/utils";
import { FormError, useCloseOnSuccess, useSavedToast, type ActionState } from "../_components/form";

type DiscountRow = {
  id: string;
  name: string;
  code: string;
  type: string;
  value: number;
  appliesTo: string;
  productIds: string[];
  categoryIds: string[];
  minSubtotal: number | null;
  usageLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: string;
};

type Option = { id: string; name: string };

type Props = {
  storeSlug: string;
  currency: string;
  canEdit: boolean;
  discounts: DiscountRow[];
  products: Option[];
  categories: Option[];
};

const toLocalInput = (value: Date | null) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const statusTone = (status: string) =>
  status === "active" ? "success" : status === "scheduled" ? "info" : "warning";

export function DiscountsClient({ storeSlug, currency, canEdit, discounts, products, categories }: Props) {
  const [open, setOpen] = useState<false | "new" | DiscountRow>(false);
  const [deleting, setDeleting] = useState<DiscountRow | null>(null);
  const [saveState, saveAction, savePending] = useActionState<ActionState, FormData>(saveDiscountAction, null);
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(deleteDiscountAction, null);

  useSavedToast(saveState);
  useSavedToast(deleteState);
  useCloseOnSuccess(saveState, () => setOpen(false));
  useCloseOnSuccess(deleteState, () => setDeleting(null));

  const rows = discounts;
  const editing = open === "new" || open === false ? null : open;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit ? (
          <Button variant="primary" size="sm" onClick={() => setOpen("new")}>
            <Plus className="h-4 w-4" /> New discount
          </Button>
        ) : null}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No discounts yet"
            description="Create discount codes your customers can use at checkout."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Discount</TH>
                <TH>Value</TH>
                <TH>Applies to</TH>
                <TH>Schedule</TH>
                <TH>Status</TH>
                {canEdit ? <TH className="text-right">Actions</TH> : null}
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <span className="font-medium text-zinc-900">{row.name}</span>
                    <span className="block text-xs text-zinc-500">{row.code}</span>
                  </TD>
                  <TD>
                    {row.type === "percentage" ? `${row.value}%` : formatMoney(row.value, currency)}
                    {row.minSubtotal ? (
                      <span className="block text-xs text-zinc-400">
                        min {formatMoney(row.minSubtotal, currency)}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="capitalize">{row.appliesTo}</TD>
                  <TD className="text-xs text-zinc-500">
                    {row.startsAt || row.endsAt ? (
                      <>
                        {row.startsAt ? new Date(row.startsAt).toLocaleDateString() : "now"}
                        {" → "}
                        {row.endsAt ? new Date(row.endsAt).toLocaleDateString() : "no end"}
                      </>
                    ) : (
                      "Always"
                    )}
                  </TD>
                  <TD>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </TD>
                  {canEdit ? (
                    <TD>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setOpen(row)}
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                          aria-label={`Edit ${row.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(row)}
                          className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${row.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={open !== false}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New discount"}
        description={editing ? "Changes apply to future checkouts" : "Discount codes apply automatically when entered at checkout"}
        className="max-w-2xl"
      >
        <form action={saveAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="discountId" value={editing?.id ?? ""} />
          <FormError state={saveState} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input name="name" required defaultValue={editing?.name ?? ""} placeholder="Summer sale" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Code</Label>
              <Input
                name="code"
                required
                defaultValue={editing?.code ?? ""}
                placeholder="SUMMER25"
                className="mt-1 uppercase"
                pattern="[A-Za-z0-9_-]{3,32}"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select name="type" defaultValue={editing?.type ?? "percentage"} className="mt-1">
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Value</Label>
              <Input
                name="value"
                type="number"
                min={0}
                required
                defaultValue={editing ? (editing.type === "fixed" ? editing.value / 100 : editing.value) : ""}
                placeholder={editing?.type === "fixed" ? "100" : "15"}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-zinc-400">
                {editing?.type === "fixed" ? "Amount off, in pesos" : "Percent (1–100)"}
              </p>
            </div>
            <div>
              <Label className="text-xs">Minimum subtotal (₱)</Label>
              <Input
                name="minSubtotal"
                type="number"
                min={0}
                defaultValue={editing ? (editing.minSubtotal ?? 0) / 100 : ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Usage limit (empty = unlimited)</Label>
              <Input name="usageLimit" type="number" min={1} defaultValue={editing?.usageLimit ?? ""} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Starts</Label>
              <Input name="startsAt" type="datetime-local" defaultValue={toLocalInput(editing?.startsAt ?? null)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Ends</Label>
              <Input name="endsAt" type="datetime-local" defaultValue={toLocalInput(editing?.endsAt ?? null)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Applies to</Label>
              <Select name="appliesTo" defaultValue={editing?.appliesTo ?? "all"} className="mt-1">
                <option value="all">Entire order</option>
                <option value="products">Specific products</option>
                <option value="categories">Specific categories</option>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select name="status" defaultValue={editing?.status ?? "active"} className="mt-1">
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
              </Select>
            </div>
          </div>

          <fieldset className="rounded-md border border-zinc-200 p-3">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Target products / categories
            </legend>
            <p className="mb-2 text-xs text-zinc-400">
              Ignored when “Entire order” is selected. Product list shows the first 50 products.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="productIds"
                      value={product.id}
                      defaultChecked={editing?.productIds.includes(product.id)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <span className="truncate">{product.name}</span>
                  </label>
                ))}
                {products.length === 0 ? <p className="text-xs text-zinc-400">No products yet.</p> : null}
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="categoryIds"
                      value={category.id}
                      defaultChecked={editing?.categoryIds.includes(category.id)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <span className="truncate">{category.name}</span>
                  </label>
                ))}
                {categories.length === 0 ? <p className="text-xs text-zinc-400">No categories yet.</p> : null}
              </div>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={savePending}>
              {savePending ? "Saving…" : editing ? "Save changes" : "Create discount"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete discount?"
        description={deleting ? `${deleting.code} will stop applying to new orders.` : ""}
      >
        <form action={deleteAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="discountId" value={deleting?.id ?? ""} />
          <FormError state={deleteState} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
