/**
 * The creative brief model (Phase 4.3, spec §7, §8).
 *
 * The workspace must make the brief *usable* for the operator and must never
 * fabricate creative direction. This module holds the two halves of that:
 *
 *   • The operator-authored half — a small, bounded set of production
 *     instructions (objective, creative direction, composition, copy, visual
 *     direction, technical requirements, dimensions, format, export, delivery).
 *     These are the practical notes KeedoHub's operator writes for themselves;
 *     they are NOT a notes platform, a chat, or an AI-prompt system (spec §8).
 *     Every field is optional and length-bounded; an empty field is stored as
 *     absent, so a blank brief renders as an honest empty state, never padding.
 *
 *   • The derived half — the customer's own words and structured requirements,
 *     read from the request the job fulfils, normalised to present-only facts
 *     with real empty states. Requirements and reference links are free-form
 *     jsonb the customer supplied; we show only what is genuinely there and
 *     render nothing invented.
 *
 * Everything here is pure and Zod-validated; the persistence and authorization
 * live in store.ts. `INSTRUCTION_FIELDS` is the single source of truth for the
 * instruction labels and help text, so the editor form and the read view can
 * never drift apart.
 */

import { z } from "zod";

import { checklistStateSchema, parseChecklistState } from "./checklist";

/** Every production-instruction field, keyed by its stored name. */
export type InstructionKey =
  | "objective"
  | "creativeDirection"
  | "composition"
  | "copyDirection"
  | "visualDirection"
  | "technical"
  | "dimensions"
  | "format"
  | "exportRequirements"
  | "deliveryRequirements";

/** How one instruction field is edited and shown. */
export type InstructionField = {
  key: InstructionKey;
  label: string;
  help: string;
  /** Rendered as a multi-line box when true, a single line when false. */
  multiline: boolean;
  /** Stored length bound, enforced by the schema below. */
  maxLength: number;
};

/**
 * The production-instruction fields, in display order (spec §8). The order and
 * labels here drive both the editing form and the read view — the workspace and
 * the form are generated from this list, so they cannot disagree.
 */
export const INSTRUCTION_FIELDS: readonly InstructionField[] = [
  { key: "objective", label: "Production objective", help: "What this piece of work has to achieve.", multiline: false, maxLength: 500 },
  { key: "creativeDirection", label: "Creative direction", help: "The idea the work should express.", multiline: true, maxLength: 2000 },
  { key: "composition", label: "Composition / layout", help: "How the piece should be built.", multiline: true, maxLength: 2000 },
  { key: "copyDirection", label: "Copy direction", help: "Words, headlines or messaging to include.", multiline: true, maxLength: 2000 },
  { key: "visualDirection", label: "Visual direction", help: "Style, mood, imagery and references to follow.", multiline: true, maxLength: 2000 },
  { key: "technical", label: "Technical requirements", help: "Anything technical the file must satisfy.", multiline: true, maxLength: 2000 },
  { key: "dimensions", label: "Dimensions", help: "Sizes the output must be produced at.", multiline: false, maxLength: 300 },
  { key: "format", label: "Format", help: "File format the work is delivered in.", multiline: false, maxLength: 300 },
  { key: "exportRequirements", label: "Export requirements", help: "Export settings, colour space, resolution.", multiline: false, maxLength: 500 },
  { key: "deliveryRequirements", label: "Delivery requirements", help: "How many files, what naming, how it is handed over.", multiline: false, maxLength: 500 },
];

/** Keys only — the order and metadata are on INSTRUCTION_FIELDS. */
export const INSTRUCTION_KEYS: readonly InstructionKey[] = INSTRUCTION_FIELDS.map(
  (field) => field.key,
);

/** The operator-authored instructions, present fields only. */
export type ProductionInstructions = Partial<Record<InstructionKey, string>>;

/** The whole brief blob as it is read for the workspace. */
export type ProductionBrief = {
  instructions: ProductionInstructions;
  /** Checked checklist keys (see checklist.ts). Kept here so one blob holds both. */
  checklist: string[];
};

/** A bounded, optional, trimmed string; an empty value collapses to undefined. */
function optionalText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value && value.length ? value : undefined));
}

/**
 * The instructions an operator submits, validated field-by-field from
 * INSTRUCTION_FIELDS. `.strict()` means a submitted key that is not a real
 * instruction is refused outright, so no unexpected value is ever persisted
 * (spec §23: never trust client-submitted production state).
 */
export const instructionsInputSchema = z
  .object(
    Object.fromEntries(
      INSTRUCTION_FIELDS.map((field) => [field.key, optionalText(field.maxLength)]),
    ) as Record<InstructionKey, ReturnType<typeof optionalText>>,
  )
  .strict();

/** The full submitted brief (instructions plus the checklist selection). */
export const briefInputSchema = z.object({
  instructions: instructionsInputSchema.default({}),
  checklist: checklistStateSchema.default([]),
});

