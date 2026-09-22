import {
  artistProfileGroups,
  brandProfileGroups,
  profileFields,
} from "@/domains/profile/fields";
import type { ArtistProfile, BrandProfile } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/**
 * Dashboard profile status (Phase 2.2).
 *
 * Profile completeness is derived from the SAME field groups the Phase 2.1
 * form is built from — one source of truth for what "complete" means. A
 * field counts as filled when its stored value is a non-empty string.
 */

export type ProfileStatus = {
  /** Display name, or null when the customer has not set one yet. */
  displayName: string | null;
  filled: number;
  total: number;
  /** True once every editable field holds a value. */
  isComplete: boolean;
  /** Short human line, e.g. "18 of 34 details added". */
  summary: string;
};

function countFilled(row: object, names: string[]): number {
  const source = row as Record<string, unknown>;
  let filled = 0;
  for (const name of names) {
    const [head, tail] = name.split(".");
    let value: unknown;
    if (tail === undefined) {
      value = source[head];
    } else {
      const group = source[head];
      value =
        group && typeof group === "object"
          ? (group as Record<string, unknown>)[tail]
          : undefined;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      filled += 1;
    }
  }
  return filled;
}

function summarise(
  displayName: string | null,
  filled: number,
  total: number,
): ProfileStatus {
  const isComplete = filled >= total;
  return {
    displayName,
    filled,
    total,
    isComplete,
    summary: isComplete
      ? "Complete — every detail is filled in."
      : `${filled} of ${total} details added.`,
  };
}

/** Brand profile completeness from the live Phase 2.1 row. */
export function brandProfileStatus(profile: BrandProfile): ProfileStatus {
  const names = profileFields(brandProfileGroups).map((field) => field.name);
  const name =
    typeof profile.name === "string" && profile.name.trim().length > 0
      ? profile.name.trim()
      : null;
  return summarise(name, countFilled(profile, names), names.length);
}

/** Artist profile completeness from the live Phase 2.1 row. */
export function artistProfileStatus(profile: ArtistProfile): ProfileStatus {
  const names = profileFields(artistProfileGroups).map((field) => field.name);
  const name =
    typeof profile.name === "string" && profile.name.trim().length > 0
      ? profile.name.trim()
      : null;
  return summarise(name, countFilled(profile, names), names.length);
}

/** Profile status for whichever context the dashboard renders. */
export function profileStatusFor(
  context: WorkspaceContext,
  brand: BrandProfile | undefined,
  artist: ArtistProfile | undefined,
): ProfileStatus | null {
  if (context === "brand") {
    return brand ? brandProfileStatus(brand) : null;
  }
  return artist ? artistProfileStatus(artist) : null;
}
