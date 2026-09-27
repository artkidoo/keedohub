/**
 * The review state machine (Phase 3.1, spec §13).
 *
 * A review is a record of a customer's decision on ONE version of ONE
 * deliverable. This module is the whole model: no database access, no session,
 * no UI. Both the internal path (opening a review when work is released) and the
 * customer path (deciding on it) are therefore forced through the same table,
 * and neither can invent a state.
 *
 * The rules it exists to enforce:
 *   - a review exists only for a version the workflow explicitly released for
 *     review — never for a working version and never for a superseded one;
 *   - a review has exactly one open state (`pending`) and exactly two possible
 *     decisions (`approved`, `changes_requested`) — spec §13.3 rule 1;
 *   - a decision is final for that review: revising the work produces a NEW
 *     review rather than rewriting the old one, so the history of how the work
 *     evolved is preserved (spec §13.3 rule 4, §20.3);
 *   - a pending review overtaken by a newer version is closed as `superseded`:
 *     kept, never deleted, never actionable again.
 */

import type { ReviewAction, ReviewStatus } from "@/lib/db/schema";

/** The review lifecycle, in order. */
export const reviewLifecycle: readonly ReviewStatus[] = [
  "pending",
  "changes_requested",
  "approved",
  "superseded",
];

/** The only two decisions a customer can make (spec §13.3 rule 1). */
export const reviewDecisions: readonly ReviewAction[] = [
  "approve",
  "request_changes",
];

/** Legal moves out of each state. Anything not listed here is refused. */
export const reviewTransitions: Record<ReviewStatus, readonly ReviewStatus[]> = {
  /** Open: the customer may approve it or ask for changes. Nothing else. */
  pending: ["approved", "changes_requested"],
  /** Decided: the work goes back into production. The review itself is done. */
  changes_requested: [],
  /** Accepted. This is the record the delivery checkpoint acts on. */
  approved: [],
  /**
   * Overtaken by a newer version before the customer decided. Closed and kept as
   * history; it can never be decided on afterwards.
   */
  superseded: [],
};

/** Whether a review may move from one state to another. Same state is not a move. */
export function canReviewTransition(
  from: ReviewStatus,
  to: ReviewStatus,
): boolean {
  if (from === to) return false;
  return reviewTransitions[from].includes(to);
}

/** The state a decision produces, or null for a value that is not a decision. */
export function reviewStatusForDecision(
  decision: ReviewAction,
): DecidedReviewStatus | null {
  switch (decision) {
    case "approve":
      return "approved";
    case "request_changes":
      return "changes_requested";
    default:
      return null;
  }
}

/** A review the customer can still decide on. */
export function isOpenReview(status: ReviewStatus): boolean {
  return status === "pending";
}

/** A decided review: the customer acted and the answer is recorded. */
export function isDecidedReview(status: ReviewStatus): boolean {
  return status === "approved" || status === "changes_requested";
}

/** The two states a decision can produce — what a recorded decision returns. */
export type DecidedReviewStatus = Extract<
  ReviewStatus,
  "approved" | "changes_requested"
>;

/**
 * What a review state means for the work behind it.
 *
 * Only the customer-visible consequence is described — never an internal queue
 * position — so customer copy can be written straight from this table
 * (spec §24).
 */
export const reviewOutcomeLabels: Record<ReviewStatus, string> = {
  pending: "Waiting for your decision",
  changes_requested: "You asked for changes",
  approved: "Approved",
  superseded: "A newer version replaced this one",
};

/**
 * Request Changes requires written feedback (spec §13.3 rule 2).
 *
 * Whitespace is not feedback, so a blank message is refused before any write is
 * attempted.
 */
export function isMeaningfulFeedback(
  feedback: string | null | undefined,
): boolean {
  return typeof feedback === "string" && feedback.trim().length > 0;
}