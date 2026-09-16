/**
 * Storage key utilities for KeedoHub's secure asset storage layer.
 *
 * Every stored asset is addressed by a provider-scoped key that is derived
 * from the workspace, resource type, and stable identifier. These helpers
 * build keys that are safe to use as object/key names in the underlying
 * storage backend (local filesystem paths or S3 object keys).
 */

/**
 * Build a storage key for an asset belonging to a deliverable.
 *
 * The key is deterministic given its inputs, so the same asset can be
 * addressed consistently by the local provider, the S3 provider, and any
 * future provider without coordination.
 *
 * Format (underscores are safe for both S3 keys and filesystem paths):
 *   `{workspaceSlug}/assets/{deliverableId}/{assetId}`
 */
export function getStorageKey(
  /** Stable, URL-safe workspace identifier. Already validated by callers. */
  workspaceSlug: string,
  /** UUID v4 of the deliverable that owns this asset. */
  deliverableId: string,
  /** UUID v4 of the asset. */
  assetId: string,
): string {
  return `${workspaceSlug}/assets/${deliverableId}/${assetId}`;
}
