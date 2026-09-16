/**
 * Storage error types for KeedoHub's secure asset storage layer.
 *
 * Every storage provider (local, S3, future remote) maps its underlying
 * errors to one of these so that callers can handle them uniformly without
 * depending on provider-specific exception hierarchies.
 */

/**
 * Reasons a storage operation can fail.
 *
 * The kind is stable across providers; the message is human-readable and may
 * include provider-specific detail for logging.
 */
export type StorageErrorKind =
  /** The requested key does not exist in storage. */
  | "NotFound"

  /** The caller is not permitted to access the requested key. */
  | "Forbidden"

  /** The storage backend rejected the write (full, target unwritable, etc.). */
  | "ProviderError"

  /** A client configuration problem (missing keys, bad bucket name, etc.). */
  | "ConfigurationError"

  /** A transient or unexpected failure (network, timeout, unknown error). */
  | "UnexpectedError";

export class StorageError extends Error {
  constructor(
    readonly kind: StorageErrorKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
    // Ensure the stack trace uses the StorageError constructor, not Error.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError);
    }
  }
}

/** Convenience constructors so callers don't have to assemble StorageError by hand. */

export function notFound(
  message?: string,
  cause?: unknown,
): StorageError {
  return new StorageError("NotFound", message ?? "The requested resource was not found", cause);
}

export function forbidden(
  message?: string,
  cause?: unknown,
): StorageError {
  return new StorageError("Forbidden", message ?? "Access to the requested resource is not permitted", cause);
}

export function providerError(
  message = "The storage provider rejected the request",
  cause?: unknown,
): StorageError {
  return new StorageError("ProviderError", message, cause);
}

export function configurationError(
  message = "Storage is misconfigured",
  cause?: unknown,
): StorageError {
  return new StorageError("ConfigurationError", message, cause);
}

export function unexpectedError(
  message = "An unexpected storage error occurred",
  cause?: unknown,
): StorageError {
  return new StorageError("UnexpectedError", message, cause);
}
