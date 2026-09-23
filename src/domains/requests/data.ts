/**
 * Request data access for KeedoHub.
 *
 * Scope-first by design (spec §20.2): every function takes the verified
 * workspace access as an explicit parameter, and there is no "read or write
 * by id alone" path. A request id is ever only an additional filter inside a
 * workspace the caller has already been proven to own — so an identifier
 * belonging to somebody else matches nothing.
 *
 * Authorization is resolved by the caller through the workspace boundary in
 * `@/domains/workspace/access`; this module never trusts anything that
 * arrived from the client. The context profile FK is likewise resolved from
 * that access, never from a form field (spec §8, §19).
 */

import { and, desc, eq, isNull } from "drizzle-orm";

import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { getDb } from "@/lib/db";
import { request } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";
import type { RequestWrite } from "./validation";

/**
 * The profile of the requested context — always one of the caller's own
 * profiles, already proven to belong to their workspace.
 *
 * Fails closed on conflicting relationships (same rule as dashboardScope).
 */
function contextProfile(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
) {
  const profile =
    context === "brand" ? access.brandProfile : access.artistProfile;
  if (!profile || profile.workspaceId !== access.workspace.id) {
    throw new Error("Profile unavailable");
  }
  return profile;
}

/**
 * One request belongs to one workspace and exactly one context (spec §8.1):
 * the workspace, the context type, the matching profile FK, and no FK for
 * the other context — matching the database check constraints.
 */
function requestScope(access: WorkspaceContextAccess, context: WorkspaceContext) {
  const profile = contextProfile(access, context);
  return and(
    eq(request.workspaceId, access.workspace.id),
    eq(request.contextType, context),
    eq(
      context === "brand" ? request.brandProfileId : request.artistProfileId,
      profile.id,
    ),
    isNull(
      context === "brand" ? request.artistProfileId : request.brandProfileId,
    ),
  );
}

/** Every request of one context, newest first. Full list, no hidden cap. */
export async function listRequests(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
) {
  return getDb()
    .select({
      id: request.id,
      title: request.title,
      category: request.category,
      status: request.status,
      createdAt: request.createdAt,
    })
    .from(request)
    .where(requestScope(access, context))
    .orderBy(desc(request.createdAt), desc(request.id));
}

/**
 * One request in full, or null.
 *
 * Null is also the answer for another customer's id and for a request that
 * belongs to the other context of the caller's own workspace — a 404 either
 * way, so existence is never revealed (spec §19.5).
 */
export async function getRequest(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  id: string,
) {
  const [row] = await getDb()
    .select({
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.category,
      requirements: request.requirements,
      referenceLinks: request.referenceLinks,
      status: request.status,
      statusReason: request.statusReason,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    })
    .from(request)
    .where(and(requestScope(access, context), eq(request.id, id)))
    .limit(1);
  return row ?? null;
}

/**
 * Store one request for the caller's own workspace.
 *
 * The workspace id, context type and profile FK all come from the verified
 * access — a submitted workspaceId or profileId field cannot reach this
 * function. Status starts at the database default (`submitted`).
 */
export async function createRequestForContext(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  values: RequestWrite,
) {
  const profile = contextProfile(access, context);

  const [created] = await getDb()
    .insert(request)
    .values({
      workspaceId: access.workspace.id,
      contextType: context,
      ...(context === "brand"
        ? { brandProfileId: profile.id, artistProfileId: null }
        : { artistProfileId: profile.id, brandProfileId: null }),
      title: values.title,
      category: values.category,
      description: values.description,
      requirements: values.requirements,
      referenceLinks: values.referenceLinks,
    })
    .returning();

  return created;
}

/**
 * jsonb columns arrive typed as unknown (they can hold anything, including
 * what the Studio writes later). Keep only the strings this form produced so
 * a customer screen can never render attacker-shaped objects.
 */
export function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}
