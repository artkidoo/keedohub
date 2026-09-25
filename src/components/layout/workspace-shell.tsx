import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ShellSidebar } from "@/components/layout/shell-sidebar";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import {
  getContextMeta,
  getWorkspaceNav,
  type WorkspaceContext,
} from "@/lib/navigation";

type WorkspaceShellProps = {
  /** Current Brand or Artist context of the single workspace. */
  context?: WorkspaceContext;
  /** Short page name for the header. Omit on the context home. */
  pageTitle?: string;
  /** Header actions slot (reserved for notifications and account). */
  actions?: ReactNode;
  /**
   * Real unread notification count for this context, resolved from the session
   * by the workspace layout. Omitted means "unknown" and the marker is hidden
   * rather than guessed.
   */
  unreadNotifications?: number;
  children: ReactNode;
};

/**
 * The one and only customer shell.
 *
 * There is no Brand shell and Artist shell: the same frame renders both, and
 * only the navigation items, labels and page title change with the context
 * (spec §5, §7, §8).
 */
function WorkspaceShell({
  context,
  pageTitle,
  actions,
  unreadNotifications,
  children,
}: WorkspaceShellProps) {
  const meta = context ? getContextMeta(context) : undefined;
  const items = context ? getWorkspaceNav(context) : [];
  const navLabel = meta ? `${meta.label} navigation` : "Workspace navigation";

  return (
    <AppShell
      header={
        <WorkspaceHeader
          items={items}
          contextLabel={meta?.label}
          title={pageTitle}
          homeHref={meta?.href}
          actions={actions}
          unreadNotifications={unreadNotifications}
        />
      }
      sidebar={
        items.length > 0 ? (
          <ShellSidebar
          items={items}
          navLabel={navLabel}
          unreadNotifications={unreadNotifications}
        />
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}

export { WorkspaceShell };