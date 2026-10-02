/**
 * Production-type taxonomy for the creative workspace (Phase 4.3, spec §6, §14).
 *
 * KeedoHub already stores what kind of production a job is as an extensible
 * snake_case string (`production_job.production_type`, seeded from the request
 * category the customer chose), and the customer-facing labels for those values
 * already live in `@/domains/requests/categories`. This module does NOT invent a
 * second taxonomy or a second set of labels: it reuses `requestCategoryLabel` for
 * every human-readable name, and adds only the one thing the production workspace
 * needs and nothing else stores — a small, data-driven *profile* per type that
 * says which output fields an operator cares about, what a sensible deliverable
 * type is, and which checklist items go beyond the shared ones.
 *
 * The design is deliberately additive and forgiving: an unknown or newly-added
 * production type is not an error and is never hidden. It falls back to a neutral
 * profile and its label is humanised by the same single-source helper every other
 * surface uses. Adding a real production type later is a one-line entry, never a
 * separate system (spec §6 "the taxonomy should drive the workspace without
 * creating separate systems").
 *
 * Pure: no database, no session, no UI. Fully unit-testable on its own.
 */

import type { WorkspaceContext } from "@/lib/navigation";
import { requestCategoryLabel } from "@/domains/requests/categories";

/** The stored snake_case value of `production_job.production_type`. */
export type ProductionTypeValue = string;

/**
 * An output field a production type cares about, drawn from what the customer's
 * structured requirements (`request.requirements`) and the brief can actually
 * supply. The workspace renders these as the "output requirements" that matter
 * for the kind of work this is — and only when a value genuinely exists.
 */
export type OutputField =
  | "dimensions"
  | "format"
  | "quantity"
  | "platforms"
  | "copy"
  | "visualDirection"
  | "export"
  | "pageFormat";

/** One production type's workspace profile. */
export type ProductionTypeProfile = {
  /** The type value this profile is keyed by. */
  type: ProductionTypeValue;
  /** Contexts that genuinely expect this type. Informational, never a gate. */
  contexts: readonly WorkspaceContext[];
  /** Output fields to foreground for this type, in display order. */
  emphasises: readonly OutputField[];
  /**
   * A sensible `deliverable.type` for a first deliverable of this kind, offered
   * as a convenience only — the operator always chooses. Reuses the same
   * extensible string vocabulary the deliverable table already carries.
   */
  suggestedDeliverableType: string;
  /** Checklist keys this type adds on top of the shared set (see checklist.ts). */
  extraChecklist: readonly string[];
};

/** Fields any production job should surface for output requirements. */
const UNIVERSAL_FIELDS: readonly OutputField[] = ["dimensions", "format", "export"];


/**
 * The profiles, keyed by the production-type values the customer categories
 * actually produce (see requests/categories): Brand — document, marketing_assets,
 * social_content, presentation, brand_asset; Artist — cover_artwork,
 * release_assets, social_content, motion, lyric_content, epk, press_materials,
 * promotional_creative. Anything else resolves to the neutral profile.
 */
const profiles: Record<string, ProductionTypeProfile> = {
  document: {
    type: "document",
    contexts: ["brand"],
    emphasises: ["pageFormat", "format", "dimensions", "copy"],
    suggestedDeliverableType: "document",
    extraChecklist: ["page_format_confirmed", "proofread_complete"],
  },
  presentation: {
    type: "presentation",
    contexts: ["brand"],
    emphasises: ["pageFormat", "quantity", "copy", "format"],
    suggestedDeliverableType: "presentation",
    extraChecklist: ["slide_flow_reviewed"],
  },
  marketing_assets: {
    type: "marketing_assets",
    contexts: ["brand"],
    emphasises: ["dimensions", "quantity", "platforms", "copy", "format"],
    suggestedDeliverableType: "marketing_assets",
    extraChecklist: ["copy_checked"],
  },
  social_content: {
    type: "social_content",
    contexts: ["brand", "artist"],
    emphasises: ["platforms", "dimensions", "copy", "format"],
    suggestedDeliverableType: "social_content",
    extraChecklist: ["copy_checked"],
  },
  brand_asset: {
    type: "brand_asset",
    contexts: ["brand"],
    emphasises: ["dimensions", "format", "export"],
    suggestedDeliverableType: "brand_asset",
    extraChecklist: [],
  },
  cover_artwork: {
    type: "cover_artwork",
    contexts: ["artist"],
    emphasises: ["dimensions", "format", "export"],
    suggestedDeliverableType: "cover_artwork",
    extraChecklist: [],
  },
  release_assets: {
    type: "release_assets",
    contexts: ["artist"],
    emphasises: ["dimensions", "quantity", "platforms", "format"],
    suggestedDeliverableType: "release_assets",
    extraChecklist: [],
  },
  motion: {
    type: "motion",
    contexts: ["artist"],
    emphasises: ["dimensions", "format", "export"],
    suggestedDeliverableType: "motion",
    extraChecklist: ["duration_confirmed"],
  },
  lyric_content: {
    type: "lyric_content",
    contexts: ["artist"],
    emphasises: ["copy", "format", "pageFormat"],
    suggestedDeliverableType: "lyric_content",
    extraChecklist: ["copy_checked"],
  },
  epk: {
    type: "epk",
    contexts: ["artist"],
    emphasises: ["pageFormat", "copy", "format", "dimensions"],
    suggestedDeliverableType: "epk",
    extraChecklist: ["page_format_confirmed"],
  },
  press_materials: {
    type: "press_materials",
    contexts: ["artist"],
    emphasises: ["pageFormat", "copy", "format"],
    suggestedDeliverableType: "press_materials",
    extraChecklist: ["page_format_confirmed"],
  },
  promotional_creative: {
    type: "promotional_creative",
    contexts: ["artist"],
    emphasises: ["dimensions", "quantity", "platforms", "format"],
    suggestedDeliverableType: "promotional_creative",
    extraChecklist: ["copy_checked"],
  },
};

/** The neutral profile used for any type not explicitly mapped above. */
const genericProfile: ProductionTypeProfile = {
  type: "other",
  contexts: ["brand", "artist"],
  emphasises: UNIVERSAL_FIELDS,
  suggestedDeliverableType: "deliverable",
  extraChecklist: [],
};

/**
 * The workspace profile for one production type. Known types get a tailored
 * profile; anything else (a type written outside this map, a brand-new value)
 * resolves to the neutral profile rather than failing — the taxonomy is additive
 * and never hides or errors on an unfamiliar value (spec §6).
 */
export function productionProfileFor(type: ProductionTypeValue): ProductionTypeProfile {
  const trimmed = type.trim();
  const match = profiles[trimmed];
  return match ?? { ...genericProfile, type: trimmed || "other" };
}

/**
 * The human label for a production type. Delegates to the single label source so
 * the workspace never renders a raw snake_case value and never disagrees with the
 * customer surfaces about what a type is called (spec §6, §24).
 */
export function productionTypeLabel(
  context: WorkspaceContext,
  type: ProductionTypeValue,
): string {
  return requestCategoryLabel(context, type);
}
