/**
 * Customer-facing release and asset vocabulary (Checkpoint 2.6).
 *
 * A release IS an artist project that carries release metadata (see
 * `project.releaseType` / `project.releaseDate` in the schema): the spec's
 * artist project types are New Single / EP Launch / Album Release, so no
 * separate release entity exists and nothing is duplicated. Stored values stay
 * extensible text — customers only ever read labels.
 *
 * Asset categories are expressed in the words artists already use when they
 * ask for work, and are derived from the deliverable an asset belongs to.
 */

import type { WorkspaceContext } from "@/lib/navigation";

export type ArtistArea = "releases" | "assets";

export type ArtistAreaMeta = {
  /** Route segment under the context, and the context navigation slug. */
  slug: ArtistArea;
  /** Customer-facing page title and navigation label. */
  title: string;
  /** One line under the title — plain language, no internal vocabulary. */
  description: string;
  /** Honest empty-state copy for this area. */
  emptyTitle: string;
  emptyDescription: string;
};

export const artistAreaCopy: Record<ArtistArea, ArtistAreaMeta> = {
  releases: {
    slug: "releases",
    title: "My Releases",
    description: "Singles, EPs and albums KeedoHub is creating for you.",
    emptyTitle: "No releases yet",
    emptyDescription:
      "When we create a release for you, it appears here with its artwork, its files, and where the work has got to.",
  },
  assets: {
    slug: "assets",
    title: "My Assets",
    description: "Artwork and creative files KeedoHub has made for you, ready to use.",
    emptyTitle: "No assets yet",
    emptyDescription:
      "Cover artwork, social graphics and other creative files we make for you appear here, ready to download.",
  },
};

/** Internal `project.releaseType` → customer-facing release type label. */
const releaseTypeLabels: Record<string, string> = {
  single: "Single",
  ep: "EP",
  album: "Album",
  mixtape: "Mixtape",
  live: "Live release",
  compilation: "Compilation",
  other: "Release",
};

/**
 * Label for a stored release type. Unknown values are humanised rather than
 * hidden, so no customer screen ever renders raw snake_case.
 */
export function releaseTypeLabel(value: string): string {
  const known = releaseTypeLabels[value];
  if (known) return known;

  const words = value.replace(/_/g, " ").trim();
  return words
    ? `${words.charAt(0).toUpperCase()}${words.slice(1)}`
    : "Release";
}

/** Internal `deliverable.type` → customer-facing asset category label. */
const assetCategoryLabels: Record<string, string> = {
  cover_artwork: "Cover artwork",
  release_assets: "Release assets",
  social_content: "Social graphics",
  social_kit: "Social media",
  social_templates: "Social templates",
  motion: "Motion",
  lyric_content: "Lyric content",
  epk: "EPK",
  press_materials: "Press materials",
  promotional_creative: "Promotional artwork",
  marketing_kit: "Marketing materials",
  content_pack: "Content pack",
};

/**
 * Category label for an asset, taken from the deliverable that produced it.
 * Unknown types are humanised for the same reason as release types.
 */
export function artistAssetCategoryLabel(deliverableType: string): string {
  const known = assetCategoryLabels[deliverableType];
  if (known) return known;

  const words = deliverableType.replace(/_/g, " ").trim();
  return words
    ? `${words.charAt(0).toUpperCase()}${words.slice(1)}`
    : "Creative file";
}

/**
 * The Releases and Assets areas are the Artist context's own destinations.
 * Brand has "My Assets" as an unfinished area of its own (Customer Library
 * arrives later), so those routes check the context explicitly rather than
 * relying on the shared navigation slug.
 */
export function isArtistAreaContext(context: WorkspaceContext): boolean {
  return context === "artist";
}
