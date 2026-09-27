/**
 * The result of a review submission, as the customer sees it.
 *
 * Everything here is serializable: the object crosses the server/client boundary
 * as the return value of a server action. It carries only what the interface
 * needs to speak honestly — what happened, or one plain sentence explaining why
 * it did not. No internal state, no identifiers, no workflow vocabulary
 * (spec §24).
 */

export type ReviewFormStatus = "idle" | "error";

/** What a recorded decision means for the customer, in their words. */
export type ReviewOutcome = {
  status: "approved" | "changes_requested";
  href: string;
};

export type ReviewFormState = {
  status: ReviewFormStatus;
  /** One sentence shown where the decision was taken. */
  message: string | null;
  /** Validation messages keyed by field name. */
  fieldErrors: Record<string, string>;
  /** Present when a decision was actually recorded. */
  outcome: ReviewOutcome | null;
};

/** Nothing has been submitted yet. */
export const initialReviewFormState: ReviewFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  outcome: null,
};

/**
 * The decision could not be recorded.
 *
 * The wording is deliberately reassuring and true: nothing was changed, and the
 * customer can simply try again. The reason a change request was refused (no
 * feedback given) is a field error rather than a failure, so it is handled
 * before this state is reached.
 */
export function failedReviewState(): ReviewFormState {
  return {
    status: "error",
    message:
      "We could not record that just now, so nothing has changed. Please try again in a moment.",
    fieldErrors: {},
    outcome: null,
  };
}
