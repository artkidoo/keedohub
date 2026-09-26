/**
 * Production chain writes (Phase 3.0): request → project → production job.
 *
 * Every function here takes `OperatorAccess`, because creating and moving
 * production is KeedoHub's work, not the customer's. The customer side has no
 * write path to a project or a job at all (the Phase 2 projects module is
 * read-only by design).
 *
 * Scope-first rule, mirrored from the customer side (spec §20.2): the chain is
 * never assembled from submitted identifiers. A caller may name a request, a
 * project or a job, and everything else — workspace, context, brand/artist
 * profile, originating request — is inherited from the record that was named,
 * so a caller cannot graft a job onto another customer's work.
 */

import { and, eq } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import {
  CUSTOMER_STATUS_BEFORE_PRODUCTION,
  canTransition,
  customerProjectStatusForJob,
  hasStarted,
  isTerminalJobStatus,
} from "./lifecycle";
import { getDb } from "@/lib/db";
import { operator, productionJob, project, request } from "@/lib/db/schema";
import { PRODUCTION_PRIORITY_MAX, PRODUCTION_PRIORITY_MIN } from "@/lib/db/schema";
import type { JobStatus, ProductionJob, Project } from "@/lib/db/schema";

/** Raised when a production write is refused. Never shown to a customer. */
export class ProductionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_found"
      | "invalid_transition"
      | "invalid_priority"
      | "invalid_operator"
      | "conflict",
  ) {
    super(message);
    this.name = "ProductionError";
  }
}

/**
 * Create the project that fulfils a customer request.
 *
 * Everything about the project is inherited from the request, so the two can
 * never disagree about who it belongs to: workspace, context, the matching
 * brand/artist profile, and the request itself.
 *
 * Idempotent by design: a request that already has a project returns that
 * project instead of creating a second one, so a repeated call (a double
 * click, a retried job) cannot fork the chain.
 */
