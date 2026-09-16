import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppShellProps = {
  /** Top bar, rendered full width and sticky. */
  header?: ReactNode;
  /**
   * Desktop navigation rail. Rendered from `lg` upward only; the same items
   * are shown in the mobile navigation panel below that breakpoint.
   */
  sidebar?: ReactNode;
  children: ReactNode;
  /** id of the main region — must match the skip link target. */
  contentId?: string;
  className?: string;
};

/**
 * The one application shell used by the customer workspace (and, later, by the
 * private Studio). It provides the responsive frame only: sticky header, an
 * optional desktop rail, and a scrollable content region.
 *
 * One shell, one CSS system, one sidebar architecture — Brand and Artist are
 * contexts inside it, never separate applications (spec §5).
 */
function AppShell({
  header,
  sidebar,
  children,
  contentId = "main",
  className,
}: AppShellProps) {
  return (
    <div
      data-slot="app-shell"
      className={cn("flex min-h-dvh flex-col bg-background", className)}
    >
      {header}
      <div className="flex flex-1">
        {sidebar ? (
          <aside className="hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border">
            {sidebar}
          </aside>
        ) : null}
        <main
          id={contentId}
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export { AppShell };
