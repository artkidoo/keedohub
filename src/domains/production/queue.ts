/**
 * Private production queue (Phase 3.0).
 *
 * The queue is a read model over `production_job`, and it is internal: every
 * function takes `OperatorAccess`, so a query cannot be issued without a
 * principal already proven to be KeedoHub staff. There is no "list jobs by id
 * alone" helper, and nothing here is reachable from a customer surface.
 *
 * Filtering is one explicit filter object rather than a chain of optional
 * arguments, because the list, the counts and (later) the Studio queue screen
 * must not drift apart.
 */

import { and, asc, count, eq, gte, inArray, isNull, lte, type SQL } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import { jobLifecycle } from "./lifecycle";
import { getDb } from "@/lib/db";
import { brandProfile, artistProfile, productionJob, project, workspace } from "@/lib/db/schema";
import type { JobStatus } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/** Longest queue page served in one read. */
const QUEUE_PAGE_LIMIT = 200;

/** What the queue can be narrowed by (spec §10.3). */
export type ProductionQueueFilter = {
  /** Queue states to include. Omitted means every state. */
  statuses?: readonly JobStatus[];
  /** Brand or Artist context. Omitted means both. */
  contexts?: readonly WorkspaceContext[];
  /** Production type, e.g. "cover_artwork". */
  productionType?: string;
  /** Most urgent priority still included (lower number = more urgent). */
  priorityAtMost?: number;
  /** Least urgent priority still included. */
  priorityAtLeast?: number;
  /** Created on or after this instant. */
  createdSince?: Date;
  /** Created on or before this instant. */
  createdUntil?: Date;
  /**
   * Restrict to one operator's jobs (`null` narrows to unassigned work).
   * Omitted means every job, assigned or not.
   */
  assignedOperatorId?: string | null;
  /** Restrict to one customer workspace. */
  workspaceId?: string;
  limit?: number;
};

/** Turn a filter into one SQL predicate, shared by every queue read. */
function queuePredicate(filter: ProductionQueueFilter): SQL | undefined {
  const assigned =
    filter.assignedOperatorId === null
      ? isNull(productionJob.assignedOperatorId)
      : filter.assignedOperatorId
        ? eq(productionJob.assignedOperatorId, filter.assignedOperatorId)
        : undefined;

  const parts = [
    filter.statuses?.length ? inArray(productionJob.status, [...filter.statuses]) : undefined,
    filter.contexts?.length ? inArray(productionJob.contextType, [...filter.contexts]) : undefined,
    filter.productionType ? eq(productionJob.productionType, filter.productionType) : undefined,
    filter.priorityAtMost !== undefined ? lte(productionJob.priority, filter.priorityAtMost) : undefined,
    filter.priorityAtLeast !== undefined ? gte(productionJob.priority, filter.priorityAtLeast) : undefined,
    filter.createdSince ? gte(productionJob.createdAt, filter.createdSince) : undefined,
    filter.createdUntil ? lte(productionJob.createdAt, filter.createdUntil) : undefined,
    filter.workspaceId ? eq(productionJob.workspaceId, filter.workspaceId) : undefined,
    assigned,
  ].filter((part): part is SQL => part !== undefined);

  return parts.length ? and(...parts) : undefined;
}

/**
 * Guard: a queue read without a proven operator principal is a programming
 * error and must fail loudly rather than quietly returning everything.
 */
function assertOperator(access: OperatorAccess): void {
  if (!access?.operatorId || !access.userId) {
    throw new Error("Production queue access requires a verified operator");
  }
}


/**
 * The queue itself, most urgent first and oldest first within a priority.
 *
 * `access` is not read for the query — it is the proof that the caller may
 * issue it at all. Studio reads are cross-customer by design (spec §19.3),
 * which is exactly why they can only be reached by an operator principal.
 */
