/**
 * The Studio review board (Phase 4.1, spec §14).
 *
 * Around customer review, an operator needs to know three things: what is with
 * the customer right now, what the customer sent back, and what is approved and
 * waiting to be delivered. Those three questions are answered from the SAME
 * review and job records Phase 3 writes — no second review system, no shadow
 * state, and no way for this board to disagree with the customer's own screen.
 *
 * The history is the record of real decisions, newest first, so an operator can
 * see how a piece of work reached the state it is in.
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { assertOperatorAccess } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import {
  deliverable,
  delivery,
  productionJob,
  project,
  review,
  user,
  workspace,
} from "@/lib/db/schema";
import type { JobStatus, ReviewStatus } from "@/lib/db/schema";

/** How many rows each board column and the history show. */
const BOARD_LIMIT = 12;
const HISTORY_LIMIT = 20;

/** One piece of work, as the review board shows it. */
export type ReviewBoardItem = {
  deliverableId: string;
  deliverableName: string;
  /** The version currently under review (or already decided). */
  version: number;
  jobId: string;
  jobStatus: JobStatus;
  workspaceSlug: string;
  contextType: "brand" | "artist";
  projectId: string;
  projectName: string;
  /** The review state of the CURRENT version, when a review exists for it. */
  reviewStatus: ReviewStatus | null;
  updatedAt: Date;
  /** True when a delivery exists for this deliverable. */
  delivered: boolean;
};

/** One recorded decision, with who made it and when. */
export type ReviewHistoryItem = {
  id: string;
  status: ReviewStatus;
  version: number;
  feedback: string | null;
  deliverableId: string;
  deliverableName: string;
  workspaceSlug: string;
  contextType: "brand" | "artist";
  reviewerName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StudioReviewBoard = {
  /** With the customer: their decision is outstanding. */
  awaitingCustomer: ReviewBoardItem[];
  /** The customer asked for changes. */
  changesRequested: ReviewBoardItem[];
  /** Approved by the customer, not yet delivered. */
  awaitingDelivery: ReviewBoardItem[];
  history: ReviewHistoryItem[];
};

/**
 * Work in one job state, with the review state of each deliverable's CURRENT
 * version.
 *
 * The review join is on `review.version = deliverable.current_version`, so a
 * superseded review can never be presented as the live decision, and a decided
 * review of an older version cannot make current work look decided.
 */
async function workInJobState(
  status: JobStatus,
  reviewStatuses?: readonly ReviewStatus[],
  /** Include rows whose current version has no review row at all. */
  includeUndecided = false,
): Promise<ReviewBoardItem[]> {
  const rows = await getDb()
    .select({
      deliverableId: deliverable.id,
      deliverableName: deliverable.name,
      version: deliverable.currentVersion,
      jobId: productionJob.id,
      jobStatus: productionJob.status,
      workspaceSlug: workspace.slug,
      contextType: productionJob.contextType,
      projectId: project.id,
      projectName: project.name,
      reviewStatus: review.status,
      updatedAt: deliverable.updatedAt,
      deliveryId: delivery.id,
    })
    .from(deliverable)
    .innerJoin(productionJob, eq(productionJob.id, deliverable.jobId))
    .innerJoin(project, eq(project.id, deliverable.projectId))
    .innerJoin(workspace, eq(workspace.id, deliverable.workspaceId))
    .leftJoin(
      review,
      and(
        eq(review.deliverableId, deliverable.id),
        eq(review.version, deliverable.currentVersion),
      ),
    )
    .leftJoin(delivery, eq(delivery.deliverableId, deliverable.id))
    .where(eq(productionJob.status, status))
    .orderBy(desc(deliverable.updatedAt), desc(deliverable.id))
    .limit(BOARD_LIMIT);

  return rows
    .filter((row) => {
      if (!reviewStatuses?.length) return true;
      // A current version with no review row at all is still undecided — it is
      // the most "waiting" case there is, never a reason to hide the row.
      if (row.reviewStatus === null) return includeUndecided;
      return reviewStatuses.includes(row.reviewStatus);
    })
    .map((row) => ({
      deliverableId: row.deliverableId,
      deliverableName: row.deliverableName,
      version: row.version,
      jobId: row.jobId,
      jobStatus: row.jobStatus,
      workspaceSlug: row.workspaceSlug,
      contextType: row.contextType,
      projectId: row.projectId,
      projectName: row.projectName,
      reviewStatus: row.reviewStatus,
      updatedAt: row.updatedAt,
      delivered: row.deliveryId !== null,
    }));
}

/**
 * The whole review board, in one read.
 *
 * Three columns and a history, each backed by real rows. An empty column means
 * there is genuinely nothing in that state — never that a query failed.
 */
export async function getStudioReviewBoard(
  access: OperatorAccess,
): Promise<StudioReviewBoard> {
  assertOperatorAccess(access);

  const [awaitingCustomer, changesRequested, awaitingDelivery, history] =
    await Promise.all([
      // With the customer AND still open: a decided review of the current version
      // means the customer has already answered, so it is not waiting.
      workInJobState("customer_review", ["pending"], true),
      workInJobState("changes_requested"),
      workInJobState("approved"),
      getDb()
        .select({
          id: review.id,
          status: review.status,
          version: review.version,
          feedback: review.feedback,
          deliverableId: deliverable.id,
          deliverableName: deliverable.name,
          workspaceSlug: workspace.slug,
          contextType: review.contextType,
          reviewerName: user.name,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        })
        .from(review)
        .innerJoin(deliverable, eq(deliverable.id, review.deliverableId))
        .innerJoin(workspace, eq(workspace.id, review.workspaceId))
        .leftJoin(user, eq(user.id, review.reviewedBy))
        .where(inArray(review.status, ["approved", "changes_requested"]))
        .orderBy(desc(review.updatedAt), desc(review.id))
        .limit(HISTORY_LIMIT),
    ]);

  return { awaitingCustomer, changesRequested, awaitingDelivery, history };
}

/** How many open reviews exist at all, for the Command Center link. */
export async function countOpenReviews(access: OperatorAccess): Promise<number> {
  assertOperatorAccess(access);

  const [row] = await getDb()
    .select({ value: sql<number>`count(*)::int` })
    .from(review)
    .where(eq(review.status, "pending"));

  return row?.value ?? 0;
}
