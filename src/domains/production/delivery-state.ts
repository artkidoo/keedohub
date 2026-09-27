/**
 * The delivery state machine (Phase 3.2, spec §14).
 *
 * Delivery is deliberately the simplest state in the whole workflow: a delivery
 * record, once it exists, means "this exact version of this exact file was handed
 * to this customer". There is no second state, no draft, no queue — a delivery is
 * either made or it was never made. What needs enforcing is therefore the ENTRY
 * condition, and this module is the whole of it.
 *
 * The rules, in the order they are checked:
 *   1. the work must not already be delivered (idempotency — a repeat returns the
 *      existing delivery rather than making a second one);
 *   2. the job must be approved, which is only reachable from a customer review
 *      the customer actually decided;
 *   3. there must be an APPROVED review, and it must be the review of the
 *      deliverable's CURRENT version — a superseded version can never be
 *      delivered, and a pending or changes-requested review can never authorise
 *      one;
 *   4. that version must carry a file, and a file the customer can actually open.
 *
 * There is deliberately no path from `pending` or `changes_requested` to a
 * delivery, and no function anywhere in the codebase that updates a delivery row
 * after creation: delivered work is immutable, and a later change is new work
 * (spec §14.2, §12.3 rule 1).
 *
 * Pure model: no database, no session, no UI.
 */

import type { DeliverableStatus, JobStatus, ReviewStatus } from "@/lib/db/schema";

/** Everything the gate is allowed to look at, gathered by the caller. */
export type DeliveryFacts = {
  /** The production job's internal state. */
  jobStatus: JobStatus;
  /** The deliverable's derived state. */
  deliverableStatus: DeliverableStatus;
  /** The review of the deliverable's current version, if one exists. */
  reviewStatus: ReviewStatus | null;
  /** The version the deliverable is currently on. */
  currentVersion: number;
  /** The version that review was made about. */
  reviewedVersion: number | null;
  /** The current version carries a file at all. */
  hasFile: boolean;
  /** That file is shared with the customer as a customer-facing kind. */
  fileIsCustomerVisible: boolean;
  /** A delivery for this deliverable already exists. */
  alreadyDelivered: boolean;
};

/** Why delivery is refused. Internal vocabulary. */
export type DeliveryRefusal =
  | "already_delivered"
  | "not_approved"
  | "no_review"
  | "review_not_approved"
  | "version_mismatch"
  | "no_file"
  | "not_shared"
  | "inconsistent_state";

export type DeliveryReadiness =
  | { ready: true }
  | { ready: false; reason: DeliveryRefusal };

/**
 * The single entry gate for delivery.
 *
 * Deliberately total: every input produces either "ready" or a named reason, so
 * the internal surface can explain exactly what is missing instead of refusing
 * vaguely, and so the reasons are unit-testable without a database.
 */
export function deliveryReadiness(facts: DeliveryFacts): DeliveryReadiness {
  // 1. Idempotency first: an already-delivered deliverable is a no-op, never an
  //    error, because a repeated submission must not create a second record.
  if (facts.alreadyDelivered) {
    return { ready: false, reason: "already_delivered" };
  }

  // 2. Only approved work is deliverable. `approved` is reachable on the job
  //    lifecycle from `customer_review` alone, i.e. only by a customer decision.
  if (facts.jobStatus !== "approved") {
    return { ready: false, reason: "not_approved" };
  }
  if (facts.deliverableStatus !== "approved") {
    return { ready: false, reason: "inconsistent_state" };
  }

  // 3. A review must exist, must be an approval, and must be about the version
  //    that is actually current.
  if (!facts.reviewStatus) {
    return { ready: false, reason: "no_review" };
  }
  if (facts.reviewStatus !== "approved") {
    // `pending` and `changes_requested` land here, and so does `superseded`:
    // none of them may authorise a delivery.
    return { ready: false, reason: "review_not_approved" };
  }
  if (facts.reviewedVersion !== facts.currentVersion) {
    return { ready: false, reason: "version_mismatch" };
  }

  // 4. The delivered file must exist and must be one the customer can open.
  if (!facts.hasFile) {
    return { ready: false, reason: "no_file" };
  }
  if (!facts.fileIsCustomerVisible) {
    return { ready: false, reason: "not_shared" };
  }

  return { ready: true };
}

/** Internal wording for a refusal, used only on the private production surface. */
export const deliveryRefusalLabels: Record<DeliveryRefusal, string> = {
  already_delivered: "Already delivered",
  not_approved: "The customer has not approved this work yet",
  no_review: "There is no customer review for this version",
  review_not_approved:
    "The customer has not approved this version (the review is open, changes were requested, or it was replaced)",
  version_mismatch:
    "The approved version is no longer the current version of this work",
  no_file: "The current version has no file to deliver",
  not_shared: "The current file is not shared with the customer",
  inconsistent_state:
    "The job and the deliverable disagree about this work; resolve that first",
};

/**
 * The customer-facing consequence of a delivery, in plain words.
 *
 * This is the only delivery wording a customer ever sees, so it names no
 * internal state, no operator and no workflow (spec §24).
 */
export const deliveryCustomerCopy = {
  title: "Delivered",
  body: "This work has been delivered. Your finished files are in your Library, ready to download whenever you need them.",
  libraryLink: "View delivered work",
  notificationTitle: "Your work has been delivered",
  notificationMessage:
    "Your finished files are ready. They are in your Library now, ready to download.",
} as const;
