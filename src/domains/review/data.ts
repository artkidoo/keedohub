/**
 * Customer review data access (Phase 3.1, spec §13).
 *
 * The customer's decision point on one version of one deliverable. This is the
 * ONLY write a customer has into the production chain, and it is deliberately
 * narrow: it can move a review from pending to a decision, and — through the
 * lifecycle — a job from "with the customer" to "approved" or "back to
 * production". It cannot assign work, create versions, change priority, or move
 * a job anywhere else.
 *
 * Scope-first (spec §20.2), identical to every other customer query in the app:
 *   - the access triple is resolved from the session by the caller and is never
 *     accepted from the request body;
 *   - the deliverable must belong to that workspace AND that context profile,
 *     through the same `dashboardScope` predicate the dashboard, projects and
 *     the secure file route use;
 *   - a review is therefore never loaded by id alone. A foreign id, a malformed
 *     id, an id from the other context, or a non-reviewable version all resolve
 *     to the same "not found" answer, so nothing about another customer's work
 *     can be inferred (spec §19.5).
 *
 * File access is NOT re-implemented here: the review screen links through the
 * existing secure file route, which enforces the same visibility rules. A second
 * download mechanism would be a second chance to get it wrong (spec §20.2
 * rule 5).
 */

import { and, desc, eq, inArray } from "drizzle-orm";

import { dashboardScope } from "@/domains/dashboard/queries";
import { notifyWorkspaceOwner } from "@/domains/notifications/emit";
import { applyJobTransition } from "@/domains/production/chain";
import { ProductionError } from "@/domains/production/errors";
import {
  canReviewTransition,
  isDecidedReview,
  isMeaningfulFeedback,
  isOpenReview,
  reviewOutcomeLabels,
  reviewStatusForDecision,
  type DecidedReviewStatus,
} from "@/domains/production/review-state";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { getDb } from "@/lib/db";
import {
  deliverable,
  productionJob,
  project,
  request,
  review,
} from "@/lib/db/schema";
import type { Review, ReviewStatus } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";

/**
 * The deliverable statuses a customer may open, and therefore the only ones a
 * review can exist for. Identical to the set the secure file route and the
 * dashboard work list use, so the three surfaces cannot disagree.
 */
const CUSTOMER_WORK_STATUSES = [
  "customer_review",
  "approved",
  "delivered",
] as const;

/**
 * The review predicate for one customer, in one context.
 *
 * Applied to every read and every write: the caller's own workspace, the
 * context's own profile, and a work item that is genuinely visible to them.
 * Returns null when the item does not exist for this caller, which is the only
 * answer a stranger ever receives.
 */
async function scopedWork(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  deliverableId: string,
) {
  // A malformed identifier never reaches the database. Without this guard a
  // forged id would surface a database type error — which is both a leak of
  // implementation detail and a 500 where the honest answer is "not found"
  // (spec §19.4 rule 4, fail closed).
  if (!isValidUUIDv4(deliverableId)) return null;

  const [row] = await getDb()
    .select({
      id: deliverable.id,
      name: deliverable.name,
      type: deliverable.type,
      status: deliverable.status,
      version: deliverable.currentVersion,
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
      requestId: project.requestId,
      jobId: deliverable.jobId,
      jobStatus: productionJob.status,
      workspaceId: deliverable.workspaceId,
    })
    .from(deliverable)
    .innerJoin(project, eq(project.id, deliverable.projectId))
    .innerJoin(
      productionJob,
      and(
        eq(productionJob.id, deliverable.jobId),
        eq(productionJob.projectId, project.id),
        eq(productionJob.workspaceId, access.workspace.id),
      ),
    )
    .where(
      and(
        dashboardScope(access, context),
        eq(deliverable.workspaceId, access.workspace.id),
        eq(deliverable.id, deliverableId),
        inArray(deliverable.status, [...CUSTOMER_WORK_STATUSES]),
      ),
    )
    .limit(1);

  return row ?? null;
}

/** The customer's original words for this work, when it came from a request. */
export type ReviewRequestContext = {
  title: string;
  category: string;
} | null;

