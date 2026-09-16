/**
 * Result of a profile save, as the customer sees it.
 *
 * Everything here is serializable: the object crosses the server/client
 * boundary as the return value of a server action.
 */

export type ProfileSaveStatus = "idle" | "saved" | "error";

export type ProfileFormState = {
  status: ProfileSaveStatus;
  /** One sentence shown above the form. */
  message: string | null;
  /** Validation messages keyed by field name. */
  fieldErrors: Record<string, string>;
  /** Values the form should show after this submission. */
  values: Record<string, string>;
  /** When the profile was last saved, as an ISO timestamp. */
  savedAt: string | null;
};

/** Nothing has been submitted yet, so the form shows what is stored. */
export const initialProfileFormState: ProfileFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: {},
  savedAt: null,
};

/** The submitted details did not pass validation; nothing was written. */
export function invalidProfileState(
  fieldErrors: Record<string, string>,
  values: Record<string, string>,
): ProfileFormState {
  return {
    status: "error",
    message:
      "Some details need your attention. Nothing has been saved — your entries are still here.",
    fieldErrors,
    values,
    savedAt: null,
  };
}

/** The profile was written; `values` are the values now stored. */
export function savedProfileState(
  values: Record<string, string>,
  savedAt: Date,
): ProfileFormState {
  return {
    status: "saved",
    message: "Saved. Your profile is up to date.",
    fieldErrors: {},
    values,
    savedAt: savedAt.toISOString(),
  };
}

/** The write could not be completed. Nothing changed. */
export function failedProfileState(
  values: Record<string, string>,
): ProfileFormState {
  return {
    status: "error",
    message:
      "Your profile could not be saved just now. Nothing has been changed — please try again.",
    fieldErrors: {},
    values,
    savedAt: null,
  };
}
