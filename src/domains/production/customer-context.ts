/**
 * Read-only customer context for the production workspace (Phase 4.2, spec §8).
 *
 * An operator doing production needs the customer's creative direction in front
 * of them: a Brand's colours, voice and visual rules, or an Artist's sound and
 * identity. This module reads exactly the profile the job is already bound to —
 * the one named by `brandProfileId` / `artistProfileId` on the job — and returns
 * it as honest, display-ready facts.
 *
 * It is read-only by construction: there is no write path, no update helper and
 * nothing here accepts a submitted profile. An operator may look at the customer's
 * direction, never change it from the workspace (spec §8).
 *
 * The pure normalisers touch no database and no request, so the whole "show only
 * what exists, never invent, never leak a malformed value" rule is unit-testable
 * on its own; `getProductionContext` is the operator-scoped read that loads the
 * row and hands it to a normaliser.
 */

import { eq } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import { assertOperatorAccess, isRealId } from "./errors";
import { getDb } from "@/lib/db";
import { artistProfile, brandProfile } from "@/lib/db/schema";
import type { BrandColors } from "@/lib/db/schema";

/** One label/value pair the workspace will show. Only present values exist. */
export type ContextFact = { label: string; value: string };

/** One colour the customer declared, validated to a form safe to paint. */
export type ContextColour = { role: string; colour: string };

/**
 * The workspace-ready shape for one job's customer context. `facts` and
 * `colours` are already filtered to what the customer actually supplied, so the
 * view renders every entry it is given without a second "is this empty" check.
 */
export type ProductionContext = {
  kind: "brand" | "artist";
  name: string | null;
  facts: ContextFact[];
  colours: ContextColour[];
  /** True when there is something worth showing; false drives the empty state. */
  hasContent: boolean;
};

/** The raw, already-narrowed profile rows the normalisers accept. */
type BrandRow = typeof brandProfile.$inferSelect;
type ArtistRow = typeof artistProfile.$inferSelect;

/** A label/value pair for a present, trimmed string; null when the field is empty. */
function fact(label: string, value: string | null): ContextFact | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? { label, value: trimmed } : null;
}

/** Present facts, in display order, empties dropped. */
function presentFacts(pairs: Array<ContextFact | null>): ContextFact[] {
  return pairs.filter((entry): entry is ContextFact => entry !== null);
}

/**
 * A colour string safe to paint as a swatch: hex, or a well-formed rgb/hsl
 * functional colour. Anything else (a stray sentence, a malformed value) is not
 * painted — it is shown as plain text instead, so a bad value can never inject a
 * style. Only ASCII colour syntax passes, and it is later assigned to a single
 * CSS property, never interpolated into markup.
 */
const COLOUR_PATTERN =
  /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|rgba|hsl|hsla)\(\s*[\d.]+[\d.,%\s/]*\))$/i;

export function isPaintableColour(value: string): boolean {
  return COLOUR_PATTERN.test(value.trim());
}

/**
 * The brand/artist palette as swatches plus any leftover text. `colours` is a
 * validated, paint-ready list; anything the customer stored that is not a real
 * colour comes back as an ordinary fact so it is still shown, honestly, rather
 * than dropped or painted.
 */
export function colourSwatches(
  colours: BrandColors | null,
): { swatches: ContextColour[]; text: ContextFact[] } {
  const roles: Array<[string, string | undefined]> = [
    ["Primary", colours?.primary],
    ["Secondary", colours?.secondary],
    ["Accent", colours?.accent],
    ["Background", colours?.background],
  ];

  const swatches: ContextColour[] = [];
  const text: ContextFact[] = [];

  for (const [role, value] of roles) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed) continue;
    if (isPaintableColour(trimmed)) {
      swatches.push({ role, colour: trimmed });
    } else {
      text.push({ label: `${role} colour`, value: trimmed });
    }
  }

  return { swatches, text };
}

/** Typography preferences condensed to one readable line, or null when unset. */
function typographyLine(profile: BrandRow): string | null {
  const t = profile.typography;
  if (!t) return null;
  const parts = [
    t.headingFont ? `Headings: ${t.headingFont}` : null,
    t.bodyFont ? `Body: ${t.bodyFont}` : null,
    t.notes ? t.notes : null,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length ? parts.join(" · ") : null;
}

/** Turn a brand row into workspace facts. Present fields only; nothing invented. */
export function normaliseBrandContext(row: BrandRow): ProductionContext {
  const { swatches, text } = colourSwatches(row.colors);
  const facts = presentFacts([
    fact("Description", row.description),
    fact("Industry", row.industry),
    fact("Products & services", row.productsServices),
    fact("Visual style", row.visualStyle),
    fact("Imagery style", row.imageryStyle),
    fact("Typography", typographyLine(row)),
    fact("Personality", row.personality),
    fact("Voice", row.voice),
    fact("Tone", row.tone),
    fact("Preferred layouts", row.preferredLayouts),
    fact("Target audience", row.targetAudience),
    fact("Value proposition", row.valueProposition),
    fact("References", row.references),
    ...text,
  ]);

  return {
    kind: "brand",
    name: row.name?.trim() || null,
    facts,
    colours: swatches,
    hasContent: facts.length > 0 || swatches.length > 0,
  };
}

/** Turn an artist row into workspace facts. Present fields only; nothing invented. */
export function normaliseArtistContext(row: ArtistRow): ProductionContext {
  const { swatches, text } = colourSwatches(row.colors);
  const facts = presentFacts([
    fact("Biography", row.bio),
    fact("Genre", row.genre),
    fact("Visual identity", row.visualIdentity),
    fact("Creative preferences", row.creativePreferences),
    fact("Location", row.location),
    ...text,
  ]);

  return {
    kind: "artist",
    name: row.name?.trim() || null,
    facts,
    colours: swatches,
    hasContent: facts.length > 0 || swatches.length > 0,
  };
}

/**
 * The customer context bound to one production job, for the private workspace.
 *
 * Only the profile the job already points at is loaded — the operator cannot ask
 * for another customer's profile, and a malformed or missing profile id answers
 * with an honest empty context rather than someone else's data. Requires proven
 * operator access; a customer never reaches this code.
 */
export async function getProductionContext(
  access: OperatorAccess,
  job: {
    contextType: "brand" | "artist";
    brandProfileId: string | null;
    artistProfileId: string | null;
  },
): Promise<ProductionContext | null> {
  assertOperatorAccess(access);

  if (job.contextType === "brand") {
    if (!isRealId(job.brandProfileId)) return null;
    const [row] = await getDb()
      .select()
      .from(brandProfile)
      .where(eq(brandProfile.id, job.brandProfileId))
      .limit(1);
    return row ? normaliseBrandContext(row) : null;
  }

  if (!isRealId(job.artistProfileId)) return null;
  const [row] = await getDb()
    .select()
    .from(artistProfile)
    .where(eq(artistProfile.id, job.artistProfileId))
    .limit(1);
  return row ? normaliseArtistContext(row) : null;
}