/** One review as the customer may see it. */
export type CustomerReview = {
  id: string;
  version: number;
  status: ReviewStatus;
  /** What the customer said, when they asked for changes. Never edited. */
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Everything the customer review screen needs, or null when not reviewable. */
export type ReviewableWork = {
  id: string;
  name: string;
  version: number;
  status: "customer_review" | "approved" | "delivered";
  projectName: string;
  projectDescription: string | null;
  request: ReviewRequestContext;
  /** The review of the CURRENT version, when one exists. */
  currentReview: CustomerReview | null;
  /** Can the customer act on this right now? */
  canReview: boolean;
  /** Older reviews, newest first — the record of how the work evolved. */
  history: CustomerReview[];
};

function toCustomerReview(row: Review): CustomerReview {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    feedback: row.feedback,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * One work item with its review state, for the customer who owns it.
 *
 * Returns null for anything that is not this customer's work in this context,
 * which is what the page turns into a 404 — identical to a missing id.
 */
export async function getReviewableWork(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  deliverableId: string,
): Promise<ReviewableWork | null> {
  const work = await scopedWork(access, context, deliverableId);
  if (!work) return null;

  const rows = await getDb()
    .select()
    .from(review)
    .where(
      and(
        eq(review.workspaceId, access.workspace.id),
        eq(review.contextType, context),
        eq(review.deliverableId, work.id),
      ),
    )
    .orderBy(desc(review.createdAt), desc(review.id));

  const currentReview = rows.find((row) => row.version === work.version) ?? null;

  // A review may only be acted on when the work is genuinely with the customer
  // and an OPEN review of the current version exists. A superseded version, an
  // already-decided review, or work still in production all fail this test.
  const canReview =
    work.status === "customer_review" &&
    currentReview !== null &&
    isOpenReview(currentReview.status);

  let requestContext: ReviewRequestContext = null;
  if (work.requestId) {
    const [source] = await getDb()
      .select({ title: request.title, category: request.category })
      .from(request)
      .where(
        and(
          eq(request.id, work.requestId),
          eq(request.workspaceId, access.workspace.id),
          eq(request.contextType, context),
        ),
      )
      .limit(1);
    requestContext = source ?? null;
  }

  return {
    id: work.id,
    name: work.name,
    version: work.version,
    status: work.status as ReviewableWork["status"],
    projectName: work.projectName,
    projectDescription: work.projectDescription,
    request: requestContext,
    currentReview: currentReview ? toCustomerReview(currentReview) : null,
    canReview,
    history: rows.map(toCustomerReview),
  };
}

/** What a customer is told about the state of their review, in plain words. */
export function reviewHeadline(status: ReviewStatus): string {
  return reviewOutcomeLabels[status];
}

/** Whether a stored review is one the customer already answered. */
export function reviewIsDecided(status: ReviewStatus): boolean {
  return isDecidedReview(status);
}

/**
 * Record the customer's decision on the current version of their work.
 *
 * The whole decision is one guarded transition:
 *   - the work must be theirs, in their context, and genuinely in review;
 *   - there must be an OPEN review of the CURRENT version — a decision on a
 *     superseded version, a second decision on a decided review, or a decision
 *     on work that was never released is refused;
 *   - Request Changes requires written feedback, checked before any write;
 *   - the review row is updated to the decision, and the job is moved through
 *     the lifecycle to `approved` or `changes_requested` — never to any other
 *     state, and never by a caller-supplied status.
 *
 * Approval is recorded here and nowhere else in this checkpoint: the delivery
 * that follows approval is Phase 3.2's work (spec §14).
 */
export async function decideReview(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  deliverableId: string,
  decision: {
    decision: "approve" | "request_changes";
    feedback?: string | null;
  },
): Promise<{ status: DecidedReviewStatus }> {
  const work = await scopedWork(access, context, deliverableId);

  if (!work) {
    throw new ProductionError("Work not found", "not_found");
  }

  const nextStatus = reviewStatusForDecision(decision.decision);
  if (!nextStatus) {
    throw new ProductionError("Unknown review decision", "invalid_input");
  }

  if (
    decision.decision === "request_changes" &&
    !isMeaningfulFeedback(decision.feedback)
  ) {
    throw new ProductionError(
      "Please tell us what you would like changed",
      "invalid_input",
    );
  }

  if (work.status !== "customer_review") {
    throw new ProductionError(
      "This work is not open for review right now",
      "not_reviewable",
    );
  }

  const db = getDb();

  const [open] = await db
    .select()
    .from(review)
    .where(
      and(
        // The caller's own rows only. A review is never addressed by id here: it
        // is found through the work the caller is already proven to own, at the
        // version that work is actually on.
        eq(review.workspaceId, access.workspace.id),
        eq(review.contextType, context),
        eq(review.deliverableId, work.id),
        eq(review.version, work.version),
        eq(review.status, "pending"),
      ),
    )
    .limit(1);

  if (!open) {
    throw new ProductionError(
      "This version has already been reviewed, or is no longer the version under review",
      "not_reviewable",
    );
  }

  if (!canReviewTransition(open.status, nextStatus)) {
    throw new ProductionError("This review can no longer be changed", "conflict");
  }

  const now = new Date();

  // The review is the record: written first, so a job transition can never
  // succeed while the customer's decision was lost.
  const [decided] = await db
    .update(review)
    .set({
      status: nextStatus,
      action: decision.decision,
      feedback:
        decision.decision === "request_changes"
          ? (decision.feedback?.trim() ?? null)
          : null,
      reviewedBy: access.user.id,
      updatedAt: now,
    })
    .where(and(eq(review.id, open.id), eq(review.status, "pending")))
    .returning();

  if (!decided) {
    // Somebody decided this review in the same moment; their answer stands.
    throw new ProductionError(
      "This review has already been answered",
      "conflict",
    );
  }

  const [job] = await db
    .select()
    .from(productionJob)
    .where(eq(productionJob.id, work.jobId))
    .limit(1);

  if (!job) {
    throw new ProductionError("Work not found", "not_found");
  }

  // The same lifecycle the operators use, so a customer's decision can only ever
  // move the work along the two legal exits from customer review.
  await applyJobTransition(
    job,
    decision.decision === "approve" ? "approved" : "changes_requested",
  );

  if (decision.decision === "request_changes") {
    await notifyWorkspaceOwner({
      workspaceId: work.workspaceId,
      context,
      type: "changes_requested",
      title: "Changes requested",
      message:
        "Thank you — we have your feedback on this work and have started the next round. We will let you know here when it is ready to review again.",
      href: `/workspace/${context}/work/${work.id}`,
    });
  }

  return { status: nextStatus };
}
