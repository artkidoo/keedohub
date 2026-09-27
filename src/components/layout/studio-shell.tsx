import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ShellSidebar } from "@/components/layout/shell-sidebar";
import { Wordmark } from "@/components/layout/wordmark";
import { Badge } from "@/components/ui/badge";
import { studioNav, type NavItem } from "@/lib/navigation";

type StudioShellProps = {
  /** Internal page name. */
  pageTitle?: string;
  /** Internal header actions slot. */
  actions?: ReactNode;
  /**
   * Navigation for this Studio area.
   *
   * Defaults to the full internal navigation. A partial area (Phase 3.1 ships
   * only the production workspace) passes just the sections that actually
   * exist, so the rail never links to a route that is not built — a dead link
   * on an internal surface reads as a broken product.
   */
  items?: NavItem[];
  children: ReactNode;
};

/**
 * Private Studio shell.
 *
 * Routed from `src/app/studio/layout.tsx`, which proves operator authorisation
 * before anything here renders (spec §19.1: route level). Every data read and
 * every action below it re-checks authorisation server-side as well.
 *
 * Internal vocabulary is acceptable inside this shell and must never appear on a
 * customer surface (spec §24).
 */
function StudioShell({ pageTitle, actions, items = studioNav, children }: StudioShellProps) {
  return (
    <AppShell
      header={
        <header
          data-slot="studio-header"
          className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6"
        >
          <Wordmark />
          <Badge variant="outline">Studio</Badge>
          <div className="flex min-w-0 flex-1 items-center">
            {pageTitle ? (
              <span className="truncate text-sm font-medium text-foreground">
                {pageTitle}
              </span>
            ) : null}
          </div>
          {actions ? (
            <div className="flex items-center gap-1.5">{actions}</div>
          ) : null}
        </header>
      }
      sidebar={
        <ShellSidebar
          items={items}
          navLabel="Studio navigation"
          showContextSwitcher={false}
        />
      }
    >
      {children}
    </AppShell>
  );
}

export { StudioShell };