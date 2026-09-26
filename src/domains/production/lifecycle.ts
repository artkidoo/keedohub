/**
 * Production job lifecycle (Phase 3.0).
 *
 * This module is the single definition of how a production job moves through
 * the private workflow, and of what the customer is allowed to see while it
 * does. It contains no UI and performs no writes: it is the model that the
 * production data layer enforces.
 *
 * Two vocabularies coexist on purpose (spec §24):
 *   - INTERNAL job states — the raw queue states. Never rendered on a
 *     customer surface.
 *   - CUSTOMER project status — plain language ("In progress", "Waiting for
 *     your review"). `customerProjectStatusForJob` is the only bridge between
 *     them, and it can only ever return a customer-facing value, so internal
 *     states such as `internal_qa` cannot leak by accident.
 */

import type { JobStatus, ProjectStatus } from "@/lib/db/schema";

/**
 * The lifecycle in order, front to back (spec §10.3).
 *
 * The states already exist in the database enum; nothing is duplicated here.
 * Phase 3.0 wires the front of the chain (queued → briefing → production →
 * internal QA) and the queue that reads it. The review, approval and delivery
 * states are part of the same model and become reachable when the review and
 * delivery checkpoints drive them — the guard below already describes them so
 * the model cannot drift from the workflow that will use it.
 */
export const jobLifecycle: readonly JobStatus[] = [
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
 * Legal moves from each state.
 *
 * A transition that is not listed here is refused. The table is deliberately
 * explicit rather than "anything forward": skipping internal QA, or jumping
 * straight from production to delivered, would let unverified work reach a
 * customer.
 */
export const jobTransitions: Record<JobStatus, readonly JobStatus[]> = {
  /** Queued: the job exists but nobody has picked it up. */
  incoming: ["briefing"],
  /** Briefing: instructions are being assembled. */
  briefing: ["in_production"],
  /** Producing. Internal QA is the only way forward. */
  in_production: ["internal_qa"],
  /**
   * Internal QA either passes work to the customer for review or sends it
   * back to production.
   */
  internal_qa: ["customer_review", "in_production"],
  /** The customer decides: approve, or ask for changes. */
  customer_review: ["approved", "changes_requested"],
  /** Changes requested: back into production for the next version. */
  changes_requested: ["in_production"],
  /** Approved work awaits delivery into the customer's library. */
  approved: ["delivered"],
  /** Delivered is terminal: delivered work is immutable (spec §14.2). */
  delivered: [],
};

/** Whether a move between two states is legal. Same state is not a move. */
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return false;
  return jobTransitions[from].includes(to);
}

/** States that end a job's life: nothing follows them. */
export function isTerminalJobStatus(status: JobStatus): boolean {
  return jobTransitions[status].length === 0;
}

/** Whether the job has started real work (used for `started_at`). */
export function hasStarted(status: JobStatus): boolean {
  return status === "in_production" || status === "internal_qa" ||
    status === "customer_review" || status === "changes_requested" ||
    status === "approved" || status === "delivered";
}

/**
 * The customer-facing status of a project whose job is in `status`.
 *
 * Every internal state maps to a customer state that already has plain
 * customer wording (`projectStatusLabels`). Internal QA deliberately reads as
 * "in progress" to the customer: internal quality checking is KeedoHub's
 * business, not theirs.
 */
export function customerProjectStatusForJob(status: JobStatus): ProjectStatus {
  switch (status) {
    case "incoming":
    case "briefing":
    case "in_production":
    case "internal_qa":
      return "in_production";
    case "customer_review":
      return "in_review";
    case "changes_requested":
      return "changes_requested";
    case "approved":
      return "approved";
    case "delivered":
      return "delivered";
  }
}

/**
 * The customer-facing status of a project that has no job yet: the request
 * has been accepted and the work is being set up.
 */
export const CUSTOMER_STATUS_BEFORE_PRODUCTION: ProjectStatus = "requested";
