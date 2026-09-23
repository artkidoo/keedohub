import type { ComponentType } from "react";

/**
 * Presentation helpers for release and asset screens (Checkpoint 2.6).
 *
 * Same customer date style as the rest of the workspace, plus a plain file
 * size. Nothing here reveals storage details.
 */

/** Icon type accepted by these areas' empty states (a Lucide component). */
export type ArtistAreaIcon = ComponentType<{
  "aria-hidden"?: boolean;
  className?: string;
}>;

/** Fixed locale and style so every customer sees the same date format. */
const releaseDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Format a stored release date (`YYYY-MM-DD`) deterministically.
 *
 * The value is a calendar date with no time, so it is formatted in UTC — a
 * local-time conversion could otherwise show the previous day west of UTC.
 * An unexpected value is shown as stored rather than invented.
 */
export function formatReleaseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  return releaseDateFormat.format(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))),
  );
}

/** Customer-friendly file size, or null when the record has none. */
export function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} bytes`;

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}
