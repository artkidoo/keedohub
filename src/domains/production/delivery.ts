/**
 * Delivery (Phase 3.2, spec §14).
 *
 * The last step of production: an operator formally hands an APPROVED version to
 * the customer. This is the only place a delivery row is ever created, and the
 * only place the work is marked delivered — so the two can never disagree.
 *
 * The order of operations is the specification, enforced in exactly that order
 * (spec §14.2):
 *   1. operator authorisation, resolved before anything is read;
 *   2. the deliverable, its job, its project and its workspace are loaded
 *      together and cross-checked — the caller's only input is the deliverable,
 *      so the chain behind it is inherited and cannot be forged;
 *   3. the current version and its file are loaded;
 *   4. the review of that exact version is loaded and must be an approval;
 *   5. the whole set goes through the delivery gate in `./delivery-state`;
 *   6. the delivery row and the job/project/deliverable states are written in ONE
 *      transaction, so the database can never claim "delivered" with no valid
 *      delivery behind it, and a failure part-way leaves nothing behind;
 *   7. only after that commit does the customer hear about it — and only if this
 *      call actually created the delivery, so a repeated submission can never
 *      send a second notification.
 *
 * Idempotency is enforced twice over: the gate returns the existing delivery for
 * a repeat, and a unique index on `delivery.deliverable_id` makes a concurrent
 * duplicate impossible at the database level.
 */

import { and, desc, eq } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import { applyJobTransition, type DeliveryExecutor } from "./chain";
import {
  deliveryReadiness,
  deliveryCustomerCopy,
  type DeliveryFacts,
} from "./delivery-state";
import { assertOperatorAccess, ProductionError, refuseMalformedId } from "./errors";
import { notifyWorkspaceOwner } from "@/domains/notifications/emit";
import { getDb } from "@/lib/db";
import {
  asset,
  deliverable,
  deliverableVersion,
  delivery,
  productionJob,
  project,
  review,
} from "@/lib/db/schema";
import type {
  DeliverableStatus,
  Delivery,
  ProductionJob as ProductionJobRow,
  ReviewStatus,
} from "@/lib/db/schema";

/** Customer file kinds, identical to the customer visibility rules. */
const CUSTOMER_FILE_CATEGORIES: readonly string[] = ["delivered", "library"];

/** What a delivery call returns, so callers can tell a new delivery from a repeat. */
export type DeliveryResult = {
  delivery: Delivery;
  /** False when the work was already delivered and nothing was written. */
  created: boolean;
};

/** Everything the gate and the internal surface need about one deliverable. */
type DeliveryContext = {
  deliverable: {
    id: string;
    workspaceId: string;
    projectId: string;
    jobId: string;
    status: DeliverableStatus;
    currentVersion: number;
  };
  job: ProductionJobRow;
  version: { id: string; version: number; assetId: string | null } | null;
  asset: { id: string; category: string; customerVisible: boolean } | null;
  reviewStatus: ReviewStatus | null;
  reviewedVersion: number | null;
  existing: Delivery | null;
};

/**
 * Load the delivery context with one consistent set of reads.
 *
 * `executor` lets this run inside the caller's transaction; every predicate here
 * is derived from the deliverable's own chain, never from caller input.
 */
async function loadDeliveryContext(
  deliverableId: string,
  executor: DeliveryExecutor,
): Promise<DeliveryContext | null> {
  const [record] = await executor
    .select()
    .from(deliverable)
    .where(eq(deliverable.id, deliverableId))
    .limit(1);

  if (!record) return null;

  const [job] = await executor
    .select()
    .from(productionJob)
    .where(eq(productionJob.id, record.jobId))
    .limit(1);
  if (!job) return null;

  // Workspace and project consistency: a job from another workspace can never own
  // this deliverable, and a project from another workspace can never own it
  // either. Both are checked rather than assumed (spec §5, §20.2).
  const [projectRow] = await executor
    .select({ id: project.id, workspaceId: project.workspaceId })
    .from(project)
    .where(eq(project.id, record.projectId))
    .limit(1);
  if (!projectRow || projectRow.workspaceId !== record.workspaceId) return null;
  if (job.projectId !== record.projectId || job.workspaceId !== record.workspaceId) {
    return null;
  }

  const [version] = await executor
    .select({
      id: deliverableVersion.id,
      version: deliverableVersion.version,
      assetId: deliverableVersion.assetId,
    })
    .from(deliverableVersion)
    .where(
      and(
        eq(deliverableVersion.deliverableId, record.id),
        eq(deliverableVersion.isCurrent, true),
      ),
    )
    .limit(1);

  const [file] = version?.assetId
    ? await executor
        .select({
          id: asset.id,
          category: asset.category,
          customerVisible: asset.customerVisible,
        })
        .from(asset)
        .where(eq(asset.id, version.assetId))
        .limit(1)
    : [undefined];

  // The review of the CURRENT version only: a superseded version's review can
  // never authorise a delivery, so it is never even considered.
  const [currentReview] = await executor
    .select({ status: review.status, version: review.version })
    .from(review)
    .where(
      and(
        eq(review.deliverableId, record.id),
        eq(review.version, record.currentVersion),
      ),
    )
    .orderBy(desc(review.createdAt))
    .limit(1);

  const [existing] = await executor
    .select()
    .from(delivery)
    .where(eq(delivery.deliverableId, record.id))
    .limit(1);

  return {
    deliverable: {
      id: record.id,
      workspaceId: record.workspaceId,
      projectId: record.projectId,
      jobId: record.jobId,
      status: record.status,
      currentVersion: record.currentVersion,
    },
    job,
    version: version ?? null,
    asset: file ?? null,
    reviewStatus: currentReview?.status ?? null,
    reviewedVersion: currentReview?.version ?? null,
    existing: existing ?? null,
  };
}

