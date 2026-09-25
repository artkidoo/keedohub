/**
 * Customer notifications (Checkpoint 2.8) — shared by both contexts.
 *
 * Authorization resolves in the page shell (the WorkspaceShell already requires
 * the context), and only the list streams, so the list has a loading state
 * without a `loading.tsx` boundary. This route is not a dynamic `[id]` route,
 * so the hard-404 boundary of 2.3/2.4 is not in play here.
 *
 * Notifications are never invented: rows exist only because a real
 * customer-visible event wrote them.
 */

import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import {
  NotificationEmptyIcon,
  NotificationRows,
  NotificationRowsSkeleton,
} from "@/components/notifications/list";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { markAllRead } from "@/domains/notifications/actions";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/domains/notifications/data";
import { notificationCopy } from "@/domains/notifications/presentation";
import {
  requireWorkspaceContext,
  type WorkspaceContextAccess,
} from "@/domains/workspace/access";
import { isWorkspaceContext, type WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

type NotificationsPageProps = { params: Promise<{ context: string }> };

export default async function NotificationsPage({
  params,
}: NotificationsPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) {
    // Unknown contexts are not workspace routes at all.
    notFound();
  }
  const access = await requireWorkspaceContext(context);
  const copy = notificationCopy[context];

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 sm:py-12 [overflow-wrap:anywhere]">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <Suspense fallback={<NotificationRowsSkeleton />}>
        <NotificationList context={context} access={access} copy={copy} />
      </Suspense>
    </Container>
  );
}

async function NotificationList({
  context,
  access,
  copy,
}: {
  context: WorkspaceContext;
  access: WorkspaceContextAccess;
  copy: (typeof notificationCopy)[keyof typeof notificationCopy];
}) {
  const [items, unread] = await Promise.all([
    listNotifications(access, context),
    countUnreadNotifications(access, context),
  ]);

  if (!items.length) {
    return (
      <EmptyState
        icon={NotificationEmptyIcon}
        title={copy.emptyTitle}
        description={copy.emptyDescription}
        action={
          <Link
            href={`/workspace/${context}/requests/new`}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            Request creative work
          </Link>
        }
      />
    );
  }

  return (
    <section aria-labelledby="notification-items" className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="notification-items" className="text-heading font-semibold">
          Your updates
        </h2>
        {unread > 0 ? (
          <form action={markAllRead.bind(null, context)}>
            <button
              type="submit"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-sm text-sm text-muted-foreground underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              Mark all as read
              <span className="sr-only">
                {" "}
                ({unread} unread {unread === 1 ? "update" : "updates"})
              </span>
            </button>
          </form>
        ) : null}
      </div>
      <NotificationRows context={context} items={items} />
    </section>
  );
}
