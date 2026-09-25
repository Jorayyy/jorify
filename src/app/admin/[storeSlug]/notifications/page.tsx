import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { listNotifications } from "@/lib/services/marketing";
import { getSessionUser, requireStoreContext } from "@/lib/tenancy/context";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);

  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=/admin/${storeSlug}/notifications`);

  const rows = await listNotifications(ctx, user.id);
  const unread = rows.filter((row) => !row.readAt).length;

  return (
    <div>
      <PageHeader title="Notifications" description={`${unread} unread · delivery by email is not configured yet`} />
      <NotificationsClient storeSlug={storeSlug} rows={rows} />
    </div>
  );
}
