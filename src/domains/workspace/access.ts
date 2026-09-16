import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/domains/auth/session";
import { getDb } from "@/lib/db";
import type {
  ArtistProfile,
  BrandProfile,
  Workspace,
} from "@/lib/db/schema";

/**
 * Workspace authorization boundary.
 *
 * Every protected server entry point resolves:
 *   authenticated user → owned workspace → requested context
 * The URL is never treated as authorization; ownership is always verified
 * against the database (spec §5, §19, §20).
 */

export type WorkspaceAccess = {
  user: Awaited<ReturnType<typeof requireUser>>;
  workspace: Workspace;
};

/**
 * Require an authenticated user and their owned workspace.
 * Users without a workspace (an inconsistent state) are redirected to login
 * rather than shown an empty shell.
 */
export async function requireWorkspace(
  returnTo?: string,
): Promise<WorkspaceAccess> {
  const user = await requireUser(returnTo);
  const db = getDb();

  const ws = await db.query.workspace.findFirst({
    where: (table, { eq }) => eq(table.userId, user.id),
  });

  if (!ws) {
    // The workspace is provisioned at signup; reaching this point means data
    // was removed behind the app's back. Fail closed.
    redirect("/login");
  }

  return { user, workspace: ws };
}

export type WorkspaceContextAccess = WorkspaceAccess & {
  brandProfile: BrandProfile | undefined;
  artistProfile: ArtistProfile | undefined;
};

/**
 * Require workspace access AND the requested Brand/Artist context.
 *
 * @param context the workspace context segment from the URL
 * @returns the verified access triple, or a 404 when the context does not
 *   belong to the caller's workspace (never a 403 that reveals existence).
 */
export async function requireWorkspaceContext(
  context: string,
  returnTo?: string,
): Promise<WorkspaceContextAccess> {
  if (context !== "brand" && context !== "artist") {
    // Unknown contexts are not workspace routes at all.
    notFound();
  }

  const access = await requireWorkspace(returnTo);
  const db = getDb();

  const brand = await db.query.brandProfile.findFirst({
    where: (table, { eq }) => eq(table.workspaceId, access.workspace.id),
  });
  const artist = await db.query.artistProfile.findFirst({
    where: (table, { eq }) => eq(table.workspaceId, access.workspace.id),
  });

  if (context === "brand" && !brand) {
    notFound();
  }
  if (context === "artist" && !artist) {
    notFound();
  }

  return { ...access, brandProfile: brand, artistProfile: artist };
}
