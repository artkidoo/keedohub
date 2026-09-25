/**
 * Local filesystem storage provider for KeedoHub assets.
 *
 * Stores assets under a configurable base directory using slug/UUID-based
 * paths. Includes path traversal protection so that callers cannot read or
 * write outside the configured base directory, even if they supply a
 * crafted key.
 *
 * Intended for local development and single-machine deployments. Production
 * deployments should use the S3 provider (see `src/lib/storage/s3-provider.ts`).
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, normalize, relative, isAbsolute, sep } from "node:path";

import {
  StorageError,
  notFound,
  forbidden,
  providerError,
  configurationError,
  unexpectedError,
} from "./errors";

/**
 * Absolute base directory under which all assets are stored.
 *
 * If unset or relative, the provider refuses to start.
 */
let baseDirectory: string | undefined;

/**
 * Configure the base directory for the local provider.
 *
 * Call once at application startup (e.g. in `src/middleware.ts` or a
 * server initialization module). The directory is created if it does not
 * exist.
 */
export function configureLocalProvider(baseDir: string): void {
  const absolute = isAbsolute(baseDir)
    ? baseDir
    : new Error("Local storage base directory must be absolute");

  if (absolute instanceof Error) {
    throw configurationError("Local storage base directory must be absolute", absolute);
  }

  // Normalize the configured base directory to the platform's own form so
  // the containment check in `resolvePath` compares like with like. A config
  // value written with forward slashes (e.g. `C:/data/keedohub`) is a valid
  // absolute path, but it never matches the backslashes Node returns, which
  // would make every read look like an escape attempt.
  baseDirectory = normalize(absolute);

  if (!existsSync(baseDirectory)) {
    mkdirSync(baseDirectory, { recursive: true });
  }
}

/**
 * Ensure the provider has been configured. Throws `ConfigurationError` if
 * not, so that callers fail fast rather than hitting confusing filesystem
 * errors later.
 */
function ensureConfigured(): void {
  // Lazily configure from the environment on first use, matching the
  // setup documented in `.env.example` (STORAGE_LOCAL_BASE_DIR). This keeps
  // module import side-effect free while making the provider usable in the
  // running app without a dedicated startup call site.
  if (!baseDirectory) {
    const configured = process.env.STORAGE_LOCAL_BASE_DIR;
    if (configured) {
      configureLocalProvider(configured);
      return;
    }
  }
  if (!baseDirectory) {
    throw configurationError(
      "Local storage provider has not been configured. Call configureLocalProvider(baseDir) at startup.",
    );
  }
}

/**
 * Resolve a storage key to an absolute filesystem path within the base
 * directory, rejecting paths that would escape the base directory.
 */
function resolvePath(key: string): string {
  ensureConfigured();

  // Normalize to remove `..`, `//`, and platform-specific quirks, then
  // verify the result lives under the base directory.
  const normalized = normalize(key);
  const absolute = join(baseDirectory!, normalized);
  const resolved = normalize(absolute);
  const relativeToBase = relative(baseDirectory!, resolved);

  if (
    relativeToBase.startsWith("..") ||
    isAbsolute(relativeToBase) ||
    !resolved.startsWith(baseDirectory! + sep)
  ) {
    throw forbidden(`Storage key '${key}' attempts to escape the base directory`);
  }

  return resolved;
}

/**
 * Read an asset from local storage.
 */
export function localRead(key: string): Buffer {
  try {
    const path = resolvePath(key);
    if (!existsSync(path)) {
      throw notFound(`Asset not found: ${key}`);
    }
    return readFileSync(path);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw unexpectedError(`Failed to read asset '${key}'`, error);
  }
}

/**
 * Write an asset to local storage. The parent directory is created if
 * needed.
 */
export function localWrite(key: string, data: Buffer | Uint8Array): void {
  try {
    const path = resolvePath(key);
    const dir = join(path, "..");

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(path, data);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw providerError(`Failed to write asset '${key}'`, error);
  }
}

/**
 * Delete an asset from local storage. No error is thrown if the asset does
 * not exist (idempotent delete).
 */
export function localDelete(key: string): void {
  try {
    const path = resolvePath(key);
    if (existsSync(path)) {
      // In a real implementation, consider recursive deletion for
      // multi-file assets. Here we keep it simple and delete the single
      // target.
      unlinkSync(path);
    }
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw unexpectedError(`Failed to delete asset '${key}'`, error);
  }
}

/**
 * Check whether an asset exists in local storage.
 */
export function localExists(key: string): boolean {
  try {
    const path = resolvePath(key);
    return existsSync(path);
  } catch {
    return false;
  }
}
