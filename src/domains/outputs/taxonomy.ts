/**
 * Customer-facing taxonomy for creative outputs (Checkpoint 2.5).
 *
 * KeedoHub already stores each output as `deliverable` (+ its customer-visible
 * `asset` files) inside the Project → Job → Deliverable → Asset → Delivery
 * model. `deliverable.type` is an extensible text column by design ("adding a
 * type must never require structural change"), so it is the discriminator:
 * this module maps internal type values to the customer-facing language of
 * "My Documents" and "My Marketing" — the same pattern as
 * `@/domains/requests/categories`. No schema change, no second output model.
 *
 * A type that maps to neither family is NOT hidden work: it simply is not a
 * document or a marketing material (the Customer Library arrives in 2.7).
 * Marketing here means marketing *outputs*, never campaigns (spec §24).
 */

/** The two Brand output areas built in this checkpoint. */
export type OutputFamily = "document" | "marketing";

export type OutputFamilyMeta = {
  id: OutputFamily;
  /** Route segment under the context, and the context navigation slug. */
  slug: "documents" | "marketing";
  /** Customer-facing page title and navigation label. */
  title: string;
  /** One line under the title — plain language, no internal vocabulary. */
  description: string;
  /** Honest empty-state copy for this area. */
  emptyTitle: string;
  emptyDescription: string;
};

export const outputFamilies: Record<OutputFamily, OutputFamilyMeta> = {
  document: {
    id: "document",
    slug: "documents",
    title: "My Documents",
    description: "Business and brand materials KeedoHub has created for you.",
    emptyTitle: "No documents yet",
    emptyDescription:
      "Guidelines, company profiles, presentations, letterheads and other business materials we create for your brand will appear here, ready to open.",
  },
  marketing: {
    id: "marketing",
    slug: "marketing",
    title: "My Marketing",
    description: "Marketing creative KeedoHub has created for your brand.",
    emptyTitle: "No marketing materials yet",
    emptyDescription:
      "Social kits, promotional creative and content packs we make for your brand will appear here, ready to open.",
  },
};

/**
 * Internal `deliverable.type` → customer-facing category label, per family.
 * Values are stable and snake_case (as stored); labels are what a customer
 * reads. Several internal types may share one customer category on purpose.
 */
const typeLabels: Record<OutputFamily, Record<string, string>> = {
  document: {
    document: "Document",
    brand: "Brand",
    brand_guidelines: "Guidelines",
    brand_guide: "Guidelines",
    guidelines: "Guidelines",
    company_profile: "Business",
    business_profile: "Business",
    presentation: "Presentation",
    proposal: "Business",
    invoice: "Invoice",
    letterhead: "Letterhead",
  },
  marketing: {
    social_kit: "Social media",
    social_media: "Social media",
    social_templates: "Social templates",
    social_content: "Social media",
    marketing_kit: "Marketing materials",
    marketing_materials: "Marketing materials",
    marketing_assets: "Marketing materials",
    promo_creative: "Promotional materials",
    promotional_creative: "Promotional materials",
    promotional_flyer: "Promotional materials",
    flyer: "Promotional materials",
    content_pack: "Content packs",
    content: "Content packs",
    ad_creative: "Marketing materials",
    banner_set: "Marketing materials",
  },
};

/** The family a stored deliverable type belongs to, or null when neither. */
export function outputFamilyForType(type: string): OutputFamily | null {
  if (type in typeLabels.document) return "document";
  if (type in typeLabels.marketing) return "marketing";
  return null;
}

/** Stored types that belong to one family — used as the data-layer filter. */
export function outputTypesFor(family: OutputFamily): string[] {
  return Object.keys(typeLabels[family]);
}

/**
 * Customer-facing category label for a stored type. Unknown values are
 * humanised rather than shown as raw snake_case — no customer screen ever
 * renders an internal value verbatim.
 */
export function outputCategoryLabel(type: string): string {
  const known = typeLabels.document[type] ?? typeLabels.marketing[type];
  if (known) return known;

  const words = type.replace(/_/g, " ").trim();
  return words
    ? `${words.charAt(0).toUpperCase()}${words.slice(1)}`
    : "Other";
}
