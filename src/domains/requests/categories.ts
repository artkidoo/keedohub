/**
 * Customer-facing request categories (spec §8.2).
 *
 * The database stores the `value` (stable, snake_case, extensible); the
 * customer only ever sees the `label`. Each context offers the categories
 * that make sense for it — a Brand does not ask for cover artwork, an
 * Artist does not ask for a brand asset.
 */

import type { WorkspaceContext } from "@/lib/navigation";

export type RequestCategory = {
  /** Value stored in `request.category`. */
  value: string;
  /** Customer-facing label. */
  label: string;
};

const brandRequestCategories: RequestCategory[] = [
  { value: "document", label: "Document" },
  { value: "marketing_assets", label: "Marketing assets" },
  { value: "social_content", label: "Social content" },
  { value: "presentation", label: "Presentation" },
  { value: "brand_asset", label: "Brand asset" },
  { value: "new_project", label: "New project" },
  { value: "other", label: "Other" },
];

const artistRequestCategories: RequestCategory[] = [
  { value: "cover_artwork", label: "Cover artwork" },
  { value: "release_assets", label: "Release assets" },
  { value: "social_content", label: "Social content" },
  { value: "motion", label: "Motion" },
  { value: "lyric_content", label: "Lyric content" },
  { value: "epk", label: "EPK" },
  { value: "press_materials", label: "Press materials" },
  { value: "promotional_creative", label: "Promotional creative" },
  { value: "other", label: "Other" },
];

/** Categories offered in one context of the workspace. */
export function requestCategoriesFor(
  context: WorkspaceContext,
): RequestCategory[] {
  return context === "brand" ? brandRequestCategories : artistRequestCategories;
}

/**
 * Whether `value` may be stored for this context.
 *
 * Used by server-side validation, so a category belonging to the other
 * context (or invented by a client) is refused before anything is written.
 */
export function isRequestCategory(
  context: WorkspaceContext,
  value: string,
): boolean {
  return requestCategoriesFor(context).some(
    (category) => category.value === value,
  );
}

/**
 * Label for a stored category. Unknown values — anything written outside
 * this form — are humanised rather than hidden, so no request ever renders
 * as a raw snake_case string on a customer screen.
 */
export function requestCategoryLabel(
  context: WorkspaceContext,
  value: string,
): string {
  const match = requestCategoriesFor(context).find(
    (category) => category.value === value,
  );
  if (match) return match.label;

  const words = value.replace(/_/g, " ").trim();
  return words
    ? `${words.charAt(0).toUpperCase()}${words.slice(1)}`
    : "Other";
}
