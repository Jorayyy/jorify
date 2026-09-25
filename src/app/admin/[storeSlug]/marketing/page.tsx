import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { listDiscounts } from "@/lib/services/marketing";
import { requireStoreContext } from "@/lib/tenancy/context";

type Capability = {
  title: string;
  description: string;
  status: "available" | "planned";
  href?: string;
};

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);

  const discounts = await listDiscounts(ctx);
  const activeDiscounts = discounts.filter((discount) => discount.status === "active").length;

  const capabilities: Capability[] = [
    {
      title: "Discount codes",
      description: `${discounts.length} codes, ${activeDiscounts} active. Create percentage or fixed-amount codes that apply at checkout.`,
      status: "available",
      href: `/admin/${storeSlug}/discounts`,
    },
    { title: "Email campaigns", description: "Send promotional and newsletter emails to customer segments.", status: "planned" },
    { title: "SMS campaigns", description: "Bulk SMS promotions and order updates to opted-in customers.", status: "planned" },
    { title: "Abandoned cart recovery", description: "Automatically remind shoppers who left items in their cart.", status: "planned" },
    { title: "Loyalty & referrals", description: "Points, rewards, and referral codes for repeat customers.", status: "planned" },
    { title: "Product reviews", description: "Collect and display reviews on product pages.", status: "planned" },
  ];

  return (
    <div>
      <PageHeader title="Marketing" description="Promotions and customer outreach tools" />

      <div className="grid gap-4 sm:grid-cols-2">
        {capabilities.map((item) => (
          <Card key={item.title}>
            <CardContent className="flex h-full flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                </div>
                <Badge tone={item.status === "available" ? "success" : "default"}>
                  {item.status === "available" ? "Available" : "Planned"}
                </Badge>
              </div>
              <p className="text-sm text-zinc-500">{item.description}</p>
              {item.href ? (
                <Link
                  href={item.href}
                  className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-zinc-900 hover:underline"
                >
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <p className="mt-auto pt-1 text-xs text-zinc-400">Not implemented yet.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
