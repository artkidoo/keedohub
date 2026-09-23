/**
 * Result of a request submission, as the customer sees it.
 *
 * Everything here is serializable: the object crosses the server/client
 * boundary as the return value of a server action. Success never returns —
 * the action redirects to the created request instead (spec §7, §23).
 */

export type RequestFormStatus = "idle" | "error";

export type RequestFormState = {
  status: RequestFormStatus;
  /** One sentence shown above the form. */
  message: string | null;
  /** Validation messages keyed by field name. */
  fieldErrors: Record<string, string>;
  /** Values the form should show after this submission. */
  values: Record<string, string>;
};

/** Nothing has been submitted yet, so the form starts empty. */
export const initialRequestFormState: RequestFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: {},
};

/** The submitted details did not pass validation; nothing was written. */
export function invalidRequestState(
  fieldErrors: Record<string, string>,
  values: Record<string, string>,
): RequestFormState {
  return {
    status: "error",
    message:
      "Some details need your attention. Nothing has been sent — your entries are still here.",
    fieldErrors,
    values,
  };
}

/** The write could not be completed. Nothing was created. */
export function failedRequestState(
  values: Record<string, string>,
): RequestFormState {
  return {
    status: "error",
    message:
      "Your request could not be sent just now. Nothing has been created — please try again.",
    fieldErrors: {},
    values,
  };
}
