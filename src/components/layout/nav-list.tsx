"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navIcon, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavListProps = {
  items: NavItem[];
  /** Accessible name for this navigation region. */
  label: string;
  /** Called after a navigation happens — used to close mobile panels. */
  onNavigate?: () => void;
  /**
   * Unread notification count for the Notifications item in this context
   * (Checkpoint 2.8). Resolved server-side from the caller's own scoped rows.
   * `undefined` means "not counted" and renders no marker at all; `0` renders
   * nothing either — the indicator only appears when something is unread, so
   * it can never show a fabricated number.
   */
  unreadNotifications?: number;
  className?: string;
};

/**
 * Navigation list for one workspace context. Active state comes from the
 * current route (exact match), so the same list can be rendered in the mobile
 * sheet and the desktop sidebar without duplicated implementations.
 */
function NavList({
  items,
  label,
  onNavigate,
  unreadNotifications,
  className,
}: NavListProps) {
  const pathname = usePathname();

  return (
    <nav data-slot="nav-list" aria-label={label} className={className}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = navIcon(item.icon);
          // Only the Notifications destination carries the unread marker, and
          // only when the scoped count is genuinely above zero.
          const unread =
            item.href.endsWith("/notifications") && (unreadNotifications ?? 0) > 0
              ? (unreadNotifications as number)
              : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
                  active
                    ? "bg-primary-soft text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4.5 shrink-0",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="truncate">{item.label}</span>
                {unread > 0 ? (
                  <>
                    {/* A filled dot plus a number: readable without colour. */}
                    <span
                      aria-hidden
                      className="ml-auto size-1.5 shrink-0 rounded-full bg-primary"
                    />
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground group-[-1]:hidden">
                      {unread > 99 ? "99+" : unread}
                    </span>
                    <span className="sr-only">
                      {unread} unread {unread === 1 ? "update" : "updates"}
                    </span>
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { NavList };