export async function createProjectFromRequest(
  access: OperatorAccess,
  requestId: string,
  overrides: { name?: string; description?: string } = {},
): Promise<Project> {
  assertOperator(access);

  const db = getDb();

  const [source] = await db
    .select()
    .from(request)
    .where(eq(request.id, requestId))
    .limit(1);

  if (!source) {
    throw new ProductionError("Request not found", "not_found");
  }

  const [existing] = await db
    .select()
    .from(project)
    .where(
      and(eq(project.requestId, source.id), eq(project.workspaceId, source.workspaceId)),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(project)
    .values({
      workspaceId: source.workspaceId,
      contextType: source.contextType,
      brandProfileId: source.brandProfileId,
      artistProfileId: source.artistProfileId,
      requestId: source.id,
      name: overrides.name?.trim() || source.title,
      description: overrides.description?.trim() || source.description,
      // A project starts at the customer-facing status for "accepted, being
      // set up". It moves forward as real jobs progress (see transitionJob).
      status: CUSTOMER_STATUS_BEFORE_PRODUCTION,
    })
    .returning();

  return created;
}

/** Bounded, honest priority validation before a write. */
function assertPriority(priority: number): void {
  if (
    !Number.isInteger(priority) ||
    priority < PRODUCTION_PRIORITY_MIN ||
    priority > PRODUCTION_PRIORITY_MAX
  ) {
    throw new ProductionError(
      `Priority must be a whole number between ${PRODUCTION_PRIORITY_MIN} and ${PRODUCTION_PRIORITY_MAX}`,
      "invalid_priority",
    );
  }
}

/** `assertOperator` shared with the queue: a production write needs proof. */
function assertOperator(access: OperatorAccess): void {
  if (!access?.operatorId || !access.userId) {
    throw new Error("Production writes require a verified operator");
  }
}

/**
 * Create a production job for a project.
 *
 * The job inherits workspace, context, the brand/artist profile and the
 * originating request from the project, so the whole chain agrees by
 * construction. `productionType` defaults to the request's category — the
 * customer's own words for what they asked for.
 *
 * A newly created job is `incoming`: queued, not started.
 */
export async function createProductionJobForProject(
  access: OperatorAccess,
  projectId: string,
  input: {
    title?: string;
    productionType?: string;
    description?: string;
    priority?: number;
    brief?: unknown;
    assignedOperatorId?: string | null;
  } = {},
): Promise<ProductionJob> {
  assertOperator(access);

  const db = getDb();
  const priority = input.priority ?? 50;
  assertPriority(priority);

  const [target] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  if (!target) {
    throw new ProductionError("Project not found", "not_found");
  }

  const assignedOperatorId = await resolveAssignee(db, input.assignedOperatorId);

  // The customer's own category is the honest default for production type.
  let inheritedType = "general";
  if (target.requestId) {
    const [source] = await db
      .select({ category: request.category })
      .from(request)
      .where(eq(request.id, target.requestId))
      .limit(1);
    if (source?.category) {
      inheritedType = source.category;
    }
  }

  const [created] = await db
    .insert(productionJob)
    .values({
      workspaceId: target.workspaceId,
      projectId: target.id,
      contextType: target.contextType,
      brandProfileId: target.brandProfileId,
      artistProfileId: target.artistProfileId,
      requestId: target.requestId,
      title: input.title?.trim() || target.name,
      description: input.description?.trim() || null,
      productionType: input.productionType?.trim() || inheritedType,
      status: "incoming",
      priority,
      brief: (input.brief ?? null) as never,
      assignedOperatorId,
    })
    .returning();

  return created;
}

/**
 * An assignment must name a live operator; a string is not an assignment.
 * Returns the resolved id, or null for "unassigned".
 */
async function resolveAssignee(
  db: ReturnType<typeof getDb>,
  candidate: string | null | undefined,
): Promise<string | null> {
  if (!candidate) return null;

  const [assignee] = await db
    .select({ id: operator.id, active: operator.active })
    .from(operator)
    .where(eq(operator.id, candidate))
    .limit(1);

  if (!assignee || !assignee.active) {
    throw new ProductionError("Assigned operator not found", "invalid_operator");
  }

  return assignee.id;
}

/**
 * Move a job to its next state, or refuse.
 *
 * The guard is the lifecycle table: skipping internal QA, or jumping from
 * production straight to delivered, is refused here so unverified work cannot
 * reach a customer by accident. Timestamps follow the state (`started_at` once
 * real work begins, `completed_at` on a terminal state), and the
 * customer-facing project status is kept truthful by the same call.
 */
export async function transitionJob(
  access: OperatorAccess,
  jobId: string,
  next: JobStatus,
): Promise<ProductionJob> {
  assertOperator(access);

  const db = getDb();

  const [job] = await db
    .select()
    .from(productionJob)
    .where(eq(productionJob.id, jobId))
    .limit(1);

  if (!job) {
    throw new ProductionError("Job not found", "not_found");
  }

  if (!canTransition(job.status, next)) {
    throw new ProductionError(
      `A job cannot move from ${job.status} to ${next}`,
      "invalid_transition",
    );
  }

  const now = new Date();

  const [updated] = await db
    .update(productionJob)
    .set({
      status: next,
      startedAt: job.startedAt ?? (hasStarted(next) ? now : null),
      completedAt: isTerminalJobStatus(next) ? now : null,
      updatedAt: now,
    })
    .where(eq(productionJob.id, job.id))
    .returning();

  // The customer's project status is derived, never hand-written (spec §9.4).
  await db
    .update(project)
    .set({ status: customerProjectStatusForJob(next), updatedAt: now })
    .where(eq(project.id, job.projectId));

  return updated;
}

/** Assign (or unassign) a job. */
export async function assignProductionJob(
  access: OperatorAccess,
  jobId: string,
  assignedOperatorId: string | null,
): Promise<ProductionJob> {
  assertOperator(access);

  const db = getDb();

  const [job] = await db
    .select({ id: productionJob.id })
    .from(productionJob)
    .where(eq(productionJob.id, jobId))
    .limit(1);

  if (!job) {
    throw new ProductionError("Job not found", "not_found");
  }

  const resolved = await resolveAssignee(db, assignedOperatorId);

  const [updated] = await db
    .update(productionJob)
    .set({ assignedOperatorId: resolved, updatedAt: new Date() })
    .where(eq(productionJob.id, jobId))
    .returning();

  return updated;
}

/** Jobs of one project, oldest first. Internal read. */
export async function listJobsForProject(access: OperatorAccess, projectId: string) {
  assertOperator(access);

  return getDb()
    .select({
      id: productionJob.id,
      title: productionJob.title,
      productionType: productionJob.productionType,
      status: productionJob.status,
      priority: productionJob.priority,
      assignedOperatorId: productionJob.assignedOperatorId,
      createdAt: productionJob.createdAt,
      updatedAt: productionJob.updatedAt,
    })
    .from(productionJob)
    .where(eq(productionJob.projectId, projectId))
    .orderBy(productionJob.createdAt);
}


