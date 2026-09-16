/**
 * Profile server actions.
 *
 * Each action is a server entry point, so each one re-authorises from scratch
 * (spec §19.4): the session is resolved server-side, the caller's owned
 * workspace is loaded from the database, and the submitted profile id is only
 * ever accepted if it belongs to that workspace. The client cannot name a
 * workspace, and possessing someone else's profile id grants nothing — the
 * write simply matches no row and the request fails as not found.
 */

"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { requireWorkspace } from "@/domains/workspace/access";
import { isValidUUIDv4 } from "@/lib/validation/id";
import {
  updateArtistProfileForWorkspace,
  updateBrandProfileForWorkspace,
} from "./data";
import {
  artistProfileToFormValues,
  brandProfileToFormValues,
} from "./fields";
import {
  failedProfileState,
  invalidProfileState,
  savedProfileState,
  type ProfileFormState,
} from "./state";
import {
  parseArtistProfileForm,
  parseBrandProfileForm,
} from "./validation";

const BRAND_PROFILE_PATH = "/workspace/brand/profile";
const ARTIST_PROFILE_PATH = "/workspace/artist/profile";

/**
 * The profile id the form was rendered with.
 *
 * A malformed or missing id is treated as "not found" rather than as a
 * validation problem: it means the request did not come from a profile the
 * caller owns.
 */
function submittedProfileId(formData: FormData): string {
  const value = formData.get("profileId");

  if (!isValidUUIDv4(value)) {
    notFound();
  }

  return value;
}

/**
 * Save the caller's Brand profile.
 *
 * @param _previous the state from the last submission; the form is rendered
 *   from the stored profile, so nothing is carried forward between saves.
 */
export async function saveBrandProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { workspace } = await requireWorkspace(BRAND_PROFILE_PATH);
  const profileId = submittedProfileId(formData);
  const parsed = parseBrandProfileForm(formData);

  if (!parsed.ok) {
    return invalidProfileState(parsed.fieldErrors, parsed.raw);
  }

  let saved: Awaited<ReturnType<typeof updateBrandProfileForWorkspace>>;

  try {
    saved = await updateBrandProfileForWorkspace(
      { workspaceId: workspace.id, profileId },
      parsed.values,
    );
  } catch (error) {
    console.error("Brand profile save failed:", error);
    return failedProfileState(parsed.raw);
  }

  if (!saved) {
    notFound();
  }

  revalidatePath(BRAND_PROFILE_PATH);

  return savedProfileState(brandProfileToFormValues(saved), saved.updatedAt);
}

/** Save the caller's Artist profile. Same contract as the Brand profile. */
export async function saveArtistProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { workspace } = await requireWorkspace(ARTIST_PROFILE_PATH);
  const profileId = submittedProfileId(formData);
  const parsed = parseArtistProfileForm(formData);

  if (!parsed.ok) {
    return invalidProfileState(parsed.fieldErrors, parsed.raw);
  }

  let saved: Awaited<ReturnType<typeof updateArtistProfileForWorkspace>>;

  try {
    saved = await updateArtistProfileForWorkspace(
      { workspaceId: workspace.id, profileId },
      parsed.values,
    );
  } catch (error) {
    console.error("Artist profile save failed:", error);
    return failedProfileState(parsed.raw);
  }

  if (!saved) {
    notFound();
  }

  revalidatePath(ARTIST_PROFILE_PATH);

  return savedProfileState(artistProfileToFormValues(saved), saved.updatedAt);
}
