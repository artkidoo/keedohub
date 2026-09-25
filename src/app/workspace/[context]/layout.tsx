import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { requireWorkspaceContext } from "@/domains/workspace/access";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { countUnreadNotifications } from "@/domains/notifications/data";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ context: string }>;
};

/**
 * Protected shell layout for a workspace context.
 *
 * Authorization happens here, server-side: the session is resolved, the
 * caller's owned workspace is loaded, and the requested Brand/Artist context
 * is verified against the database. The URL segment alone grants nothing.
 * Unknown contexts 404 rather than rendering an empty shell.
 */
export default async function WorkspaceContextLayout({
  children,
  params,
}: LayoutProps) {
  const { context } = await params;

  if (context !== "brand" && context !== "artist") {
    notFound();
  }

  const access = await requireWorkspaceContext(context, `/workspace/${context}`);

  // The unread marker is part of the shell, so the count is resolved once here
  // for the current context. It is scoped to the session-derived user, owned
  // workspace and context exactly like the list itself (spec §20.2), so it can
  // never show another customer's notifications, and it is a real database
  // count — never a fabricated number.
  const unreadNotifications = await countUnreadNotifications(access, context);

  return (
    <WorkspaceShell context={context} unreadNotifications={unreadNotifications}>
      {children}
    </WorkspaceShell>
  );
}