/** Empty brief — what a job with no creative notes yet reads as. */
export function emptyBrief(): ProductionBrief {
  return { instructions: {}, checklist: [] };
}

/**
 * Read the `production_job.brief` blob into a brief, tolerating anything: legacy
 * or foreign jsonb that is not our shape yields an honest empty brief rather than
 * throwing or rendering partial garbage. The checklist is parsed by its own schema
 * so a malformed sub-array cannot poison the instructions.
 */
export function readBrief(blob: unknown): ProductionBrief {
  if (!blob || typeof blob !== "object" || Array.isArray(blob)) return emptyBrief();

  const raw = blob as Record<string, unknown>;
  const instructions: ProductionInstructions = {};
  const rawInstructions =
    raw.instructions && typeof raw.instructions === "object" && !Array.isArray(raw.instructions)
      ? (raw.instructions as Record<string, unknown>)
      : {};

  for (const field of INSTRUCTION_FIELDS) {
    const candidate = rawInstructions[field.key];
    if (typeof candidate === "string" && candidate.trim()) {
      instructions[field.key] = candidate.trim().slice(0, field.maxLength);
    }
  }

  return { instructions, checklist: parseChecklistState(raw.checklist) };
}

/**
 * Serialise a brief into the value stored in `production_job.brief`. Only the
 * known instruction keys are written, only when present, and an entirely empty
 * brief serialises to `null` so the column stays clean rather than holding `{}`.
 */
export function writeBrief(brief: ProductionBrief): unknown | null {
  const instructions: Record<string, string> = {};
  for (const field of INSTRUCTION_FIELDS) {
    const value = brief.instructions[field.key];
    if (value && value.trim()) instructions[field.key] = value.trim();
  }
  const checklist = Array.from(new Set(brief.checklist));

  if (Object.keys(instructions).length === 0 && checklist.length === 0) return null;
  return { instructions, checklist };
}

/** A label/value pair surfaced from the customer's structured requirements. */
export type RequirementFact = { label: string; value: string };

/** How many requirement pairs and reference links we will ever show. */
const MAX_DERIVED_ITEMS = 20;

/** Title-case a snake_case key for an internal label. Never throws. */
function humanise(key: string): string {
  const words = key.replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function scalarToText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

/**
 * The customer's structured requirements (`request.requirements`, free-form jsonb
 * holding sizes / formats / platforms / quantities) as present-only pairs. Only
 * scalar and flat-array-of-scalar values become a row; nested objects and empties
 * are skipped so nothing is invented and the panel never renders `[object
 * Object]`. A value that is not a usable object yields no rows at all — the
 * honest empty state, not a fabricated dimension (spec §7).
 */
export function normaliseRequirements(raw: unknown): RequirementFact[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  const facts: RequirementFact[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (facts.length >= MAX_DERIVED_ITEMS) break;
    const label = humanise(key);
    if (!label) continue;

    if (Array.isArray(value)) {
      const joined = value
        .map(scalarToText)
        .filter((part): part is string => part !== null)
        .join(", ");
      if (joined) facts.push({ label, value: joined });
      continue;
    }
    const text = scalarToText(value);
    if (text) facts.push({ label, value: text });
  }
  return facts;
}

/** A reference the customer supplied: shown as text, and linked only when a URL. */
export type CreativeReference = { text: string; href: string | null };

/** An href safe to render — only absolute http(s), never a javascript: or data:. */
function safeHref(value: string): string | null {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/**
 * The customer's reference links (`request.reference_links`, free-form jsonb).
 * Accepts plain strings and simple `{ label, url }` / `{ title, href }` objects,
 * and emits a link only when the address is a real http(s) URL — otherwise the
 * reference is shown as plain text, so a stored `javascript:` value can never
 * become an anchor. This is internal to the workspace but is still validated.
 */
export function normaliseReferenceLinks(raw: unknown): CreativeReference[] {
  if (!Array.isArray(raw)) return [];

  const refs: CreativeReference[] = [];
  for (const entry of raw) {
    if (refs.length >= MAX_DERIVED_ITEMS) break;

    if (typeof entry === "string") {
      const text = entry.trim();
      if (text) refs.push({ text, href: safeHref(text) });
      continue;
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const obj = entry as Record<string, unknown>;
      const url =
        typeof obj.url === "string" ? obj.url :
        typeof obj.href === "string" ? obj.href :
        typeof obj.link === "string" ? obj.link : null;
      const label =
        typeof obj.label === "string" ? obj.label :
        typeof obj.title === "string" ? obj.title : url;
      if (url && label?.trim()) {
        refs.push({ text: label.trim(), href: safeHref(url) });
      } else if (label?.trim()) {
        refs.push({ text: label.trim(), href: null });
      }
    }
  }
  return refs;
}

