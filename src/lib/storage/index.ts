/**
 * Secure asset storage layer for KeedoHub.
 *
 * Public entrypoint for the storage subsystem. Exposes:
 *   - `StorageProvider` — the async interface apps and routes use to read,
 *     write, and delete assets.
 *   - `createStorageProvider()` — a factory that returns either a local or
 *     S3 provider based on runtime configuration.
 *   - Re-exports for the underlying error types and key helpers.
 *
 * Every asset is addressed by a deterministic key of the form:
 *   `{workspaceSlug}/assets/{deliverableId}/{assetId}`
 * built by `getStorageKey` (see `src/lib/storage/key.ts`).
 */

import { getStorageKey } from "./key";
import {
  localRead,
  localWrite,
  localDelete,
  localExists,
} from "./local-provider";
import {
  s3Read,
  s3Write,
  s3Delete,
  s3Exists,
} from "./s3-provider";

export type { StorageErrorKind } from "./errors";
export {
  notFound,
  forbidden,
  providerError,
  configurationError,
  unexpectedError,
  StorageError,
} from "./errors";
export { getStorageKey } from "./key";
export {
  configureLocalProvider,
  localRead,
  localWrite,
  localDelete,
  localExists,
} from "./local-provider";
export type { S3Client, S3ProviderConfig } from "./s3-provider";
export {
  configureS3Provider,
  s3Read,
  s3Write,
  s3Delete,
  s3Exists,
} from "./s3-provider";

/**
 * Async storage interface that all providers satisfy.
 *
 * The interface is async even though the local provider is synchronous, so
 * that call sites do not depend on which provider is in use and future
 * providers (remote, hybrid, etc.) can be introduced without changing
 * calling code.
 */
export interface StorageProvider {
  /**
   * Read an asset's bytes.
   *
   * Throws `StorageError` (kind `NotFound` / `Forbidden` / etc.) on failure.
   */
  read(key: string): Promise<Buffer>;

  /**
   * Write bytes as an asset.
   */
  write(key: string, data: Buffer | Uint8Array): Promise<void>;

  /**
   * Delete an asset. Idempotent: no error when the key does not exist.
   */
  delete(key: string): Promise<void>;

  /**
   * Return `true` when an asset exists at `key`.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Build a storage key from workspace slug, deliverable id, and asset id.
   *
   * Deterministic and provider-agnostic — the same inputs always produce the
   * same key.
   */
  getKey(
    workspaceSlug: string,
    deliverableId: string,
    assetId: string,
  ): string;
}

/**
 * Create a configured storage provider.
 *
 * Behavior is driven by the `STORAGE_PROVIDER` environment variable:
 *   - `"local"` (or unset in development) → local filesystem provider
 *   - `"s3"` → S3-compatible provider (requires S3 provider to be configured
 *     via `configureS3Provider` at startup)
 *
 * Call this once during server initialization and share the returned
 * provider across routes and server utilities.
 */
export function createStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();

  if (provider === "s3") {
    return createS3Provider();
  }

  return createLocalProvider();
}

function createLocalProvider(): StorageProvider {
  return {
    async read(key) {
      return localRead(key);
    },
    async write(key, data) {
      localWrite(key, data);
    },
    async delete(key) {
      localDelete(key);
    },
    async exists(key) {
      return localExists(key);
    },
    getKey: getStorageKey,
  };
}

function createS3Provider(): StorageProvider {
  return {
    async read(key) {
      return s3Read(key);
    },
    async write(key, data) {
      return s3Write(key, data);
    },
    async delete(key) {
      return s3Delete(key);
    },
    async exists(key) {
      return s3Exists(key);
    },
    getKey: getStorageKey,
  };
}
