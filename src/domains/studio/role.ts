/**
 * Studio membership roles for KeedoHub workspaces.
 *
 * Defines the roles that a user can have in a studio workspace:
 * - `owner` — full control over the workspace and its assets
 * - `member` — can create and manage work within the workspace
 * - `viewer` — read-only access to workspace content
 *
 * Roles are used by the permissions layer (see `src/domains/permissions/server.ts`)
 * to determine what actions a user can perform.
 */

/**
 * The role of a user within a studio workspace.
 */
export type StudioRole = "owner" | "member" | "viewer";

/**
 * Whether the given role is the workspace owner.
 */
export function isOwner(role: StudioRole): boolean {
  return role === "owner";
}

/**
 * Whether the given role can create and manage work (requests, projects,
 * jobs, deliverables) within the workspace.
 */
export function isContributor(role: StudioRole): boolean {
  return role === "owner" || role === "member";
}

/**
 * Whether the given role has any access at all to the workspace.
 */
export function hasAnyAccess(role: StudioRole): boolean {
  // Every recognised role (owner, member, viewer) has *some* level of
  // access to the workspace — viewers have read-only access, which still
  // counts as "any access" for gating UI visibility and read endpoints.
  return role === "owner" || role === "member" || role === "viewer";
}
