"use client";

import { useActionState, useState } from "react";
import { Globe, Plus, Trash2 } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteShippingAction,
  deleteZoneAction,
  saveBrandingAction,
  saveCheckoutAction,
  saveGeneralAction,
  saveNotificationsAction,
  saveSeoAction,
  saveShippingAction,
  saveStorefrontAction,
  saveTaxesAction,
  saveZoneAction,
  setPrimaryDomainAction,
} from "@/lib/actions/settings";
import { formatMoney } from "@/lib/utils";
import { FormError, useCloseOnSuccess, useSavedToast, type ActionState } from "../_components/form";

type Store = {
  name: string;
  description: string | null;
  currency: string;
  locale: string;
  status: string;
  logoUrl: string | null;
};

type Settings = {
  branding: unknown;
  checkout: unknown;
  taxes: unknown;
  notifications: unknown;
  seo: unknown;
};

type Domain = { id: string; domain: string; verificationStatus: string; isPrimary: boolean };
type Method = { id: string; name: string; price: number; estimatedDays: string | null; active: boolean; position: number };
type Zone = {
  id: string;
  name: string;
  regions: string[];
  fee: number;
  minOrder: number | null;
  estimatedDays: string | null;
  active: boolean;
};

type Props = {
  storeSlug: string;
  canManage: boolean;
  currency: string;
  store: Store;
  settings: Settings;
  domains: Domain[];
  shipping: Method[];
  zones: Zone[];
  paymentProviders: string[];
  initialTab: string;
};

const TABS = ["general", "branding", "storefront", "domains", "checkout", "payments", "shipping", "taxes", "notifications", "seo"];

const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const str = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const bool = (value: unknown, fallback = false): boolean => (typeof value === "boolean" ? value : fallback);
const num = (value: unknown, fallback = 0): number => (typeof value === "number" ? value : fallback);

function Submit({
  pending,
  canManage,
  children,
}: {
  pending: boolean;
  canManage: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" variant="primary" size="sm" disabled={pending || !canManage}>
      {pending ? "Saving…" : children}
    </Button>
  );
}

function Check({
  name,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-zinc-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300"
      />
      <span>{label}</span>
    </label>
  );
}

export function SettingsClient({
  storeSlug,
  canManage,
  currency,
  store,
  settings,
  domains,
  shipping,
  zones,
  paymentProviders,
  initialTab,
}: Props) {
  const branding = obj(settings.branding);
  const colors = obj(branding.colors);
  const flags = obj(branding.storefront);
  const checkout = obj(settings.checkout);
  const taxes = obj(settings.taxes);
  const notifications = obj(settings.notifications);
  const seo = obj(settings.seo);

  return (
    <Tabs defaultValue={TABS.includes(initialTab) ? initialTab : "general"}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="storefront">Storefront</TabsTrigger>
        <TabsTrigger value="domains">Domains</TabsTrigger>
        <TabsTrigger value="checkout">Checkout</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="shipping">Shipping</TabsTrigger>
        <TabsTrigger value="taxes">Taxes</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="seo">SEO</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralForm storeSlug={storeSlug} canManage={canManage} store={store} />
      </TabsContent>

      <TabsContent value="branding">
        <BrandingForm storeSlug={storeSlug} canManage={canManage} store={store} colors={colors} />
      </TabsContent>

      <TabsContent value="storefront">
        <StorefrontForm storeSlug={storeSlug} canManage={canManage} status={store.status} flags={flags} />
      </TabsContent>

      <TabsContent value="domains">
        <DomainsSection storeSlug={storeSlug} canManage={canManage} domains={domains} />
      </TabsContent>

      <TabsContent value="checkout">
        <CheckoutForm storeSlug={storeSlug} canManage={canManage} checkout={checkout} />
      </TabsContent>

      <TabsContent value="payments">
        <PaymentsSection paymentProviders={paymentProviders} />
      </TabsContent>

      <TabsContent value="shipping">
        <ShippingSection storeSlug={storeSlug} canManage={canManage} currency={currency} shipping={shipping} zones={zones} />
      </TabsContent>

      <TabsContent value="taxes">
        <TaxesForm storeSlug={storeSlug} canManage={canManage} taxes={taxes} />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationsForm storeSlug={storeSlug} canManage={canManage} notifications={notifications} />
      </TabsContent>

      <TabsContent value="seo">
        <SeoForm storeSlug={storeSlug} canManage={canManage} seo={seo} />
      </TabsContent>
    </Tabs>
  );
}

