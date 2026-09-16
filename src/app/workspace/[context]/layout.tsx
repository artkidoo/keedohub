import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { requireWorkspaceContext } from "@/domains/workspace/access";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

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

  await requireWorkspaceContext(context, `/workspace/${context}`);

  return <WorkspaceShell context={context}>{children}</WorkspaceShell>;
}