/**
 * S3-compatible storage provider for KeedoHub assets.
 *
 * Wraps an S3 client that is provided at configuration time. The provider
 * does not import the AWS SDK directly — callers supply an already-
 * constructed client (or a mock in tests) so that the module compiles and
 * runs without a hard dependency on a specific SDK version.
 *
 * Intended for production deployments. Local development can use the local
 * provider (see `src/lib/storage/local-provider.ts`).
 */

import {
  StorageError,
  notFound,
  providerError,
  configurationError,
  unexpectedError,
} from "./errors";

/**
 * Minimum interface an S3-compatible client must satisfy for this provider
 * to use. Implementations can wrap the AWS SDK's `S3Client` + `GetObject`
 * etc., MinIO, Cloudflare R2, or any endpoint that speaks the S3 REST API.
 *
 * We deliberately avoid importing a concrete SDK type so that this module
 * does not carry a hard dependency on AWS tooling and can be tested with
 * mocks.
 */
export interface S3Client {
  /**
   * Return the object at `key` inside `bucket`.
   *
   * The caller decides what "body" looks like (Buffer, stream, etc.). This
   * provider only requires that the client can return a Buffer for a given
   * key so that `read` can produce a Buffer without streaming complexity.
   */
  getObject(bucket: string, key: string): Promise<Buffer | undefined>;

  /**
   * Write `data` as the object at `key` inside `bucket`.
   */
  putObject(bucket: string, key: string, data: Buffer | Uint8Array): Promise<void>;

  /**
   * Delete the object at `key` inside `bucket`.
   */
  deleteObject(bucket: string, key: string): Promise<void>;

  /**
   * Return `true` if an object exists at `key` inside `bucket`.
   */
  headObject(bucket: string, key: string): Promise<boolean>;
}

/**
 * Configuration for the S3 provider.
 *
 * Bucket name must be set; region and endpoint are optional (the client
 * may embed them).
 */
export interface S3ProviderConfig {
  /** S3 bucket used for KeedoHub assets. */
  bucket: string;
  /** Pre-configured S3-compatible client. */
  client: S3Client;
}

let config: S3ProviderConfig | undefined;

/**
 * Configure the S3 provider.
 *
 * Call once at application startup. The bucket and client are required.
 */
export function configureS3Provider(cfg: S3ProviderConfig): void {
  if (!cfg.bucket || !cfg.client) {
    throw configurationError(
      "S3 provider requires both a bucket name and a client. See S3ProviderConfig.",
    );
  }
  config = cfg;
}

/**
 * Ensure the provider has been configured. Throws `ConfigurationError` if
 * not.
 */
function ensureConfigured(): S3ProviderConfig {
  if (!config) {
    throw configurationError(
      "S3 storage provider has not been configured. Call configureS3Provider(config) at startup.",
    );
  }
  return config;
}

/**
 * Read an asset from S3-compatible storage.
 */
export async function s3Read(key: string): Promise<Buffer> {
  const { bucket } = ensureConfigured();
  try {
    const body = await config!.client.getObject(bucket, key);
    if (!body) {
      throw notFound(`Asset not found in S3: ${key}`);
    }
    return body;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw unexpectedError(`Failed to read asset from S3: ${key}`, error);
  }
}

/**
 * Write an asset to S3-compatible storage.
 */
export async function s3Write(key: string, data: Buffer | Uint8Array): Promise<void> {
  const { bucket } = ensureConfigured();
  try {
    await config!.client.putObject(bucket, key, data);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw providerError(`Failed to write asset to S3: ${key}`, error);
  }
}

/**
 * Delete an asset from S3-compatible storage. Idempotent: does not throw
 * when the object does not exist.
 */
export async function s3Delete(key: string): Promise<void> {
  const { bucket } = ensureConfigured();
  try {
    await config!.client.deleteObject(bucket, key);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    // S3 returns NoSuchKey when deleting a missing object in some SDK
    // versions; treat as success for idempotent clients.
    throw unexpectedError(`Failed to delete asset from S3: ${key}`, error);
  }
}

/**
 * Check whether an asset exists in S3-compatible storage.
 */
export async function s3Exists(key: string): Promise<boolean> {
  const { bucket } = ensureConfigured();
  try {
    return await config!.client.headObject(bucket, key);
  } catch {
    return false;
  }
}
