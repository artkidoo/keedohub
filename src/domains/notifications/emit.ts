/**
 * Notifications raised by a production event (Phase 3.1).
 *
 * `recordNotification` in `./data` serves the customer's own actions: it resolves
 * the acting customer from the session and notifies them. Production events are
 * the other way round — an *operator* does something and the *customer* needs to
 * know — so this module notifies the owner of a workspace resolved from the
 * production record itself. Nothing here is ever called by the browser.
 *
 * Everything that makes a notification trustworthy is preserved:
 *   - user scoped      — the owner of the workspace row, resolved in this query
 *   - workspace scoped — the workspace of the job/project that changed
 *   - context scoped   — Brand or Artist, taken from the job, never from input
 *   - server-generated — written by the code that performed the event
 *   - customer-safe    — customer wording, and a `href` validated as a customer
 *                        route inside that same context
 *
 * A failure never breaks the production action that caused it: the work has
 * already happened, and an in-app line item must not undo it.
 */

import { eq } from "drizzle-orm";

import { customerNotificationHref } from "./presentation";
import { getDb } from "@/lib/db";
import { notification, workspace, type NotificationType } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/** One real production event, as the customer is told about it. */
export type ProductionNotification = {
  /** The workspace the event happened in — from the job, never from input. */
  workspaceId: string;
  /** Brand or Artist, inherited from the job's context. */
  context: WorkspaceContext;
  type: NotificationType;
  /** Short customer-readable headline. */
  title: string;
  /** One or two plain sentences. No internal terminology (spec §24). */
  message: string;
  /** Optional customer route inside the same context. Validated before storing. */
  href?: string;
};

/**
 * Record a production event for the customer who owns the workspace.
 *
 * The recipient is derived here, not accepted from the caller: an operator
 * cannot choose who is notified, and no event can be pushed onto another
 * customer by naming a different workspace or user.
 */
export async function notifyWorkspaceOwner(
  event: ProductionNotification,
): Promise<boolean> {
  try {
    const [owner] = await getDb()
      .select({ id: workspace.id, userId: workspace.userId })
      .from(workspace)
      .where(eq(workspace.id, event.workspaceId))
      .limit(1);

    if (!owner) {
      console.error("Notification skipped: workspace no longer exists", event.workspaceId);
      return false;
    }

    await getDb().insert(notification).values({
      userId: owner.userId,
      workspaceId: owner.id,
      contextType: event.context,
      type: event.type,
      title: event.title,
      message: event.message,
      href: event.href
        ? customerNotificationHref(event.context, event.href)
        : null,
    });

    return true;
  } catch (error) {
    // Deliberately swallowed: the customer-visible event has already happened.
    console.error("Notification could not be recorded:", error);
    return false;
  }
}