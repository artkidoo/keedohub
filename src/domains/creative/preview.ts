/**
 * Operator-scoped asset resolution for the Studio preview route
 * (Phase 4.3, spec §11, §12, §22).
 *
 * The production workspace must let an operator *see* what they uploaded, and
 * that requires serving bytes. Two things make that safe:
 *
 *   1. The reader is internal. This module requires a proven operator, and the
 *      route that uses it re-authorises on every request; a customer never
 *      reaches it, and an anonymous caller is refused before any query.
 *   2. The identifier is resolved to a row, never to a path. An asset id is
 *      turned into the workspace, deliverable and storage key it actually
 *      belongs to — read from the database — so a submitted id cannot name a
 *      file outside the record it belongs to. The storage key is returned to
 *      the route for reading only and is never handed to a client.
 *
 * A malformed id, an unknown id and an asset with no resolvable storage location
 * all answer the same way (null), so an operator cannot use this read to probe
 * for records.
 */

import { eq } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { assertOperatorAccess, isRealId } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import { asset, deliverable, workspace } from "@/lib/db/schema";
import { getStorageKey } from "@/lib/storage";

/** Everything the preview route needs to serve one asset, or nothing. */
export type PreviewAsset = {
  id: string;
  filename: string;
  /** The stored mime type. Treated as a hint, never as proof (§11). */
  mimeType: string | null;
  sizeBytes: number | null;
  category: string;
  customerVisible: boolean;
  /** The deliverable this asset is a version of; always present here. */
  deliverableId: string;
  /** Where the bytes actually live. Server-side only; never serialised. */
  storageKey: string;
};

/**
 * Resolve one asset for internal preview.
 *
 * Prefers the storage key recorded on the asset row and falls back to the
 * deterministic key the storage layer derives from the workspace slug and the
 * owning deliverable — the same key `produceVersion` wrote. An asset with no
 * deliverable is not previewable through this path (there is nothing to build a
 * key from and nothing to prove the read is for real work), so it answers null
 * rather than guessing a location.
 */
export async function loadAssetForPreview(
  access: OperatorAccess,
  assetId: string,
): Promise<PreviewAsset | null> {
  assertOperatorAccess(access);
  if (!isRealId(assetId)) return null;

  const db = getDb();

  const [row] = await db
    .select({
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      category: asset.category,
      customerVisible: asset.customerVisible,
      storageKey: asset.storageKey,
      deliverableId: asset.deliverableId,
      workspaceId: asset.workspaceId,
    })
    .from(asset)
    .where(eq(asset.id, assetId))
    .limit(1);

  if (!row || !isRealId(row.deliverableId)) return null;

  let key = row.storageKey?.trim() || null;

  if (!key) {
    const [owner] = await db
      .select({ slug: workspace.slug })
      .from(workspace)
      .where(eq(workspace.id, row.workspaceId))
      .limit(1);

    if (owner?.slug) {
      key = getStorageKey(owner.slug, row.deliverableId, row.id);
    }
  }

  if (!key) return null;

  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    category: row.category,
    customerVisible: row.customerVisible,
    deliverableId: row.deliverableId,
    storageKey: key,
  };
}

/**
 * Whether a deliverable still exists, so the route refuses a preview for work
 * that has been removed rather than serving an orphaned file.
 */
export async function deliverableExists(deliverableId: string): Promise<boolean> {
  if (!isRealId(deliverableId)) return false;

  const [row] = await getDb()
    .select({ id: deliverable.id })
    .from(deliverable)
    .where(eq(deliverable.id, deliverableId))
    .limit(1);

  return Boolean(row);
}