function GeneralForm({ storeSlug, canManage, store }: { storeSlug: string; canManage: boolean; store: Store }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveGeneralAction, null);
  useSavedToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Store name</Label>
              <Input name="name" required defaultValue={store.name} disabled={!canManage} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Input name="currency" required defaultValue={store.currency} disabled={!canManage} className="mt-1" />
              <p className="mt-1 text-xs text-zinc-400">3-letter ISO code, e.g. PHP</p>
            </div>
            <div>
              <Label className="text-xs">Locale</Label>
              <Input name="locale" required defaultValue={store.locale} disabled={!canManage} className="mt-1" />
              <p className="mt-1 text-xs text-zinc-400">Formatting locale, e.g. en-PH</p>
            </div>
          </div>
          <div>
            <Label className="text-xs">Store description</Label>
            <Textarea
              name="description"
              rows={3}
              defaultValue={store.description ?? ""}
              disabled={!canManage}
              className="mt-1"
            />
          </div>
          <Submit pending={pending} canManage={canManage}>
            Save general settings
          </Submit>
        </form>
      </CardContent>
    </Card>
  );
}

function BrandingForm({
  storeSlug,
  canManage,
  store,
  colors,
}: {
  storeSlug: string;
  canManage: boolean;
  store: Store;
  colors: Record<string, unknown>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBrandingAction, null);
  useSavedToast(state);

  const fields = [
    { name: "colorPrimary", label: "Primary", value: str(colors.primary, "#111111") },
    { name: "colorAccent", label: "Accent", value: str(colors.accent, "#f0c14b") },
    { name: "colorBackground", label: "Background", value: str(colors.background, "#ffffff") },
    { name: "colorText", label: "Text", value: str(colors.text, "#111111") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />
          <div>
            <Label className="text-xs">Logo URL</Label>
            <Input
              name="logoUrl"
              type="url"
              defaultValue={store.logoUrl ?? ""}
              disabled={!canManage}
              className="mt-1"
              placeholder="https://…"
            />
            <p className="mt-1 text-xs text-zinc-400">Uploads are not configured yet — paste a hosted image URL.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {fields.map((field) => (
              <div key={field.name}>
                <Label className="text-xs">{field.label}</Label>
                <input
                  type="color"
                  name={field.name}
                  defaultValue={field.value}
                  disabled={!canManage}
                  aria-label={field.label}
                  className="mt-1 h-9 w-full cursor-pointer rounded border border-zinc-300 bg-white p-1"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400">Theme rendering for these colors is coming soon.</p>
          <div>
            <Submit pending={pending} canManage={canManage}>
              Save branding
            </Submit>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function StorefrontForm({
  storeSlug,
  canManage,
  status,
  flags,
}: {
  storeSlug: string;
  canManage: boolean;
  status: string;
  flags: Record<string, unknown>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveStorefrontAction, null);
  useSavedToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storefront</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />
          <Check
            name="visible"
            label="Storefront visible — customers can open the store and place orders"
            defaultChecked={status === "active"}
            disabled={!canManage}
          />
          <div className="rounded-md border border-zinc-200 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Storefront sections</p>
            <div className="space-y-2">
              <Check name="showAnnouncementBar" label="Show announcement bar" defaultChecked={bool(flags.showAnnouncementBar)} disabled={!canManage} />
              <Check name="enableSearch" label="Enable product search" defaultChecked={bool(flags.enableSearch, true)} disabled={!canManage} />
              <Check name="showSocialLinks" label="Show social links in the footer" defaultChecked={bool(flags.showSocialLinks)} disabled={!canManage} />
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              These flags are saved now; support for rendering them in the storefront theme is coming soon.
            </p>
          </div>
          <Submit pending={pending} canManage={canManage}>
            Save storefront settings
          </Submit>
        </form>
      </CardContent>
    </Card>
  );
}

function DomainsSection({
  storeSlug,
  canManage,
  domains,
}: {
  storeSlug: string;
  canManage: boolean;
  domains: Domain[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setPrimaryDomainAction, null);
  useSavedToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domains</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <FormError state={state} />
        {domains.length === 0 ? (
          <EmptyState
            title="No custom domains"
            description="Your store runs on the platform subdomain until a custom domain is connected."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Domain</TH>
                <TH>Verification</TH>
                <TH className="text-right">Primary</TH>
              </TR>
            </THead>
            <TBody>
              {domains.map((domain) => (
                <TR key={domain.id}>
                  <TD>
                    <span className="flex items-center gap-2 font-medium text-zinc-900">
                      <Globe className="h-4 w-4 text-zinc-400" />
                      {domain.domain}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={domain.verificationStatus === "verified" ? "success" : "warning"}>
                      {domain.verificationStatus}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    {domain.isPrimary ? (
                      <Badge tone="info">primary</Badge>
                    ) : (
                      <form action={action} className="inline-block">
                        <input type="hidden" name="storeSlug" value={storeSlug} />
                        <input type="hidden" name="domainId" value={domain.id} />
                        <Button type="submit" variant="outline" size="sm" disabled={pending || !canManage}>
                          Set primary
                        </Button>
                      </form>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <p className="text-xs text-zinc-400">
          DNS verification is handled by the platform — domain connection is managed by support, this screen does not
          simulate it.
        </p>
      </CardContent>
    </Card>
  );
}

function CheckoutForm({
  storeSlug,
  canManage,
  checkout,
}: {
  storeSlug: string;
  canManage: boolean;
  checkout: Record<string, unknown>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCheckoutAction, null);
  useSavedToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />
          <div className="space-y-2">
            <Check name="guestCheckout" label="Allow guest checkout (no account required)" defaultChecked={bool(checkout.guestCheckout, true)} disabled={!canManage} />
            <Check name="requirePhone" label="Require a phone number" defaultChecked={bool(checkout.requirePhone)} disabled={!canManage} />
            <Check name="orderNotes" label="Allow order notes" defaultChecked={bool(checkout.orderNotes, true)} disabled={!canManage} />
          </div>
          <Submit pending={pending} canManage={canManage}>
            Save checkout settings
          </Submit>
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentsSection({ paymentProviders }: { paymentProviders: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {paymentProviders.length === 0 ? (
            <Badge>No providers available</Badge>
          ) : (
            paymentProviders.map((provider) => (
              <Badge key={provider} tone="default">
                {provider}
              </Badge>
            ))
          )}
        </div>
        <p className="text-sm text-zinc-500">
          Payment methods are configured by the platform, not per store. This environment records payments manually —
          use “Mark paid” on an order once money is received (cash, GCash, bank transfer).
        </p>
      </CardContent>
    </Card>
  );
}

type ShippingSectionProps = {
  storeSlug: string;
  canManage: boolean;
  currency: string;
  shipping: Method[];
  zones: Zone[];
};

function ShippingSection({ storeSlug, canManage, currency, shipping, zones }: ShippingSectionProps) {
  const [methodDialog, setMethodDialog] = useState<false | "new" | Method>(false);
  const [zoneDialog, setZoneDialog] = useState<false | "new" | Zone>(false);
  const [deletingMethod, setDeletingMethod] = useState<Method | null>(null);
  const [deletingZone, setDeletingZone] = useState<Zone | null>(null);

  const [saveState, saveAction, savePending] = useActionState<ActionState, FormData>(saveShippingAction, null);
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(deleteShippingAction, null);
  const [zoneSaveState, zoneSaveAction, zoneSavePending] = useActionState<ActionState, FormData>(saveZoneAction, null);
  const [zoneDeleteState, zoneDeleteAction, zoneDeletePending] = useActionState<ActionState, FormData>(deleteZoneAction, null);

  useSavedToast(saveState);
  useSavedToast(deleteState);
  useSavedToast(zoneSaveState);
  useSavedToast(zoneDeleteState);
  useCloseOnSuccess(saveState, () => setMethodDialog(false));
  useCloseOnSuccess(deleteState, () => setDeletingMethod(null));
  useCloseOnSuccess(zoneSaveState, () => setZoneDialog(false));
  useCloseOnSuccess(zoneDeleteState, () => setDeletingZone(null));

  const editingMethod = methodDialog === "new" || methodDialog === false ? null : methodDialog;
  const editingZone = zoneDialog === "new" || zoneDialog === false ? null : zoneDialog;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Shipping methods</CardTitle>
          {canManage ? (
            <Button variant="outline" size="sm" onClick={() => setMethodDialog("new")}>
              <Plus className="h-4 w-4" /> Add method
            </Button>
          ) : null}
        </CardHeader>
        {shipping.length === 0 ? (
          <EmptyState title="No shipping methods" description="Add the delivery options customers can pick at checkout." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Method</TH>
                <TH className="text-right">Price</TH>
                <TH>Est. delivery</TH>
                <TH>Status</TH>
                {canManage ? <TH className="text-right">Actions</TH> : null}
              </TR>
            </THead>
            <TBody>
              {shipping.map((method) => (
                <TR key={method.id}>
                  <TD className="font-medium text-zinc-900">{method.name}</TD>
                  <TD className="text-right">{formatMoney(method.price, currency)}</TD>
                  <TD className="text-zinc-500">{method.estimatedDays || "—"}</TD>
                  <TD>
                    <Badge tone={method.active ? "success" : "warning"}>{method.active ? "active" : "hidden"}</Badge>
                  </TD>
                  {canManage ? (
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setMethodDialog(method)}>
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeletingMethod(method)}
                          className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${method.name}`}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Delivery zones</CardTitle>
          {canManage ? (
            <Button variant="outline" size="sm" onClick={() => setZoneDialog("new")}>
              <Plus className="h-4 w-4" /> Add zone
            </Button>
          ) : null}
        </CardHeader>
        {zones.length === 0 ? (
          <EmptyState title="No delivery zones" description="Group regions that share the same fee and delivery time." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Zone</TH>
                <TH>Regions</TH>
                <TH className="text-right">Fee</TH>
                <TH className="text-right">Min order</TH>
                <TH>Status</TH>
                {canManage ? <TH className="text-right">Actions</TH> : null}
              </TR>
            </THead>
            <TBody>
              {zones.map((zone) => (
                <TR key={zone.id}>
                  <TD className="font-medium text-zinc-900">{zone.name}</TD>
                  <TD className="max-w-[220px] truncate text-zinc-500">{zone.regions.join(", ")}</TD>
                  <TD className="text-right">{formatMoney(zone.fee, currency)}</TD>
                  <TD className="text-right">{formatMoney(zone.minOrder ?? 0, currency)}</TD>
                  <TD>
                    <Badge tone={zone.active ? "success" : "warning"}>{zone.active ? "active" : "hidden"}</Badge>
                  </TD>
                  {canManage ? (
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setZoneDialog(zone)}>
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeletingZone(zone)}
                          className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${zone.name}`}
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
        open={methodDialog !== false}
        onClose={() => setMethodDialog(false)}
        title={editingMethod ? "Edit shipping method" : "Add shipping method"}
      >
        <form action={saveAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="methodId" value={editingMethod?.id ?? ""} />
          <FormError state={saveState} />
          <div>
            <Label className="text-xs">Name</Label>
            <Input name="name" required defaultValue={editingMethod?.name ?? ""} className="mt-1" placeholder="Standard delivery" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Price ({currency})</Label>
              <Input name="price" type="number" min={0} required defaultValue={editingMethod ? editingMethod.price / 100 : ""} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Est. delivery</Label>
              <Input name="estimatedDays" defaultValue={editingMethod?.estimatedDays ?? ""} className="mt-1" placeholder="3–5 days" />
            </div>
            <div>
              <Label className="text-xs">Position</Label>
              <Input name="position" type="number" min={0} defaultValue={editingMethod?.position ?? 0} className="mt-1" />
            </div>
          </div>
          <Check name="active" label="Active (customers can select it)" defaultChecked={editingMethod ? editingMethod.active : true} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setMethodDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={savePending}>
              {savePending ? "Saving…" : editingMethod ? "Save changes" : "Add method"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={zoneDialog !== false}
        onClose={() => setZoneDialog(false)}
        title={editingZone ? "Edit delivery zone" : "Add delivery zone"}
      >
        <form action={zoneSaveAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="zoneId" value={editingZone?.id ?? ""} />
          <FormError state={zoneSaveState} />
          <div>
            <Label className="text-xs">Zone name</Label>
            <Input name="name" required defaultValue={editingZone?.name ?? ""} className="mt-1" placeholder="Metro Manila" />
          </div>
          <div>
            <Label className="text-xs">Regions</Label>
            <Input name="regions" required defaultValue={editingZone?.regions.join(", ") ?? ""} className="mt-1" placeholder="Manila, Quezon City, Pasig" />
            <p className="mt-1 text-xs text-zinc-400">Comma separated</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Fee ({currency})</Label>
              <Input name="fee" type="number" min={0} required defaultValue={editingZone ? editingZone.fee / 100 : ""} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Min order ({currency})</Label>
              <Input name="minOrder" type="number" min={0} defaultValue={editingZone ? (editingZone.minOrder ?? 0) / 100 : ""} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Est. delivery</Label>
              <Input name="estimatedDays" defaultValue={editingZone?.estimatedDays ?? ""} className="mt-1" placeholder="1–2 days" />
            </div>
          </div>
          <Check name="active" label="Active" defaultChecked={editingZone ? editingZone.active : true} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setZoneDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={zoneSavePending}>
              {zoneSavePending ? "Saving…" : editingZone ? "Save changes" : "Add zone"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={deletingMethod !== null}
        onClose={() => setDeletingMethod(null)}
        title="Delete shipping method?"
        description={deletingMethod ? `${deletingMethod.name} will no longer be offered at checkout.` : ""}
      >
        <form action={deleteAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="methodId" value={deletingMethod?.id ?? ""} />
          <FormError state={deleteState} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeletingMethod(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={deletingZone !== null}
        onClose={() => setDeletingZone(null)}
        title="Delete delivery zone?"
        description={deletingZone ? `${deletingZone.name} will stop applying to checkout.` : ""}
      >
        <form action={zoneDeleteAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="zoneId" value={deletingZone?.id ?? ""} />
          <FormError state={zoneDeleteState} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeletingZone(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={zoneDeletePending}>
              {zoneDeletePending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function TaxesForm({
  storeSlug,
  canManage,
  taxes,
}: {
  storeSlug: string;
  canManage: boolean;
  taxes: Record<string, unknown>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTaxesAction, null);
  useSavedToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxes</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />
          <Check name="enabled" label="Charge tax on orders" defaultChecked={bool(taxes.enabled)} disabled={!canManage} />
          <div className="max-w-xs">
            <Label className="text-xs">Tax rate (%)</Label>
            <Input name="rate" type="number" min={0} max={100} step="0.1" defaultValue={num(taxes.rate, 12)} disabled={!canManage} className="mt-1" />
          </div>
          <p className="text-xs text-zinc-400">Applied to order totals at checkout. Tax remittance is your responsibility.</p>
          <div>
            <Submit pending={pending} canManage={canManage}>
              Save tax settings
            </Submit>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationsForm({
  storeSlug,
  canManage,
  notifications,
}: {
  storeSlug: string;
  canManage: boolean;
  notifications: Record<string, unknown>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveNotificationsAction, null);
  useSavedToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />
          <div className="space-y-2">
            <Check name="orderUpdates" label="Notify me about new orders" defaultChecked={bool(notifications.orderUpdates, true)} disabled={!canManage} />
            <Check name="lowStockAlerts" label="Notify me when stock runs low" defaultChecked={bool(notifications.lowStockAlerts, true)} disabled={!canManage} />
            <Check name="marketingEmails" label="Send me product news and tips" defaultChecked={bool(notifications.marketingEmails)} disabled={!canManage} />
          </div>
          <p className="text-xs text-zinc-400">
            Preferences are saved, but only the admin notification center is active — email delivery is not configured
            in this environment.
          </p>
          <Submit pending={pending} canManage={canManage}>
            Save notification settings
          </Submit>
        </form>
      </CardContent>
    </Card>
  );
}

function SeoForm({
  storeSlug,
  canManage,
  seo,
}: {
  storeSlug: string;
  canManage: boolean;
  seo: Record<string, unknown>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSeoAction, null);
  useSavedToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />
          <div>
            <Label className="text-xs">Default page title (max 70 chars)</Label>
            <Input name="title" maxLength={70} defaultValue={str(seo.title)} disabled={!canManage} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Meta description (max 160 chars)</Label>
            <Textarea name="description" rows={3} maxLength={160} defaultValue={str(seo.description)} disabled={!canManage} className="mt-1" />
          </div>
          <Submit pending={pending} canManage={canManage}>
            Save SEO settings
          </Submit>
        </form>
      </CardContent>
    </Card>
  );
}
