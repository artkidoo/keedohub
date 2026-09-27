import type {
  DeliverableStatus,
  JobStatus,
  ProjectStatus,
  RequestStatus,
} from "@/lib/db/schema";

/**
 * Status vocabularies.
 *
 * Two vocabularies exist on purpose (spec §24):
 * - INTERNAL values: the canonical database enum values, including the
 *   production queue states that must never reach a customer surface.
 * - CUSTOMER labels: plain-language display labels for customer-facing
 *   statuses only. Internal-only statuses have no customer label — if a
 *   customer surface needs one, that is a design defect, not a label to add.
 */

export const requestStatuses: readonly RequestStatus[] = [
  "submitted",
  "in_validation",
  "changes_needed",
  "accepted",
  "declined",
];

/** Customer-facing request labels (spec §8.3 states, in customer language). */
export const requestStatusLabels: Record<RequestStatus, string> = {
  submitted: "Submitted",
  in_validation: "Being checked",
  changes_needed: "Needs your input",
  accepted: "Accepted",
  declined: "Not accepted",
};

/** Customer-facing project labels (spec §9.3).
 *
 * The SET of statuses is fixed by the spec; the wording is refined per §9.3
 * ("exact label wording may be refined during the design-system phase") into
 * plain customer language, aligned with the Checkpoint 2.4 "My Projects"
 * experience. The customer-facing status for a project in review reads
 * "Waiting for your review" everywhere — dashboard and project list alike.
 */
export const projectStatusLabels: Record<ProjectStatus, string> = {
  requested: "Received",
  in_production: "In progress",
  in_review: "Waiting for your review",
  changes_requested: "Changes requested",
  approved: "Approved",
  delivered: "Delivered",
};

/**
 * One honest line per project status explaining what is happening right now
 * (spec §9.3 meanings, customer language). Never mentions internal jobs,
 * QA, or operations (spec §24).
 */
export const projectStatusSummaries: Record<ProjectStatus, string> = {
  requested: "Your request has been accepted and we are setting up the work.",
  in_production: "We are creating your work right now.",
  in_review:
    "Your work is ready to look over. Open the files below and tell us what you think.",
  changes_requested:
    "You asked for changes; we are on it and work continues from here.",
  approved: "You accepted this work.",
  delivered: "Your finished files are ready for you.",
};

/** Internal-only queue states (spec §10.3). No customer labels by design. */
export const jobStatuses: readonly JobStatus[] = [
  "incoming",
  "briefing",
  "in_production",
  "internal_qa",
  "customer_review",
  "changes_requested",
  "approved",
  "delivered",
];

/**
 * The deliverable status a job's deliverables take when the job is in `status`
 * (spec §11.2 — a deliverable's status is derived from its job, never written
 * by hand).
 *
 * `incoming` and `briefing` both read as "In Production" on a customer surface,
 * exactly as the project status does, and `internal_qa` is deliberately
 * invisible: the customer sees "In Production" while KeedoHub checks the work.
 */
export function deliverableStatusForJob(status: JobStatus): DeliverableStatus {
  switch (status) {
    case "incoming":
    case "briefing":
    case "in_production":
      return "in_production";
    case "internal_qa":
      return "internal_qa";
    case "customer_review":
      return "customer_review";
    case "changes_requested":
      return "changes_requested";
    case "approved":
      return "approved";
    case "delivered":
      return "delivered";
  }
}

export const deliverableStatusLabels: Record<DeliverableStatus, string> = {
  in_production: "In Production",
  internal_qa: "In Production",
  customer_review: "In Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  delivered: "Delivered",
};