export async function listProductionQueue(
  access: OperatorAccess,
  filter: ProductionQueueFilter = {},
) {
  assertOperator(access);

  const limit = Math.min(filter.limit ?? QUEUE_PAGE_LIMIT, QUEUE_PAGE_LIMIT);

  return getDb()
    .select({
      id: productionJob.id,
      workspaceId: productionJob.workspaceId,
      workspaceSlug: workspace.slug,
      contextType: productionJob.contextType,
      projectId: productionJob.projectId,
      projectName: project.name,
      requestId: productionJob.requestId,
      title: productionJob.title,
      productionType: productionJob.productionType,
      status: productionJob.status,
      priority: productionJob.priority,
      assignedOperatorId: productionJob.assignedOperatorId,
      startedAt: productionJob.startedAt,
      completedAt: productionJob.completedAt,
      createdAt: productionJob.createdAt,
      updatedAt: productionJob.updatedAt,
    })
    .from(productionJob)
    .innerJoin(project, eq(project.id, productionJob.projectId))
    .innerJoin(workspace, eq(workspace.id, productionJob.workspaceId))
    .where(queuePredicate(filter))
    .orderBy(asc(productionJob.priority), asc(productionJob.createdAt), asc(productionJob.id))
    .limit(limit);
}

/**
 * How many jobs sit in each queue state under the same filter.
 *
 * States with no jobs are reported as zero rather than omitted, so a Studio
 * column can be shown honestly empty instead of guessed at.
 */
export async function countProductionQueueByStatus(
  access: OperatorAccess,
  filter: ProductionQueueFilter = {},
): Promise<Record<JobStatus, number>> {
  assertOperator(access);

  const rows = await getDb()
    .select({ status: productionJob.status, value: count() })
    .from(productionJob)
    .where(queuePredicate(filter))
    .groupBy(productionJob.status);

  const totals = Object.fromEntries(jobLifecycle.map((status) => [status, 0])) as Record<
    JobStatus,
    number
  >;

  for (const row of rows) {
    totals[row.status] = row.value;
  }

  return totals;
}

/**
 * One job in full, for the private production surface.
 *
 * Loaded by id because the caller is already proven to be internal. The
 * customer-side rule ("never load by id alone") exists to protect customers
 * from each other and is enforced everywhere a customer is the caller.
 */
export async function getProductionJob(access: OperatorAccess, jobId: string) {
  assertOperator(access);

  const [row] = await getDb()
    .select({
      id: productionJob.id,
      workspaceId: productionJob.workspaceId,
      workspaceSlug: workspace.slug,
      contextType: productionJob.contextType,
      brandProfileId: productionJob.brandProfileId,
      artistProfileId: productionJob.artistProfileId,
      projectId: productionJob.projectId,
      projectName: project.name,
      projectStatus: project.status,
      projectReleaseType: project.releaseType,
      requestId: productionJob.requestId,
      title: productionJob.title,
      description: productionJob.description,
      productionType: productionJob.productionType,
      status: productionJob.status,
      priority: productionJob.priority,
      brief: productionJob.brief,
      assignedOperatorId: productionJob.assignedOperatorId,
      startedAt: productionJob.startedAt,
      completedAt: productionJob.completedAt,
      createdAt: productionJob.createdAt,
      updatedAt: productionJob.updatedAt,
      brandProfileName: brandProfile.name,
      artistProfileName: artistProfile.name,
    })
    .from(productionJob)
    .innerJoin(project, eq(project.id, productionJob.projectId))
    .innerJoin(workspace, eq(workspace.id, productionJob.workspaceId))
    .leftJoin(brandProfile, eq(brandProfile.id, productionJob.brandProfileId))
    .leftJoin(artistProfile, eq(artistProfile.id, productionJob.artistProfileId))
    .where(eq(productionJob.id, jobId))
    .limit(1);

  return row ?? null;
}

/** Where a job sits in the lifecycle, for internal ordering. */
export function queuePosition(status: JobStatus): number {
  return jobLifecycle.indexOf(status);
}
