/**
 * Customer notification vocabulary and presentation helpers (Checkpoint 2.8).
 *
 * Customer language only. Nothing here renders an internal identifier, a job
 * reference, a storage detail or a workflow term: a notification is a sentence
 * about the customer's own work plus a route they can follow.
 */

import type { NotificationType } from "@/lib/db/schema";
import type { NavIconName, WorkspaceContext } from "@/lib/navigation";

/** Page copy, per context. Deliberately short and plain. */
export const notificationCopy = {
  brand: {
    eyebrow: "Updates",
    title: "Notifications",
    description:
      "What has changed with your brand's creative work, newest first. Open an update to go straight to it.",
    emptyTitle: "No notifications yet",
    emptyDescription:
      "When something happens with your requests or projects — ready for review, changes needed, approved or delivered — it will appear here.",
  },
  artist: {
    eyebrow: "Updates",
    title: "Notifications",
    description:
      "What has changed with your creative work, newest first. Open an update to go straight to it.",
    emptyTitle: "No notifications yet",
    emptyDescription:
      "When something happens with your requests or projects — ready for review, changes needed, approved or delivered — it will appear here.",
  },
} as const;

/**
 * An icon key per notification type. Resolved to a component at render time;
 * kept as a plain string so notification data can cross the server/client
 * boundary the same way navigation data does.
 */
export const notificationIconName: Record<NotificationType, NavIconName> = {
  request_received: "send",
  ready_for_review: "check",
  changes_requested: "megaphone",
  approved: "check",
  work_delivered: "package",
  new_files_available: "package",
  update: "sparkles",
};

/** A short, honest label for the kind of update. Never an internal status. */
export function notificationKindLabel(type: NotificationType): string {
  switch (type) {
    case "request_received":
      return "Request received";
    case "ready_for_review":
      return "Ready for review";
    case "changes_requested":
      return "Changes needed";
    case "approved":
      return "Approved";
    case "work_delivered":
      return "Delivered";
    case "new_files_available":
      return "New files available";
    default:
      return "Update";
  }
}

/**
 * Validate a destination before it is stored.
 *
 * A notification's `href` is rendered as a link, so it must be a *customer*
 * route inside the caller's own context. Anything else — an absolute URL, the
 * other context, a Studio path, a protocol-relative URL — is rejected at write
 * time and stored as NULL, so a bad value can never become a link.
 */
export function customerNotificationHref(
  context: WorkspaceContext,
  href: string,
): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const prefix = `/workspace/${context}/`;
  if (!href.startsWith(prefix)) return null;
  return href;
}

/** UTC-stable timestamp formatting (no server/client timezone drift). */
export function formatNotificationTime(value: Date): string {
  const iso = value.toISOString();
  const day = `${iso.slice(0, 4)}-${iso.slice(5, 7)}-${iso.slice(8, 10)}`;
  const time = `${iso.slice(11, 16)}`;
  return `${day} at ${time} UTC`;
}