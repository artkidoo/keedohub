/**
 * Server-side storage startup for KeedoHub (Phase 5.2A).
 *
 * Called once from `instrumentation.ts` (`register()`), which Next runs
 * before any route handles traffic. Reads only server-side environment
 * variables — nothing here is reachable from a client component, and nothing
 * logs secret material.
 *
 * Rules:
 *   - `STORAGE_PROVIDER=local` (or unset outside production): configure the
 *     local provider from `STORAGE_LOCAL_BASE_DIR`. Unchanged dev behaviour.
 *   - `STORAGE_PROVIDER=s3`: every S3 variable is required; a missing value
 *     throws a `ConfigurationError` that fails startup loudly. There is
 *     deliberately NO fallback to local disk — silently writing production
 *     files to ephemeral disk would lose customer work.
 */

import { configurationError } from "./errors";
import { configureLocalProvider } from "./local-provider";
import { createS3RestClient } from "./s3-client";
import { configureS3Provider } from "./s3-provider";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw configurationError(
      `Storage is misconfigured: ${name} is required when STORAGE_PROVIDER=s3.`,
    );
  }
  return value;
}

/**
 * Validate storage environment and configure the selected provider.
 * Idempotent: safe to call once per server start (and in tests with env set).
 */
export function initStorageFromEnv(): void {
  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();

  if (provider === "s3") {
    const bucket = required("S3_BUCKET");
    const region = required("S3_REGION");
    const endpoint = required("S3_ENDPOINT");
    const accessKeyId = required("S3_ACCESS_KEY_ID");
    const secretAccessKey = required("S3_SECRET_ACCESS_KEY");
    const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? "").toLowerCase() === "true";

    configureS3Provider({
      bucket,
      client: createS3RestClient({ bucket, region, endpoint, accessKeyId, secretAccessKey, forcePathStyle }),
    });
    return;
  }

  if (provider !== "local") {
    throw configurationError(
      `Storage is misconfigured: STORAGE_PROVIDER must be "local" or "s3", got ${JSON.stringify(provider)}.`,
    );
  }

  // Local development behaviour is unchanged: the provider lazily reads
  // STORAGE_LOCAL_BASE_DIR on first use, but configuring eagerly here fails
  // fast on a bad path instead of on the first upload.
  if (process.env.STORAGE_LOCAL_BASE_DIR) {
    configureLocalProvider(process.env.STORAGE_LOCAL_BASE_DIR);
  }
}
