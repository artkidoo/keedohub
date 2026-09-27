/**
 * Review records for the production workflow (Phase 3.1, spec §13).
 *
 * Two principals touch this table and they are kept strictly apart:
 *   - the INTERNAL side, in this module: opening a review when work is
 *     genuinely ready for the customer, closing an open review when newer work
 *     overtakes it, and reading the record internally;
 *   - the CUSTOMER side, in `@/domains/review`: deciding on an open review.
 *
 * What is enforced here rather than left to the caller:
 *   - a review row is only ever created for a version that is CURRENT, so a
 *     superseded version can never be "reviewed" (spec §11.3);
 *   - at most one open review exists per deliverable — enforced in the state
 *     machine, in the query, and by a partial unique index in the database;
 *   - nothing is ever deleted: a review that is overtaken becomes `superseded`
 *     (spec §20.3 keeps the record of how the work evolved).
 *
 * The `context_type` and `workspace_id` on every row are inherited from the job
 * that owns the deliverable, never accepted from the caller, so a review can
 * never be filed against another customer's work or the wrong context.
 */

import { and, desc, eq, ne } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import { assertOperatorAccess, isRealId, ProductionError } from "./errors";
import { isOpenReview } from "./review-state";
import { getDb } from "@/lib/db";
import {
  deliverable,
  deliverableVersion,
  productionJob,
  review,
} from "@/lib/db/schema";
import type { Review, ReviewStatus } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/** The job a review belongs to, with the scope a review row inherits. */
type ReviewScope = {
  id: string;
  workspaceId: string;
  context: WorkspaceContext;
  title: string;
};

async function loadJobScope(jobId: string): Promise<ReviewScope | null> {
  const [row] = await getDb()
    .select({
      id: productionJob.id,
      workspaceId: productionJob.workspaceId,
      context: productionJob.contextType,
      title: productionJob.title,
    })
    .from(productionJob)
    .where(eq(productionJob.id, jobId))
    .limit(1);

  return row ?? null;
}

/**
 * Open a review for every deliverable of a job that has been released.
 *
 * Called only by the `internal_qa → customer_review` transition, and only after
 * the QA gate passed — so a review exists exactly when the customer has
 * something real to look at. Each row is pinned to the deliverable's CURRENT
 * version, which is what makes "which version am I reviewing?" answerable and
 * makes an older version unreviewable by construction.
 *
 * Idempotent: a deliverable that already has an open review is left alone, so a
 * repeated call cannot create a second active review.
 */
export async function openReviewsForJob(
  access: OperatorAccess,
  jobId: string,
): Promise<Review[]> {
  assertOperatorAccess(access);

  const scope = await loadJobScope(jobId);
  if (!scope) {
    throw new ProductionError("Job not found", "not_found");
  }

  const db = getDb();

  const targets = await db
    .select({
      deliverableId: deliverable.id,
      version: deliverableVersion.version,
    })
    .from(deliverable)
    .innerJoin(
      deliverableVersion,
      and(
        eq(deliverableVersion.deliverableId, deliverable.id),
        eq(deliverableVersion.isCurrent, true),
      ),
    )
    .where(eq(deliverable.jobId, jobId))
    .orderBy(deliverable.createdAt);

  const opened: Review[] = [];

  for (const target of targets) {
    const [existing] = await db
      .select({ id: review.id })
      .from(review)
      .where(
        and(
          eq(review.deliverableId, target.deliverableId),
          eq(review.status, "pending"),
        ),
      )
      .limit(1);

    if (existing) continue;

    const [created] = await db
      .insert(review)
      .values({
        workspaceId: scope.workspaceId,
        contextType: scope.context,
        deliverableId: target.deliverableId,
        version: target.version,
        status: "pending",
        action: null,
      })
      .returning();

    opened.push(created);
  }

  return opened;
}

/**
 * Close an open review that newer production has overtaken.
 *
 * Called when a new version becomes current. The review row is kept and marked
 * `superseded` so the customer can still see that this version was released and
 * replaced, and so the open-review slot is free for the next release. Nothing is
 * deleted, and a review the customer already decided on is never touched.
 */
export async function supersedeOpenReviews(
  deliverableId: string,
  exceptVersion: number,
): Promise<number> {
  const superseded = await getDb()
    .update(review)
    .set({ status: "superseded", updatedAt: new Date() })
    .where(
      and(
        eq(review.deliverableId, deliverableId),
        // Only an OPEN review can be overtaken, and only for a version that is no
        // longer the one being produced. A decision the customer already made is
        // never rewritten.
        eq(review.status, "pending"),
        ne(review.version, exceptVersion),
      ),
    )
    .returning({ id: review.id });

  return superseded.length;
}

/** The reviews of one deliverable, newest first (internal read). */
export async function listReviewsForDeliverable(
  access: OperatorAccess,
  deliverableId: string,
): Promise<Review[]> {
  assertOperatorAccess(access);
  if (!isRealId(deliverableId)) return [];

  return getDb()
    .select()
    .from(review)
    .where(eq(review.deliverableId, deliverableId))
    .orderBy(desc(review.createdAt), desc(review.id));
}

/** How many reviews of a deliverable are still awaiting a decision. */
export function countOpenReviews(rows: Pick<Review, "status">[]): number {
  return rows.filter((row) => isOpenReview(row.status)).length;
}

/** The one review a deliverable can still be decided on, or null. */
export async function findOpenReview(
  deliverableId: string,
): Promise<Review | null> {
  const [row] = await getDb()
    .select()
    .from(review)
    .where(and(eq(review.deliverableId, deliverableId), eq(review.status, "pending")))
    .limit(1);

  return row ?? null;
}

/** Whether a stored review state is one the customer may still act on. */
export function isActionableReview(status: ReviewStatus): boolean {
  return isOpenReview(status);
}
