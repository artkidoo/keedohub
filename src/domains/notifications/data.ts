/**
 * Customer notification data access (Checkpoint 2.8).
 *
 * A notification records something that really happened to the customer's own
 * work. It is never invented to fill a surface: rows are written by
 * `recordNotification` from the server code that performs the customer-visible
 * event.
 *
 * Scope-first (spec §20.2): every read and every write is pinned to the
 * session-derived triple — user id, owned workspace id and the requested
 * Brand/Artist context. Context is never treated as a security substitute for
 * workspace ownership: `userId` AND `workspaceId` AND `contextType` must all
 * match, so a URL segment, a query parameter or a forged header cannot widen
 * the result set, and a read-state change can only ever touch the caller's own
 * rows.
 *
 * Nothing here exposes an identifier to the customer; ids route, they are never
 * displayed.
 */

import { and, count, desc, eq, isNull } from "drizzle-orm";

import {
  requireWorkspaceContext,
  type WorkspaceContextAccess,
} from "@/domains/workspace/access";
import { getDb } from "@/lib/db";
import { notification, type NotificationType } from "@/lib/db/schema";
import { customerNotificationHref } from "./presentation";
import type { WorkspaceContext } from "@/lib/navigation";

/** The customer-visible columns of a notification. */
const notificationSelect = {
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  href: notification.href,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/**
 * The exact ownership predicate. Used by every read AND every write so a
 * notification can never be listed, counted or marked as read outside the
 * caller's own user + workspace + context.
 */
function ownedScope(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
) {
  return and(
    eq(notification.userId, access.user.id),
    eq(notification.workspaceId, access.workspace.id),
    eq(notification.contextType, context),
  );
}

/** The caller's notifications in this context, newest first. */
export async function listNotifications(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
): Promise<NotificationItem[]> {
  return getDb()
    .select(notificationSelect)
    .from(notification)
    .where(ownedScope(access, context))
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(100);
}

/** Unread count for the navigation indicator. Zero is reported as zero. */
export async function countUnreadNotifications(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(notification)
    .where(and(ownedScope(access, context), isNull(notification.readAt)));
  return row?.value ?? 0;
}

/**
 * Mark one notification as read.
 *
 * The predicate includes the caller's own user, workspace AND context, so a
 * foreign id, an id from the other context, or a well-formed id belonging to
 * someone else updates nothing and simply reports "not found".
 */
export async function markNotificationRead(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  id: string,
): Promise<boolean> {
  const updated = await getDb()
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(ownedScope(access, context), eq(notification.id, id)))
    .returning({ id: notification.id });
  return updated.length > 0;
}

/** Mark every unread notification in this context as read. */
export async function markAllNotificationsRead(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
): Promise<number> {
  const updated = await getDb()
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(ownedScope(access, context), isNull(notification.readAt)))
    .returning({ id: notification.id });
  return updated.length;
}

/** What a real customer event reports when it happens. */
export type NotificationEvent = {
  context: WorkspaceContext;
  type: NotificationType;
  title: string;
  message: string;
  /** Optional customer route; validated before it is stored. */
  href?: string;
};

/**
 * Record a real customer-visible event as a notification.
 *
 * Called by the server code that performs the event (for example, request
 * creation), never by the browser, and always with ids resolved from the
 * server-side session. The user and workspace are re-resolved from the session
 * here rather than accepted from the caller, so no event writer can attribute
 * a notification to another customer.
 *
 * A failure to record never breaks the underlying customer action: the event
 * has already happened, and losing an in-app line item must not lose the
 * request. The error is logged and swallowed deliberately.
 */
export async function recordNotification(
  context: WorkspaceContext,
  event: Omit<NotificationEvent, "context">,
): Promise<void> {
  try {
    const access = await requireWorkspaceContext(context);
    await getDb().insert(notification).values({
      userId: access.user.id,
      workspaceId: access.workspace.id,
      contextType: context,
      type: event.type,
      title: event.title,
      message: event.message,
      href: event.href ? customerNotificationHref(context, event.href) : null,
    });
  } catch (error) {
    console.error("Notification could not be recorded:", error);
  }
}
