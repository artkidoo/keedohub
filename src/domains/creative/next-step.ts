/**
 * What the operator should do next (Phase 4.3, spec §16, §21).
 *
 * The workspace must never leave an operator guessing, and it must never let
 * them move a job by hand. This module answers the first half — one plain
 * sentence per job state saying what production step comes next — and states
 * plainly for `customer_review`, `approved` and `delivered` that the ball is not
 * in the operator's court. The lifecycle in `@/domains/production/lifecycle`
 * remains the only thing that decides which moves are legal (spec §16).
 *
 * Pure and UI-free, so the wording is unit-testable and cannot drift from the
 * states the database actually has.
 */

import type { JobStatus } from "@/lib/db/schema";

/** One honest instruction for the state a job is in. */
export type ProductionStep = {
  /** A short imperative title, e.g. "Produce the work". */
  title: string;
  /** One sentence explaining what that means right now. */
  detail: string;
  /** False while the operator is waiting on a decision they do not control. */
  actionable: boolean;
};

const steps: Record<JobStatus, ProductionStep> = {
  incoming: {
    title: "Pick up the job",
    detail:
      "Assign this job to an operator, then move it into briefing to start assembling the brief.",
    actionable: true,
  },
  briefing: {
    title: "Assemble the brief",
    detail:
      "Record the production instructions below, confirm the output requirements, then move the job into production.",
    actionable: true,
  },
  in_production: {
    title: "Produce the work",
    detail:
      "Create the deliverable, upload the finished file as its first version, and keep producing new versions until it is right.",
    actionable: true,
  },
  internal_qa: {
    title: "Clear internal QA",
    detail:
      "Resolve everything the QA gate lists below, then release the work for customer review.",
    actionable: true,
  },
  customer_review: {
    title: "Waiting on the customer",
    detail:
      "The customer is looking at the current version. New versions are held until they decide.",
    actionable: false,
  },
  changes_requested: {
    title: "Revise the work",
    detail:
      "Read the customer's feedback below, move the job back into production, and produce a new version that answers it.",
    actionable: true,
  },
  approved: {
    title: "Deliver the approved work",
    detail:
      "Approval is not delivery. Release the approved version to the customer's library from the delivery panel below.",
    actionable: true,
  },
  delivered: {
    title: "Nothing further",
    detail:
      "This work is delivered and its record is permanent. Any later change is a new job.",
    actionable: false,
  },
};

/** The next production step for one job state. */
export function nextProductionStep(status: JobStatus): ProductionStep {
  return steps[status];
}

/**
 * Whether creative production is the right thing to be doing in this state.
 * Used to word the production area honestly while the job is waiting on a
 * customer decision or has already been delivered — the area still shows the
 * work, but it does not pretend more producing is expected (spec §19).
 */
export function isProducing(status: JobStatus): boolean {
  return status === "briefing" || status === "in_production" || status === "changes_requested";
}
