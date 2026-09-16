/**
 * Validate a post-auth redirect target.
 *
 * Only same-origin, absolute-looking paths are allowed. Protocol-relative
 * URLs, foreign origins, and non-path values fall back to the workspace root,
 * so `?next=` can never become an open redirect.
 */
export function safeNextPath(value: string | undefined): string {
  const fallback = "/workspace";

  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.includes("://")) return fallback;

  return value;
}
