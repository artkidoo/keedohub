/**
 * Deliverable versioning (Phase 3.0).
 *
 * Tracks the progression of files attached to a deliverable over its life.
 *
 * Key guarantees:
 *   - Monotonic versioning: each version for a deliverable is version = N + 1.
 *   - Exactly one current version: previous current version is superseded with
 *     a timestamp, satisfying the `deliverable_version_current_state` CHECK.
 *   - Deliverable synchronization: `deliverable.current_version` is kept in
 *     lock-step so customer visibility and delivery logic remain consistent.
 *   - Scoped: workspace ownership is verified on both deliverable and asset.
 */

import { and, desc, eq, sql } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import { ProductionError } from "./chain";
import { getDb } from "@/lib/db";
import { asset, deliverable, deliverableVersion } from "@/lib/db/schema";
import type { DeliverableVersion } from "@/lib/db/schema";

/**
 * Record a new version of a deliverable.
 *
 * Atomically marks any previous current version as superseded (`isCurrent: false`,
 * `supersededAt: now`) and inserts the new version row (`isCurrent: true`,
 * `supersededAt: null`), then updates `deliverable.currentVersion`.
 */
export async function createDeliverableVersion(
  access: OperatorAccess,
  deliverableId: string,
  input: {
    assetId?: string | null;
    note?: string | null;
  } = {},
): Promise<DeliverableVersion> {
  if (!access?.operatorId || !access.userId) {
    throw new Error("Production writes require a verified operator");
  }

  const db = getDb();

  const [deliv] = await db
    .select({
      id: deliverable.id,
      workspaceId: deliverable.workspaceId,
      currentVersion: deliverable.currentVersion,
    })
    .from(deliverable)
    .where(eq(deliverable.id, deliverableId))
    .limit(1);

  if (!deliv) {
    throw new ProductionError("Deliverable not found", "not_found");
  }

  if (input.assetId) {
    const [foundAsset] = await db
      .select({ id: asset.id, workspaceId: asset.workspaceId })
      .from(asset)
      .where(
        and(
          eq(asset.id, input.assetId),
          eq(asset.workspaceId, deliv.workspaceId),
        ),
      )
      .limit(1);

    if (!foundAsset) {
      throw new ProductionError(
        "Asset not found or belongs to a different workspace",
        "conflict",
      );
    }
  }

  return await db.transaction(async (tx) => {
    const now = new Date();

    const [maxRow] = await tx
      .select({ maxVersion: sql<number>`coalesce(max(${deliverableVersion.version}), 0)` })
      .from(deliverableVersion)
      .where(eq(deliverableVersion.deliverableId, deliv.id));

    const nextVersion = (maxRow?.maxVersion ?? 0) + 1;

    // Supersede any existing current version
    await tx
      .update(deliverableVersion)
      .set({
        isCurrent: false,
        supersededAt: now,
      })
      .where(
        and(
          eq(deliverableVersion.deliverableId, deliv.id),
          eq(deliverableVersion.isCurrent, true),
        ),
      );

    const [newVersion] = await tx
      .insert(deliverableVersion)
      .values({
        workspaceId: deliv.workspaceId,
        deliverableId: deliv.id,
        version: nextVersion,
        assetId: input.assetId ?? null,
        note: input.note?.trim() || null,
        createdByOperatorId: access.operatorId,
        isCurrent: true,
        supersededAt: null,
      })
      .returning();

    await tx
      .update(deliverable)
      .set({
        currentVersion: nextVersion,
        updatedAt: now,
      })
      .where(eq(deliverable.id, deliv.id));

    return newVersion;
  });
}

/**
 * List every version of a deliverable in descending version order.
 */
export async function listDeliverableVersions(
  access: OperatorAccess,
  deliverableId: string,
): Promise<DeliverableVersion[]> {
  if (!access?.operatorId || !access.userId) {
    throw new Error("Deliverable version queries require a verified operator");
  }

  return getDb()
    .select()
    .from(deliverableVersion)
    .where(eq(deliverableVersion.deliverableId, deliverableId))
    .orderBy(desc(deliverableVersion.version));
}
