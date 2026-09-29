/**
 * Internal Studio vocabulary and formatting (Phase 4.1).
 *
 * The Studio speaks its own language: "job", "queue", "internal QA", "operator".
 * That language is correct HERE and forbidden on a customer surface, so the
 * internal wording is gathered in one module rather than scattered through
 * screens — which makes the boundary between the two vocabularies checkable
 * rather than a matter of care (spec §23, §24).
 *
 * Nothing in this file is imported by a customer page. It contains no database
 * access and no authorisation, so it is safe to use from any Studio component.
 */

import type {
  DeliverableStatus,
  JobStatus,
  ProjectStatus,
  RequestStatus,
  ReviewStatus,
} from "@/lib/db/schema";

/* -- Internal status labels ------------------------------------------------- */

/** Queue states, as an operator says them out loud. */
export const studioJobStatusLabels: Record<JobStatus, string> = {
  incoming: "Incoming",
  briefing: "Briefing",
  in_production: "In production",
  internal_qa: "Internal QA",
  customer_review: "With the customer",
  changes_requested: "Changes requested",
  approved: "Approved",
  delivered: "Delivered",
};

/** Deliverable states, in the same internal vocabulary. */
export const studioDeliverableStatusLabels: Record<DeliverableStatus, string> = {
  in_production: "In production",
  internal_qa: "Internal QA",
  customer_review: "With the customer",
  changes_requested: "Changes requested",
  approved: "Approved",
  delivered: "Delivered",
};

/** Review states, from the operator's point of view. */
export const studioReviewStatusLabels: Record<ReviewStatus, string> = {
  pending: "Waiting for the customer",
  changes_requested: "Customer asked for changes",
  approved: "Customer approved",
  superseded: "Overtaken by a newer version",
};

/** Request states, internal wording. */
export const studioRequestStatusLabels: Record<RequestStatus, string> = {
  submitted: "New",
  in_validation: "Being checked",
  changes_needed: "Needs customer input",
  accepted: "Accepted",
  declined: "Declined",
};

/** Project states (these match the customer-facing ones; shown internally too). */
export const studioProjectStatusLabels: Record<ProjectStatus, string> = {
  requested: "Received",
  in_production: "In production",
  in_review: "With the customer",
  changes_requested: "Changes requested",
  approved: "Approved",
  delivered: "Delivered",
};

/* -- Formatting ------------------------------------------------------------- */

/**
 * UTC-stable timestamp for internal records.
 *
 * Fixed to UTC on purpose: an operator comparing two screens must see the same
 * instant, and the Studio has no notion of the customer's timezone.
 */
export function formatStudioTime(value: Date | null | undefined): string {
  if (!value) return "—";
  return `${value.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

/** A short relative age, for "how long has this been waiting" questions. */
export function formatStudioAge(value: Date, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - value.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/** Which context an item belongs to, as an operator labels it. */
export function studioContextLabel(context: "brand" | "artist"): string {
  return context === "brand" ? "Brand" : "Artist";
}

/** A file size, honestly rounded, or an em dash when it is not recorded. */
export function formatStudioSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
