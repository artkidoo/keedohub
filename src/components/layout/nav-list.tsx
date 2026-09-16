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
  className?: string;
};

/**
 * Navigation list for one workspace context. Active state comes from the
 * current route (exact match), so the same list can be rendered in the mobile
 * sheet and the desktop sidebar without duplicated implementations.
 */
function NavList({ items, label, onNavigate, className }: NavListProps) {
  const pathname = usePathname();

  return (
    <nav data-slot="nav-list" aria-label={label} className={className}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = navIcon(item.icon);
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { NavList };