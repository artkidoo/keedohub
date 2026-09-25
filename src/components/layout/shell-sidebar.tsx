import type { ReactNode } from "react";

import { ContextSwitcher } from "@/components/layout/context-switcher";
import { NavList } from "@/components/layout/nav-list";
import { WordmarkLink } from "@/components/layout/wordmark";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ShellSidebarProps = {
  items: NavItem[];
  /** Accessible name for the navigation region. */
  navLabel: string;
  /** Show the Brand/Artist switcher. True for the customer workspace, false for
   * internal chrome such as the Studio.
   */
  showContextSwitcher?: boolean;
  /** Optional footer content, pinned to the bottom of the rail. */
  footer?: ReactNode;
  /** Real unread notification count for the current context (see NavList). */
  unreadNotifications?: number;
  className?: string;
};

/**
 * Desktop navigation rail. Hidden below `lg` by `AppShell`; mobile renders the
 * same items in the sheet, so there is one navigation definition per context.
 */
function ShellSidebar({
  items,
  navLabel,
  showContextSwitcher = true,
  footer,
  unreadNotifications,
  className,
}: ShellSidebarProps) {
  return (
    <div
      data-slot="shell-sidebar"
      className={cn("flex min-h-full flex-col gap-6 px-4 py-5", className)}
    >
      <WordmarkLink className="px-1" />
      {showContextSwitcher ? <ContextSwitcher /> : null}
      <NavList
        items={items}
        label={navLabel}
        unreadNotifications={unreadNotifications}
      />
      {footer ? <div className="mt-auto px-1 pt-6">{footer}</div> : null}
    </div>
  );
}

export { ShellSidebar };