/** The facts the pure gate is given, assembled from a loaded context. */
export function deliveryFactsFor(context: DeliveryContext): DeliveryFacts {
  return {
    jobStatus: context.job.status,
    deliverableStatus: context.deliverable.status,
    reviewStatus: context.reviewStatus,
    currentVersion: context.deliverable.currentVersion,
    reviewedVersion: context.reviewedVersion,
    hasFile: Boolean(context.version?.assetId && context.asset),
    fileIsCustomerVisible:
      context.asset?.customerVisible === true &&
      CUSTOMER_FILE_CATEGORIES.includes(context.asset.category),
    alreadyDelivered: context.existing !== null,
  };
}

/**
 * Deliver approved work to the customer.
 *
 * The only writer of a delivery. Returns the existing delivery unchanged when
 * the work has already been delivered, so a repeated or double-clicked
 * submission is a no-op rather than a second record or a second notification.
 */
export async function deliverApprovedWork(
  access: OperatorAccess,
  deliverableId: string,
): Promise<DeliveryResult> {
  assertOperatorAccess(access);
  refuseMalformedId(deliverableId, "Deliverable");

  const db = getDb();

  // The gate is evaluated inside the transaction against the same rows the
  // write will use, so nothing can change between "is this deliverable" and
  // "deliver it".
  const result = await db.transaction(async (tx) => {
    const context = await loadDeliveryContext(deliverableId, tx);
    if (!context) {
      throw new ProductionError("Deliverable not found", "not_found");
    }

    const readiness = deliveryReadiness(deliveryFactsFor(context));

    if (!readiness.ready && readiness.reason === "already_delivered") {
      return { delivery: context.existing!, created: false };
    }

    if (!readiness.ready) {
      throw new ProductionError(
        `This work cannot be delivered: ${readiness.reason}`,
        "not_deliverable",
      );
    }

    const [created] = await tx
      .insert(delivery)
      .values({
        workspaceId: context.deliverable.workspaceId,
        contextType: context.job.contextType,
        projectId: context.deliverable.projectId,
        jobId: context.deliverable.jobId,
        deliverableId: context.deliverable.id,
        version: context.deliverable.currentVersion,
        assetId: context.version?.assetId ?? null,
        deliveredByOperatorId: access.operatorId,
      })
      .returning();

    // The job, its project and every deliverable of that job move to delivered
    // through the one shared transition path, inside the same transaction as the
    // delivery row itself.
    await applyJobTransition(context.job, "delivered", tx);

    return { delivery: created, created: true };
  });

  // The customer hears about it only when something was actually delivered, and
  // only after the write has committed.
  if (result.created) {
    await notifyWorkspaceOwner({
      workspaceId: result.delivery.workspaceId,
      context: result.delivery.contextType,
      type: "work_delivered",
      title: deliveryCustomerCopy.notificationTitle,
      message: deliveryCustomerCopy.notificationMessage,
      // The customer's own copy of this work, not the Library list: it is the
      // page they decided on, and it is a customer route by construction.
      href: `/workspace/${result.delivery.contextType}/work/${result.delivery.deliverableId}`,
    });
  }

  return result;
}

/**
 * Whether a deliverable is ready to be delivered, and why not if it is not.
 *
 * Read-only companion to `deliverApprovedWork` for the internal surface, so the
 * operator sees the real reason rather than discovering it by failing.
 */
export async function deliveryReadinessFor(
  access: OperatorAccess,
  deliverableId: string,
): Promise<{
  readiness: ReturnType<typeof deliveryReadiness>;
  context: DeliveryContext | null;
}> {
  assertOperatorAccess(access);
  refuseMalformedId(deliverableId, "Deliverable");

  const context = await loadDeliveryContext(deliverableId, getDb());
  if (!context) {
    return { readiness: { ready: false, reason: "not_approved" }, context: null };
  }
  return { readiness: deliveryReadiness(deliveryFactsFor(context)), context };
}

/** The delivery of one deliverable, or null (internal read). */
export async function getDeliveryForDeliverable(
  access: OperatorAccess,
  deliverableId: string,
): Promise<Delivery | null> {
  assertOperatorAccess(access);
  refuseMalformedId(deliverableId, "Deliverable");

  const [row] = await getDb()
    .select()
    .from(delivery)
    .where(eq(delivery.deliverableId, deliverableId))
    .limit(1);

  return row ?? null;
}

/** Every delivery made from one job, oldest first (internal read). */
export async function listDeliveriesForJob(
  access: OperatorAccess,
  jobId: string,
): Promise<Delivery[]> {
  assertOperatorAccess(access);
  refuseMalformedId(jobId, "Job");

  return getDb()
    .select()
    .from(delivery)
    .where(eq(delivery.jobId, jobId))
    .orderBy(delivery.createdAt, delivery.id);
}
