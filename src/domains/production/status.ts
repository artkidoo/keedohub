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

/** Customer-facing project labels (spec §9.3). */
export const projectStatusLabels: Record<ProjectStatus, string> = {
  requested: "Requested",
  in_production: "In Production",
  in_review: "In Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  delivered: "Delivered",
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

export const deliverableStatusLabels: Record<DeliverableStatus, string> = {
  in_production: "In Production",
  internal_qa: "In Production",
  customer_review: "In Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  delivered: "Delivered",
};
