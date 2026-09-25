/**
 * Customer notification server actions.
 *
 * Each action is a server entry point, so each one re-authorises from scratch
 * (spec §19.4) exactly like the request actions: the session is resolved
 * server-side, the caller's owned workspace and the requested context profile
 * are loaded from the database, and the write is bound to those server-resolved
 * ids. The context is a hardcoded argument of the calling action — never read
 * from submitted data — so a form cannot switch context or widen scope by
 * tampering with a field.
 */

"use server";

import { revalidatePath } from "next/cache";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/domains/notifications/data";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import type { WorkspaceContext } from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";

/**
 * Mark one notification as read, then refresh the surfaces that show the
 * unread state. An id that does not resolve inside the caller's own scope
 * changes nothing; the page revalidates either way and shows the real state.
 */
export async function markRead(context: WorkspaceContext, id: string) {
  if (!isValidUUIDv4(id)) return;
  const access = await requireWorkspaceContext(context);
  await markNotificationRead(access, context, id);
  revalidatePath(`/workspace/${context}/notifications`);
  revalidatePath(`/workspace/${context}`);
}

/** Mark every unread notification in the caller's context as read. */
export async function markAllRead(context: WorkspaceContext) {
  const access = await requireWorkspaceContext(context);
  await markAllNotificationsRead(access, context);
  revalidatePath(`/workspace/${context}/notifications`);
  revalidatePath(`/workspace/${context}`);
}