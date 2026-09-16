/**
 * Workspace permission checks for KeedoHub.
 *
 * Utilities that answer "can this authenticated user do X in this workspace?"
 * based on the workspace owner and (when the `studio_membership` table exists)
 * explicit membership roles.
 *
 * Current scope (Phase 1):
 *   - Owner check: resolution against `workspace.userId` via Drizzle.
 *   - Role-based access: reads `studio_membership` when available, falling
 *     back to owner-only semantics until that table is provisioned.
 */

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { workspace } from "@/lib/db/schema";
import { isOwner, isContributor, hasAnyAccess, StudioRole } from "@/domains/studio/role";

/**
 * Whether `userId` is the owner of `workspaceSlug`.
 *
 * Performs a live database lookup against the `workspace` table.
 */
export async function isWorkspaceOwner(
  workspaceSlug: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const row = await db
    .select({ userId: workspace.userId })
    .from(workspace)
    .where(eq(workspace.slug, workspaceSlug))
    .limit(1);

  if (row.length === 0) {
    return false;
  }

  return row[0].userId === userId;
}

/**
 * Look up the caller's role in a workspace.
 *
 * When the `studio_membership` table has been provisioned, this will read
 * the role from that table. Until then, only the workspace owner is
 * recognised — all other authenticated users are treated as having no role.
 *
 * Returns `undefined` when the caller has no recognised role in the workspace.
 */
export async function getWorkspaceRole(
  workspaceSlug: string,
  userId: string,
): Promise<StudioRole | undefined> {
  const owner = await isWorkspaceOwner(workspaceSlug, userId);
  if (owner) {
    return "owner";
  }

  // TODO: read `studio_membership` once the table exists (Phase 1 Step 6).
  // For now, non-owners have no recognised role.
  return undefined;
}

/**
 * Whether `userId` can read content from `workspaceSlug`.
 *
 * Owners always can. When membership roles are available, viewers can read
 * but not write.
 */
export async function canReadWorkspace(
  workspaceSlug: string,
  userId: string,
): Promise<boolean> {
  const role = await getWorkspaceRole(workspaceSlug, userId);
  if (!role) {
    return false;
  }
  // Every recognised role (owner, member, viewer) has some level of access;
  // viewers have read-only access, which counts as "any access" for reads.
  return hasAnyAccess(role);
}

/**
 * Whether `userId` can create and manage work within `workspaceSlug`.
 *
 * Requires owner or member role. Viewers are read-only.
 */
export async function canWriteToWorkspace(
  workspaceSlug: string,
  userId: string,
): Promise<boolean> {
  const role = await getWorkspaceRole(workspaceSlug, userId);
  if (!role) {
    return false;
  }
  return isContributor(role);
}

/**
 * Whether `userId` can delete or otherwise administer `workspaceSlug`.
 *
 * Only the owner can administer the workspace itself.
 */
export async function canAdministerWorkspace(
  workspaceSlug: string,
  userId: string,
): Promise<boolean> {
  const role = await getWorkspaceRole(workspaceSlug, userId);
  if (!role) {
    return false;
  }
  return isOwner(role);
}
