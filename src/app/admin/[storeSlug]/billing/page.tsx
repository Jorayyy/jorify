import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/card";
import { getSubscription, listPlans } from "@/lib/services/settings";
import { requireStoreContext } from "@/lib/tenancy/context";
import { formatDate } from "@/lib/utils";
import { BillingClient } from "./billing-client";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);

  const [plans, subscription] = await Promise.all([
    listPlans(),
    getSubscription(ctx.organization.id),
  ]);

  const currentPlan = plans.find((plan) => plan.code === subscription?.planCode);

  return (
    <div>
      <PageHeader
        title="Billing"
        description={
          subscription
            ? `Current plan: ${currentPlan?.name ?? subscription.planCode} · ${
                subscription.currentPeriodEnd
                  ? `renews ${formatDate(subscription.currentPeriodEnd)}`
                  : "no renewal date set"
              }`
            : "No subscription on this organization yet"
        }
        actions={subscription ? <Badge tone={subscription.status === "active" ? "success" : "warning"}>{subscription.status}</Badge> : undefined}
      />
      <BillingClient
        storeSlug={storeSlug}
        canManage={ctx.can("billing.manage")}
        currency={ctx.store.currency}
        plans={plans}
        currentPlanCode={subscription?.planCode ?? null}
      />
    </div>
  );
}
