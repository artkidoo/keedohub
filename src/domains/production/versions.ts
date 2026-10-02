/**
 * Deliverable versioning (Phase 3.1).
 *
 * Tracks the progression of files attached to a deliverable over its life,
 * building on the Phase 3.0 version foundation.
 *
 * Key guarantees:
 *   - Monotonic versioning: each version for a deliverable is version = N + 1.
 *   - Exactly one current version: previous current version is superseded with
 *     a timestamp, satisfying the `deliverable_version_current_state` CHECK.
 *   - Deliverable synchronization: `deliverable.current_version` is kept in
 *     lock-step so customer visibility and review logic remain consistent.
 *   - History is kept: a superseded version is stored, never deleted, and any
 *     open review it carried is closed as `superseded` rather than removed
 *     (spec §11.3, §13.3 rule 4, §20.3).
 *   - Scoped: workspace ownership is verified on both deliverable and asset.
 */

import { and, desc, eq, sql } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import { assertOperatorAccess, ProductionError, refuseMalformedId } from "./errors";
import { supersedeOpenReviews } from "./review";
import { getDb } from "@/lib/db";
import { asset, deliverable, deliverableVersion, productionJob } from "@/lib/db/schema";
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
  assertOperatorAccess(access);
  refuseMalformedId(deliverableId, "Deliverable");

  const db = getDb();

  const [deliv] = await db
    .select({
      id: deliverable.id,
      workspaceId: deliverable.workspaceId,
      jobId: deliverable.jobId,
      currentVersion: deliverable.currentVersion,
    })
    .from(deliverable)
    .where(eq(deliverable.id, deliverableId))
    .limit(1);

  if (!deliv) {
    throw new ProductionError("Deliverable not found", "not_found");
  }

  // New work is produced in production, not while the customer is looking at a
  // version they have not decided on. Refusing here keeps a released version
  // stable: replacing the file underneath an open review would silently answer a
  // question the customer is still asking (spec §13.1, §11.3).
  //
  // Delivered work is stronger still: it is immutable for good, and a later
  // change is new work on a new job, never a new version of this one
  // (spec §14.2 rule 3, §12.3 rule 1).
  const [job] = await db
    .select({ status: productionJob.status })
    .from(productionJob)
    .where(eq(productionJob.id, deliv.jobId))
    .limit(1);

  if (job?.status === "customer_review") {
    throw new ProductionError(
      "This work is with the customer for review; a new version can only be produced after the review is decided",
      "conflict",
    );
  }

  if (job?.status === "delivered") {
    throw new ProductionError(
      "This work has been delivered and its record is permanent; new work is a new job",
      "conflict",
    );
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

    // Lock the deliverable row for the life of this transaction. Version
    // numbers are derived from `max(version) + 1`, so two producers working on
    // the same deliverable at the same moment would otherwise compute the same
    // number and one would fail on the unique index below (spec §11.3, §12.3).
    // Serialising here makes the second writer read the first writer's number
    // and carry on; nothing about the caller's state machine changes, and no
    // UI disabling is involved.
    const [locked] = await tx
      .select({ id: deliverable.id })
      .from(deliverable)
      .where(eq(deliverable.id, deliv.id))
      .limit(1)
      .for("update");

    if (!locked) {
      throw new ProductionError("Deliverable not found", "not_found");
    }

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
 * Close the reviews that the new version has overtaken.
 *
 * Called by the write path that creates a new version, outside the transaction
 * so the review rows and the version rows cannot deadlock each other. Reviews
 * the customer already decided on are never touched: only an open review of an
 * older version is closed, and it is kept as history (spec §20.3).
 */
export async function retireReviewsOvertakenBy(
  deliverableId: string,
  currentVersion: number,
): Promise<number> {
  return supersedeOpenReviews(deliverableId, currentVersion);
}

/**
 * List every version of a deliverable in descending version order.
 */
export async function listDeliverableVersions(
  access: OperatorAccess,
  deliverableId: string,
): Promise<DeliverableVersion[]> {
  assertOperatorAccess(access);
  refuseMalformedId(deliverableId, "Deliverable");

  return getDb()
    .select()
    .from(deliverableVersion)
    .where(eq(deliverableVersion.deliverableId, deliverableId))
    .orderBy(desc(deliverableVersion.version));
}
