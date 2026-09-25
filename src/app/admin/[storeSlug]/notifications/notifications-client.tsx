"use client";

import { useActionState } from "react";
import { Bell } from "lucide-react";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/skeleton";
import { markNotificationReadAction } from "@/lib/actions/marketing";
import { timeAgo } from "@/lib/utils";
import { useSavedToast, type ActionState } from "../_components/form";

type Row = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: Date;
  readAt: Date | null;
};

type Props = { storeSlug: string; rows: Row[] };

function MarkRead({ storeSlug, notificationId }: { storeSlug: string; notificationId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(markNotificationReadAction, null);
  useSavedToast(state);

  return (
    <form action={action}>
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="notificationId" value={notificationId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : "Mark read"}
      </Button>
    </form>
  );
}

export function NotificationsClient({ storeSlug, rows }: Props) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No notifications"
          description="Order alerts, low-stock warnings and system messages show up here."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y divide-zinc-100 p-0">
        {rows.map((row) => (
          <div key={row.id} className="flex items-start justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={
                  row.readAt
                    ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"
                    : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
                }
              >
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className={`truncate text-sm ${row.readAt ? "text-zinc-600" : "font-medium text-zinc-900"}`}>
                  {row.title}
                </p>
                {row.body ? <p className="text-sm text-zinc-500">{row.body}</p> : null}
                <p className="mt-0.5 text-xs text-zinc-400">
                  {row.type} · {timeAgo(row.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {row.readAt ? (
                <Badge tone="default">read</Badge>
              ) : (
                <>
                  <Badge tone="info">unread</Badge>
                  <MarkRead storeSlug={storeSlug} notificationId={row.id} />
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
