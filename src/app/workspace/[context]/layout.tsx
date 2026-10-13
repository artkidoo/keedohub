import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { requireWorkspaceContext } from "@/domains/workspace/access";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { countUnreadNotifications } from "@/domains/notifications/data";
import { accountTypeOf, workspaceContextsFor } from "@/lib/account-type";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ context: string }>;
};

/**
 * Protected shell layout for a workspace context.
 *
 * Authorization happens here, server-side: the session is resolved, the
 * caller's owned workspace is loaded, and the requested Brand/Artist context
 * is verified against the database — first against the workspace's account
 * type, then against context-profile ownership. The URL segment alone grants
 * nothing. Unknown or unauthorised contexts 404 rather than rendering an
 * empty shell.
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

  // The customer's own contexts — resolved from the workspace row, so the
  // navigation can never offer a workspace the server would refuse.
  const contexts = workspaceContextsFor(accountTypeOf(access.workspace));

  // The unread marker is part of the shell, so the count is resolved once here
  // for the current context. It is scoped to the session-derived user, owned
  // workspace and context exactly like the list itself (spec §20.2), so it can
  // never show another customer's notifications, and it is a real database
  // count — never a fabricated number.
  const unreadNotifications = await countUnreadNotifications(access, context);

  return (
    <WorkspaceShell
      context={context}
      contexts={contexts}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </WorkspaceShell>
  );
}