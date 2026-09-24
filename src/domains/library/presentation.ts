/**
 * Customer-facing Library vocabulary and presentation helpers
 * (Checkpoint 2.7). Customer language only — no internal production terms,
 * no fabricated copy. `formatFileSize` is UTC-safe and shared with the
 * artist asset surface (2.6) by deliberate reuse.
 */

import type { AssetCategory } from "@/lib/db/schema";

/** Page copy, per context. Deliberately short and plain. */
export const libraryCopy = {
  brand: {
    eyebrow: "Your library",
    title: "My Library",
    description:
      "Every finished file KeedoHub has delivered to your brand, ready to download and use.",
    emptyTitle: "No delivered files yet",
    emptyDescription:
      "When KeedoHub finishes and delivers creative work for your brand, the finished files will appear here, ready to download and use.",
  },
  artist: {
    eyebrow: "Your library",
    title: "My Library",
    description:
      "Every finished file KeedoHub has delivered to you, ready to download and use.",
    emptyTitle: "No delivered files yet",
    emptyDescription:
      "When KeedoHub finishes and delivers creative work for you, the finished files will appear here, ready to download and use.",
  },
} as const;

/** Customer labels for the asset categories a delivered file can carry. */
const categoryLabels: Record<AssetCategory, string> = {
  reference: "Reference",
  identity: "Brand",
  source: "Source",
  delivered: "Delivered file",
  library: "Creative file",
};

/**
 * A library file's customer-facing category. Delivered files are the only
 * ones that reach this surface, so `delivered`/`library` are the real cases;
 * the rest are mapped defensively rather than rendered as raw enum values.
 */
export function libraryCategoryLabel(category: AssetCategory): string {
  return categoryLabels[category] ?? "Creative file";
}

/**
 * The customer-facing kind of work a file belongs to, derived from the
 * deliverable type. Keeps internal type keys out of the UI.
 */
export function libraryWorkKindLabel(type: string): string {
  const key = type.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (!key) return "Creative work";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** UTC-stable day formatting (no timezone drift between server and client). */
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatLibraryDate(value: Date): string {
  return dateFormatter.format(value);
}

/** Human file size; unknown sizes are omitted by the caller. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "";
  }
  if (bytes < 1024) return `${bytes} bytes`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

/** Everything a list row or detail page shows about one file, in one place. */
export function libraryFileMeta(item: {
  version: number;
  sizeBytes: number | null;
  mimeType: string | null;
}) {
  const parts = [`Version ${item.version}`];
  const size = formatFileSize(item.sizeBytes);
  if (size) parts.push(size);
  return parts.join(" · ");
}
