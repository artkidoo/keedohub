/**
 * KeedoHub identifier validation.
 *
 * All public identifiers (user IDs, workspace slugs, etc.) are validated here
 * so that callers never need to import Zod themselves.
 */

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns `true` when `value` is a well-formed UUID v4 string.
 *
 * UUID v4 is used for all auto-generated primary keys in this project.
 */
export function isValidUUIDv4(value: unknown): value is string {
  return typeof value === "string" && UUID_V4_RE.test(value);
}

/**
 * Asserts that `value` is a valid UUID v4 string.
 *
 * Throws when it is not. Intended for server-side guards where a bad ID
 * should fail loudly rather than being silently treated as a lookup miss.
 */
export function assertValidUUIDv4(value: unknown): asserts value is string {
  if (!isValidUUIDv4(value)) {
    throw new Error(`Expected a UUID v4 string, got ${JSON.stringify(value)}`);
  }
}
