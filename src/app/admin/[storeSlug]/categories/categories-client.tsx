"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/products";
import type { productCategories } from "@/lib/db/schema";
import { FormError, useCloseOnSuccess, useSavedToast, type ActionState } from "../_components/form";

type Category = typeof productCategories.$inferSelect;

type Props = {
  storeSlug: string;
  categories: Category[];
  canEdit: boolean;
  canDelete: boolean;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export function CategoriesClient({ storeSlug, categories, canEdit, canDelete }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveCategoryAction, null);
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(deleteCategoryAction, null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useSavedToast(state);
  useSavedToast(deleteState);
  useCloseOnSuccess(state, () => setOpen(false));
  useCloseOnSuccess(deleteState, () => setDeleteTarget(null));

  const openCreate = () => {
    setEditing(null);
    setSlug("");
    setSlugEdited(false);
    setOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setSlug(category.slug);
    setSlugEdited(true);
    setOpen(true);
  };

  return (
    <div>
      {canEdit ? (
        <div className="mb-4 flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add category
          </Button>
        </div>
      ) : null}

      <Card>
        {categories.length === 0 ? (
          <EmptyState title="No categories yet" description="Create your first category to organise products." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>URL</TH>
                <TH>Parent</TH>
                <TH className="text-right">Position</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {categories.map((category) => (
                <TR key={category.id}>
                  <TD className="font-medium text-zinc-900">{category.name}</TD>
                  <TD className="text-zinc-500">{category.slug}</TD>
                  <TD>{categories.find((item) => item.id === category.parentId)?.name ?? "—"}</TD>
                  <TD className="text-right">{category.position}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEdit ? (
                        <button
                          type="button"
                          title="Edit category"
                          className="text-zinc-400 hover:text-zinc-900"
                          onClick={() => openEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          title="Delete category"
                          className="text-zinc-400 hover:text-red-600"
                          onClick={() => setDeleteTarget(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit category" : "New category"}
        description="Categories appear as filters on your storefront."
      >
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          {editing ? <input type="hidden" name="categoryId" value={editing.id} /> : null}
          <FormError state={state} />
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              className="mt-1"
              onChange={(event) => {
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
            />
          </div>
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              name="slug"
              required
              value={slug}
              className="mt-1"
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea name="description" rows={3} defaultValue={editing?.description ?? ""} className="mt-1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Parent category</Label>
              <Select name="parentId" defaultValue={editing?.parentId ?? ""} className="mt-1">
                <option value="">None</option>
                {categories
                  .filter((category) => category.id !== editing?.id)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Position</Label>
              <Input name="position" type="number" min="0" defaultValue={editing?.position ?? 0} className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Create category"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this category?"
        description="Products in it stay, but lose their category."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <form action={deleteAction} className="contents">
              <input type="hidden" name="storeSlug" value={storeSlug} />
              <input type="hidden" name="categoryId" value={deleteTarget?.id ?? ""} />
              <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
                {deletePending ? "Deleting…" : "Delete"}
              </Button>
            </form>
          </>
        }
      >
        <FormError state={deleteState} />
        <p className="text-sm text-zinc-600">{deleteTarget?.name}</p>
      </Dialog>
    </div>
  );
}
