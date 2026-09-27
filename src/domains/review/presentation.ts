/**
 * Customer review copy (Phase 3.1).
 *
 * Every sentence a customer can read on a review surface is written here, in
 * customer language. Nothing in this file names an internal queue state, an
 * operator, a QA step, a job or a version history rule (spec §24).
 */

import type { ReviewStatus } from "@/lib/db/schema";

/** What the two buttons say. */
export const reviewChoiceLabels = {
  approve: "Approve this work",
  request_changes: "Request changes",
} as const;

/** One honest sentence per review state, for the customer. */
export const reviewStatusCopy: Record<ReviewStatus, { title: string; body: string }> = {
  pending: {
    title: "Ready for your review",
    body: "This version is ready for you to look over. Open the files below, then approve it or tell us what you would like changed.",
  },
  changes_requested: {
    title: "Changes requested",
    body: "Thank you — we have your feedback and have started the next round of this work. We will let you know here when it is ready to look over again.",
  },
  approved: {
    title: "Approved",
    body: "You approved this version. We are finishing the last steps and your finished files will appear in your library.",
  },
  superseded: {
    title: "A newer version replaced this one",
    body: "This version is no longer the one under review. The newer version is the current one.",
  },
};

/** The heading for the customer's decision, whatever state the work is in. */
export function reviewPanelTitle(status: ReviewStatus | null): string {
  if (!status) return "This work";
  return reviewStatusCopy[status].title;
}

/** The sentence under the heading. */
export function reviewPanelBody(status: ReviewStatus | null): string {
  if (!status) {
    return "When this work is ready for you, it will appear here with the files to look over.";
  }
  return reviewStatusCopy[status].body;
}

/** Help text for the feedback box, in the customer's own terms. */
export const feedbackHelp =
  "Tell us what you would like changed. The more specific you are, the faster we can get it right.";

/** The button/heading shown when a change request has no words yet. */
export const feedbackRequiredMessage =
  "Please tell us what you would like changed before sending your request.";

/** UTC-stable timestamp formatting, matching the notifications surface. */
export function formatReviewTime(value: Date): string {
  const iso = value.toISOString();
  const day = `${iso.slice(0, 4)}-${iso.slice(5, 7)}-${iso.slice(8, 10)}`;
  const time = `${iso.slice(11, 16)}`;
  return `${day} at ${time} UTC`;
}
