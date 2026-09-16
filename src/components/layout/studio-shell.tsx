import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ShellSidebar } from "@/components/layout/shell-sidebar";
import { Wordmark } from "@/components/layout/wordmark";
import { Badge } from "@/components/ui/badge";
import { studioNav } from "@/lib/navigation";

type StudioShellProps = {
  /** Internal page name. */
  pageTitle?: string;
  /** Internal header actions slot. */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Private Studio shell.
 *
 * COMPONENT ONLY — deliberately not routed. Studio authorisation must be
 * enforced at route, API, data-access and file-storage level (spec §19), and
 * that authorisation is built in Phase 4. Exposing a Studio route before then
 * would ship an unprotected internal area, which the specification forbids.
 *
 * Internal vocabulary is acceptable inside this shell and must never appear on
 * a customer surface (spec §24).
 */
function StudioShell({ pageTitle, actions, children }: StudioShellProps) {
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
          items={studioNav}
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