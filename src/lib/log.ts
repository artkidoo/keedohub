/**
 * Server-side error logging (Phase 5.2B).
 *
 * `console.error` with a raw error is a leak waiting to happen: ORM and SDK
 * errors can carry connection strings, signed URLs, file bytes or customer
 * content. Every server catch site should log through here instead — it keeps
 * the human-readable message and the error name, and drops everything else.
 */

type LogContext = Record<string, string | number | boolean | null | undefined>;

/** Log an error safely: message + name + explicit context, never the raw error. */
export function logServerError(message: string, error: unknown, context: LogContext = {}): void {
  const name = error instanceof Error ? error.name : typeof error;
  const detail = error instanceof Error ? error.message : String(error ?? "");
  // Redact anything shaped like a secret, URL, token or filesystem path.
  const safe = detail
    .replace(/[A-Za-z0-9+/=]{24,}/g, "[redacted]")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/\/[^\s"']{8,}/g, "[path]")
    .slice(0, 300);
  console.error(message, { name, detail: safe, ...context });
}
