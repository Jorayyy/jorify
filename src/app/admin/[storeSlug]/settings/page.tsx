import { PageHeader } from "@/components/page-header";
import { availablePaymentProviders, getPaymentProvider } from "@/lib/payments";
import { listDeliveryZones, listShippingMethods } from "@/lib/services/fulfillment";
import { getSettings, listDomains } from "@/lib/services/settings";
import { requireStoreContext } from "@/lib/tenancy/context";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { storeSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireStoreContext(storeSlug);

  const [settings, domains, shipping, zones] = await Promise.all([
    getSettings(ctx),
    listDomains(ctx),
    listShippingMethods(ctx),
    listDeliveryZones(ctx),
  ]);

  return (
    <div>
      <PageHeader title="Settings" description="Configure how your store looks, ships and sells" />
      <SettingsClient
        storeSlug={storeSlug}
        canManage={ctx.can("settings.update")}
        currency={ctx.store.currency}
        store={{
          name: ctx.store.name,
          description: ctx.store.description,
          currency: ctx.store.currency,
          locale: ctx.store.locale,
          status: ctx.store.status,
          logoUrl: ctx.store.logoUrl,
        }}
        settings={{
          branding: settings?.branding,
          checkout: settings?.checkout,
          taxes: settings?.taxes,
          notifications: settings?.notifications,
          seo: settings?.seo,
        }}
        domains={domains}
        shipping={shipping}
        zones={zones}
        paymentProviders={availablePaymentProviders()}
        activeProvider={getPaymentProvider().key}
        initialTab={sp.tab ?? "general"}
      />
    </div>
  );
}
