/**
 * The production checklist (Phase 4.3, spec §9).
 *
 * A small, honest aid to production — not a project-management system. It exists
 * so an operator working a job can see, at a glance, what they have already made
 * sure of and what they have not. Nothing about a checklist item changes the job's
 * lifecycle state or the QA gate; those are owned elsewhere and are never here.
 *
 * Two ideas keep this tiny and safe:
 *
 *   1. A checklist is a *template* — a fixed, ordered set of items — derived from
 *      the shared items every job shares plus the extras the job's production
 *      type adds (see production-types). The template is computed, never stored,
 *      so changing the set of items for a type never requires a migration and
 *      never leaves stale rows behind.
 *   2. The only state stored is *which item keys are checked*, as a set. A key
 *      that is no longer part of the template is simply dropped on read, so old
 *      stored state can never resurface a removed item or pad the screen.
 *
 * State lives inside `production_job.brief` (a small structured blob), which is
 * exactly what the column is documented for ("structured production instructions
 * assembled during briefing"). No new table, no new column (spec §28).
 *
 * Pure and Zod-validated: the reducer and the persistence schema are unit-testable
 * with no database. The caller decides what to do with the result; this module
 * never trusts or writes production state on its own.
 */

import { z } from "zod";

import { productionProfileFor, type ProductionTypeValue } from "./production-types";

/** One checklist item. Internal wording: this is the operator's own surface. */
export type ChecklistItem = {
  key: string;
  label: string;
};

/** The items every production job shares, regardless of type (spec §9). */
const SHARED_ITEMS: readonly ChecklistItem[] = [
  { key: "brief_reviewed", label: "Brief reviewed" },
  { key: "references_reviewed", label: "Customer references reviewed" },
  { key: "context_reviewed", label: "Brand / Artist context reviewed" },
  { key: "dimensions_confirmed", label: "Dimensions confirmed" },
  { key: "composition_complete", label: "Primary composition complete" },
  { key: "visual_qa_complete", label: "Visual QA complete" },
  { key: "export_checked", label: "Export checked" },
  { key: "deliverable_ready", label: "Deliverable ready for internal QA" },
];

/** Human labels for the type-specific extras declared in production-types. */
const EXTRA_LABELS: Record<string, string> = {
  page_format_confirmed: "Page / output format confirmed",
  proofread_complete: "Copy proofread",
  slide_flow_reviewed: "Slide flow reviewed",
  copy_checked: "Copy confirmed",
  duration_confirmed: "Duration confirmed",
};

/**
 * The checklist template for one production type: the shared items followed by the
 * type's extras, in a stable order, de-duplicated. Extras whose label is unknown
 * are skipped so a typo in the profile can never render a raw snake_case key.
 */
export function checklistTemplate(type: ProductionTypeValue): ChecklistItem[] {
  const extras = productionProfileFor(type)
    .extraChecklist.map((key) => ({ key, label: EXTRA_LABELS[key] }))
    .filter((item): item is ChecklistItem => Boolean(item.label));

  const seen = new Set<string>();
  const items: ChecklistItem[] = [];
  for (const item of [...SHARED_ITEMS, ...extras]) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    items.push(item);
  }
  return items;
}

/** The stored shape: the set of checked item keys, de-duplicated and ordered. */
export type ChecklistState = readonly string[];

/** Which of a template's items are checked, and how many in total. */
export type ChecklistProgress = {
  items: (ChecklistItem & { checked: boolean })[];
  checkedCount: number;
  totalCount: number;
  complete: boolean;
};

/**
 * Project a stored checklist state onto a template. Only keys present in the
 * template are shown; unknown stored keys are dropped, and a key checked but
 * later removed from the template cannot reappear (spec §9 — no pad, no drift).
 */
export function checklistProgress(
  type: ProductionTypeValue,
  state: ChecklistState,
): ChecklistProgress {
  const checked = new Set(state);
  const items = checklistTemplate(type).map((item) => ({
    ...item,
    checked: checked.has(item.key),
  }));
  const checkedCount = items.filter((item) => item.checked).length;
  return {
    items,
    checkedCount,
    totalCount: items.length,
    complete: items.length > 0 && checkedCount === items.length,
  };
}

/**
 * Toggle one checklist key, returning the new stored state. Only keys that belong
 * to this type's template may be toggled — a key outside it is ignored, keeping
 * stored state bounded to the real template. The result is rebuilt in template
 * order so the stored set is canonical rather than insertion-ordered.
 */
export function toggleChecklist(
  type: ProductionTypeValue,
  state: ChecklistState,
  key: string,
  checked: boolean,
): string[] {
  const template = checklistTemplate(type).map((item) => item.key);
  if (!template.includes(key)) return [...state];

  const set = new Set(state);
  if (checked) set.add(key);
  else set.delete(key);

  return template.filter((item) => set.has(item));
}

/** The keys a checklist for this type may legitimately store. */
export function checklistKeysFor(type: ProductionTypeValue): string[] {
  return checklistTemplate(type).map((item) => item.key);
}

/** Whether `key` is a legal checklist key for this production type. */
export function isChecklistKey(type: ProductionTypeValue, key: string): boolean {
  return checklistKeysFor(type).includes(key);
}

/**
 * Validation for the checklist as it is submitted: an array of non-empty
 * strings. `.strict()`-style leniency is deliberately absent — anything
 * malformed (not an array, a non-string entry, a blank entry) fails, and the
 * caller falls back to empty rather than storing garbage.
 */
export const checklistStateSchema = z
  .array(z.string().trim().min(1).max(64))
  .max(64);

/**
 * Parse a checklist blob *read back* from the database.
 *
 * Stored state is data we did not just validate, so it is treated more kindly
 * than submitted state: an unusable entry (a number, a blank string) is dropped
 * rather than throwing the whole checklist away, and the result is de-duplicated
 * and re-validated. If even the cleaned list is not a legal checklist — more than
 * 64 entries, say — the honest answer is an empty checklist, not a partial one.
 */
export function parseChecklistState(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const cleaned = value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );

  const parsed = checklistStateSchema.safeParse(cleaned);
  return parsed.success ? Array.from(new Set(parsed.data)) : [];
}

