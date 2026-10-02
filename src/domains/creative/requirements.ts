/**
 * Output requirements (Phase 4.3, spec §5, §7, §8, §14).
 *
 * The one question this module answers is the operator's: "what exactly am I
 * producing, and at what size, format and platform?" It answers it from two
 * places and nowhere else — the operator's own production instructions, and the
 * customer's structured request requirements — and it never invents a value.
 *
 * The list of fields it foregrounds comes from the job's production type (see
 * production-types): cover artwork foregrounds dimensions and export, social
 * content foregrounds platform and copy, and so on. That is what makes the
 * workspace adapt to the kind of work without becoming a different application
 * per type (spec §14).
 *
 * A field with no value is still returned, with `value: null`, so the workspace
 * can say "No dimensions recorded yet" instead of quietly showing nothing —
 * an honest empty state, never padding and never a fabricated dimension
 * (spec §7).
 *
 * Pure: no database, no session, no UI. Unit-testable on its own.
 */

import type { InstructionKey, ProductionInstructions, RequirementFact } from "./brief";
import { productionProfileFor, type OutputField, type ProductionTypeValue } from "./production-types";

/** How each output field is named internally. Internal vocabulary. */
export const outputFieldLabels: Record<OutputField, string> = {
  dimensions: "Dimensions",
  format: "Format",
  quantity: "Quantity",
  platforms: "Platforms",
  copy: "Copy",
  visualDirection: "Visual direction",
  export: "Export",
  pageFormat: "Page format",
};

/** One output requirement as the workspace shows it. */
export type OutputRequirement = {
  field: OutputField;
  label: string;
  /** The value, or null when nothing has been supplied. Never invented. */
  value: string | null;
  /** Where a present value came from; null when there is no value at all. */
  source: "brief" | "request" | null;
};

/**
 * The instruction field that answers an output field, where one does. The
 * operator's own instruction wins over the customer's raw requirement, because
 * it is the version KeedoHub has decided to produce to (spec §8).
 */
const instructionFor: Partial<Record<OutputField, InstructionKey>> = {
  dimensions: "dimensions",
  format: "format",
  export: "exportRequirements",
  copy: "copyDirection",
  visualDirection: "visualDirection",
};

/**
 * How a customer's stored requirement key answers an output field. Requirement
 * keys are free-form jsonb the customer typed, so this is a deliberate,
 * readable pattern match on the humanised key and never a guess about content.
 */
const requestPatternFor: Record<OutputField, RegExp> = {
  dimensions: /dimension|size/i,
  format: /format|file ?type/i,
  quantity: /quantit|how many|number of|amount/i,
  platforms: /platform|channel|social/i,
  copy: /copy|message|headline|caption|text/i,
  visualDirection: /visual|style|mood|imagery|colour|color/i,
  export: /export|resolution|dpi|colour space|color space/i,
  pageFormat: /page|paper|print/i,
};

/**
 * The output requirements for one job, in the order its production type
 * foregrounds them.
 *
 * Each field resolves in two steps: the operator's instruction for it, then the
 * first customer requirement whose key matches it. A requirement is consumed by
 * the first field that claims it, so one customer fact never appears twice under
 * two different headings. Fields nothing supplies come back with a null value.
 */
export function buildOutputRequirements(input: {
  type: ProductionTypeValue;
  instructions: ProductionInstructions;
  requirements: readonly RequirementFact[];
}): OutputRequirement[] {
  const profile = productionProfileFor(input.type);
  const available = input.requirements.map((fact) => ({ ...fact, taken: false }));

  return profile.emphasises.map((field) => {
    const label = outputFieldLabels[field];

    const instructionKey = instructionFor[field];
    const instructed = instructionKey ? input.instructions[instructionKey]?.trim() : "";
    if (instructed) return { field, label, value: instructed, source: "brief" as const };

    const pattern = requestPatternFor[field];
    const match = available.find((fact) => !fact.taken && pattern.test(fact.label));
    if (match) {
      match.taken = true;
      return { field, label, value: match.value, source: "request" as const };
    }

    return { field, label, value: null, source: null };
  });
}

/**
 * Whether every foregrounded requirement has a value. Used to tell the operator
 * plainly that output requirements are not settled yet — this is guidance, not a
 * gate: nothing here can block QA or move a job's state (spec §16, §17).
 */
export function outputRequirementsComplete(
  requirements: readonly OutputRequirement[],
): boolean {
  return requirements.length > 0 && requirements.every((entry) => entry.value !== null);
}

/** The requirement fields still missing a value, for honest wording. */
export function missingOutputRequirements(
  requirements: readonly OutputRequirement[],
): OutputRequirement[] {
  return requirements.filter((entry) => entry.value === null);
}
