/**
 * Customer notification rows (Checkpoint 2.8).
 *
 * Editorial hairline list, matching the verified Library/Requests rows: one
 * update per row, kind + time first, headline second, message third, action
 * last. Unread rows are marked with a filled dot and a stronger surface, so
 * "what changed?" is readable without relying on colour alone (the row is also
 * labelled for assistive technology).
 *
 * Rows stack on narrow screens and sit inline from `sm` up; every title and
 * message wraps instead of clipping, and each action keeps a 44px tap target.
 */

import { Bell, Check } from "lucide-react";
import Link from "next/link";

import { markRead } from "@/domains/notifications/actions";
import type { NotificationItem } from "@/domains/notifications/data";
import {
  formatNotificationTime,
  notificationIconName,
  notificationKindLabel,
} from "@/domains/notifications/presentation";
import type { NotificationType } from "@/lib/db/schema";
import { navIcon, type WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** The unread marker. Decorative — the row carries the accessible state. */
function UnreadDot() {
  return (
    <span
      aria-hidden
      className="mt-2 size-2 shrink-0 rounded-full bg-primary sm:mt-1.5"
    />
  );
}

/** The per-kind icon, resolved here rather than in the row body. */
function KindIcon({ type }: { type: NotificationType }) {
  const Icon = kindIcons[type];
  return <Icon aria-hidden className="size-3.5" />;
}

/**
 * The per-kind icon, resolved here rather than in the row body. The mapping is
 * built once at module scope (not during render) so the component identity is
 * stable across renders, which satisfies the static-components rule.
 */
const kindIcons = Object.fromEntries(
  Object.entries(notificationIconName).map(([type, name]) => [type, navIcon(name)]),
) as Record<NotificationType, ReturnType<typeof navIcon>>;

function NotificationRow({
  context,
  item,
}: {
  context: WorkspaceContext;
  item: NotificationItem;
}) {
  const unread = item.readAt === null;

  return (
    <li
      className={cn(
        "flex min-w-0 items-start gap-3 py-5",
        unread && "bg-primary-soft/40",
      )}
    >
      {unread ? <UnreadDot /> : <span aria-hidden className="mt-2 size-2 shrink-0 sm:mt-1.5" />}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-meta flex flex-wrap items-center gap-2 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <KindIcon type={item.type} />
            {notificationKindLabel(item.type)}
          </span>
          <span aria-hidden>·</span>
          <span>{formatNotificationTime(item.createdAt)}</span>
          {unread ? <span className="sr-only">(unread)</span> : null}
        </p>

        <h3 className="text-heading font-semibold text-balance [overflow-wrap:anywhere]">
          {item.href ? (
            <Link
              href={item.href}
              className="rounded-sm outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h3>

        <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {item.message}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          {item.href ? (
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
            >
              Open<span className="sr-only">: {item.title}</span>
            </Link>
          ) : null}
          {unread ? (
            <form action={markRead.bind(null, context, item.id)}>
              <button
                type="submit"
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
              >
                <Check aria-hidden className="size-3.5" />
                Mark as read
                <span className="sr-only">: {item.title}</span>
              </button>
            </form>
          ) : (
            <span className="inline-flex min-h-11 items-center text-meta text-muted-foreground/70">
              Read
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/** The customer's updates, newest first. */
export function NotificationRows({
  context,
  items,
}: {
  context: WorkspaceContext;
  items: NotificationItem[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {items.map((item) => (
        <NotificationRow key={item.id} context={context} item={item} />
      ))}
    </ul>
  );
}

/** Loading placeholder mirroring the row layout (no data is invented). */
export function NotificationRowsSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-start gap-3 py-5">
          <div className="mt-2 size-2 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-3 w-40 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-3/4 max-w-full animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-full max-w-full animate-pulse rounded-md bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Icon for the empty state. */
export const NotificationEmptyIcon = Bell;
