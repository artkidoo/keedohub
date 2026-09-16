/**
 * Profile data access for KeedoHub.
 *
 * Scope-first by design (spec §20.2): every function takes the workspace as an
 * explicit parameter, and there is no "read or write by id alone" path. A
 * profile id is ever only an additional filter inside a workspace the caller
 * has already been proven to own — so an identifier belonging to somebody
 * else matches nothing.
 *
 * Authorization is resolved by the caller through the workspace boundary in
 * `@/domains/workspace/access`; this module never trusts anything that
 * arrived from the client.
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { artistProfile, brandProfile } from "@/lib/db/schema";
import type { ArtistProfile, BrandProfile } from "@/lib/db/schema";
import type { ArtistProfileWrite, BrandProfileWrite } from "./fields";

/** The Brand profile of a workspace, or undefined when it has none. */
export async function getBrandProfileForWorkspace(
  workspaceId: string,
): Promise<BrandProfile | undefined> {
  const db = getDb();
  return db.query.brandProfile.findFirst({
    where: (table, { eq: equals }) => equals(table.workspaceId, workspaceId),
  });
}

/** The Artist profile of a workspace, or undefined when it has none. */
export async function getArtistProfileForWorkspace(
  workspaceId: string,
): Promise<ArtistProfile | undefined> {
  const db = getDb();
  return db.query.artistProfile.findFirst({
    where: (table, { eq: equals }) => equals(table.workspaceId, workspaceId),
  });
}

export type ProfileUpdateScope = {
  /** The caller's workspace, resolved from the session — never from input. */
  workspaceId: string;
  /** The profile being edited. Only ever matches inside `workspaceId`. */
  profileId: string;
};

/**
 * Write a Brand profile.
 *
 * @returns the stored row, or `undefined` when no profile in the caller's
 *   workspace has that id (which is also the answer for another customer's
 *   profile, so a cross-workspace attempt cannot be distinguished from a
 *   missing one).
 */
export async function updateBrandProfileForWorkspace(
  scope: ProfileUpdateScope,
  values: BrandProfileWrite,
): Promise<BrandProfile | undefined> {
  const db = getDb();
  const updated = await db
    .update(brandProfile)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(
        eq(brandProfile.id, scope.profileId),
        eq(brandProfile.workspaceId, scope.workspaceId),
      ),
    )
    .returning();

  return updated[0];
}

/** Write an Artist profile. Same contract as the Brand profile. */
export async function updateArtistProfileForWorkspace(
  scope: ProfileUpdateScope,
  values: ArtistProfileWrite,
): Promise<ArtistProfile | undefined> {
  const db = getDb();
  const updated = await db
    .update(artistProfile)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(
        eq(artistProfile.id, scope.profileId),
        eq(artistProfile.workspaceId, scope.workspaceId),
      ),
    )
    .returning();

  return updated[0];
}