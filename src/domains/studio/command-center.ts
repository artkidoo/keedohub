/**
 * The Studio Command Center (Phase 4.1, spec §6).
 *
 * Answers the operator's first question of the day — "what needs attention?" —
 * with real rows and nothing else. Every number is a count of records that exist,
 * every list is a list of those records, and an empty section says it is empty
 * rather than showing a number nobody verified.
 *
 * It is deliberately NOT an analytics product: no trends, no charts, no rates,
 * no estimates. Seven operational questions, answered:
 *   1. new requests nobody has picked up
 *   2. jobs being produced
 *   3. jobs sitting in internal QA
 *   4. jobs waiting on the customer
 *   5. work the customer sent back for changes
 *   6. approved work not yet delivered
 *   7. what was delivered most recently
 *
 * Every read goes through `OperatorAccess`, so the surface is internal by
 * construction (spec §19).
 */

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { assertOperatorAccess } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import {
  deliverable,
  delivery,
  productionJob,
  project,
  request,
  workspace,
} from "@/lib/db/schema";
import type { JobStatus, RequestStatus } from "@/lib/db/schema";

/** How many rows each attention list shows. */
const ATTENTION_LIMIT = 8;
/** How many recent deliveries the Command Center shows. */
const RECENT_DELIVERY_LIMIT = 6;

/** Request states that mean "the customer is waiting on us to look". */
const OPEN_REQUEST_STATUSES: readonly RequestStatus[] = [
  "submitted",
  "in_validation",
  "changes_needed",
];

/**
 * The states that mean "an operator has something to do next", in the order an
 * operator should look at them: work the customer already sent back first, then
 * work we owe a decision on, then work nobody has started.
 *
 * Pure and exported so the ordering is testable without a database.
 */
export const attentionOrder: readonly JobStatus[] = [
  "changes_requested",
  "internal_qa",
  "customer_review",
  "approved",
  "incoming",
  "briefing",
];

/** Where a state sits in the attention order; unknown states sort last. */
export function attentionRank(status: JobStatus): number {
  const index = attentionOrder.indexOf(status);
  return index === -1 ? attentionOrder.length : index;
}

/** One job, as the Command Center shows it. */
export type AttentionJob = {
  id: string;
  title: string;
  status: JobStatus;
  productionType: string;
  priority: number;
  workspaceSlug: string;
  contextType: "brand" | "artist";
  projectId: string;
  projectName: string;
  assignedOperatorId: string | null;
  updatedAt: Date;
  createdAt: Date;
};

/** One request waiting to be picked up. */
export type NewRequest = {
  id: string;
  title: string;
  category: string;
  status: RequestStatus;
  workspaceSlug: string;
  contextType: "brand" | "artist";
  createdAt: Date;
};

/** One delivery that actually happened. */
export type RecentDelivery = {
  id: string;
  workspaceSlug: string;
  contextType: "brand" | "artist";
  projectName: string;
  deliverableName: string;
  version: number;
  filename: string | null;
  createdAt: Date;
};

export type CommandCenter = {
  counts: {
    newRequests: number;
    inProduction: number;
    awaitingInternalQa: number;
    awaitingCustomer: number;
    changesRequested: number;
    awaitingDelivery: number;
    deliveredTotal: number;
  };
  newRequests: NewRequest[];
  /** Jobs that need an operator now, in attention order. */
  attention: AttentionJob[];
  recentDeliveries: RecentDelivery[];
};

/** Jobs in the given states, joined to the customer they belong to. */
async function jobsInStates(
  statuses: readonly JobStatus[],
  limit: number,
): Promise<AttentionJob[]> {
  if (!statuses.length) return [];

  return getDb()
    .select({
      id: productionJob.id,
      title: productionJob.title,
      status: productionJob.status,
      productionType: productionJob.productionType,
      priority: productionJob.priority,
      workspaceSlug: workspace.slug,
      contextType: productionJob.contextType,
      projectId: productionJob.projectId,
      projectName: project.name,
      assignedOperatorId: productionJob.assignedOperatorId,
      updatedAt: productionJob.updatedAt,
      createdAt: productionJob.createdAt,
    })
    .from(productionJob)
    .innerJoin(project, eq(project.id, productionJob.projectId))
    .innerJoin(workspace, eq(workspace.id, productionJob.workspaceId))
    .where(inArray(productionJob.status, [...statuses]))
    // Oldest first within a state: work that has waited longest is the work most
    // likely to be forgotten.
    .orderBy(productionJob.createdAt, productionJob.id)
    .limit(limit);
}

/**
 * Unstarted requests, newest first.
 *
 * Newest first on purpose: the Command Center is a glanceable list, so the
 * most recently arrived work — the work nobody has looked at yet — comes first.
 * The count function beside it answers "how many in total" with real rows, so
 * nothing is hidden by the limit.
 */
function openRequestsQuery(limit?: number) {
  const query = getDb()
    .select({
      id: request.id,
      title: request.title,
      category: request.category,
      status: request.status,
      workspaceSlug: workspace.slug,
      contextType: request.contextType,
      createdAt: request.createdAt,
    })
    .from(request)
    .innerJoin(workspace, eq(workspace.id, request.workspaceId))
    .leftJoin(project, eq(project.requestId, request.id))
    .where(
      and(
        inArray(request.status, [...OPEN_REQUEST_STATUSES]),
        sql`${project.id} is null`,
      ),
    )
    .orderBy(desc(request.createdAt), desc(request.id));

  return limit ? query.limit(limit) : query;
}

/** The count of requests nobody has started work on yet. */
async function countUnstartedRequests(): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(request)
    .leftJoin(project, eq(project.requestId, request.id))
    .where(
      and(
        inArray(request.status, [...OPEN_REQUEST_STATUSES]),
        sql`${project.id} is null`,
      ),
    );

  return row?.value ?? 0;
}

/**
 * Everything the Command Center shows, in one read.
 *
 * One function rather than a dozen exported queries, so the screen cannot
 * disagree with itself and the surface has exactly one authorisation entry point.
 */
export async function getCommandCenter(
  access: OperatorAccess,
): Promise<CommandCenter> {
  assertOperatorAccess(access);

  const db = getDb();
  const jobCount = (status: JobStatus) =>
    db
      .select({ value: count() })
      .from(productionJob)
      .where(eq(productionJob.status, status));

  const [
    unstartedRequests,
    inProduction,
    awaitingQa,
    awaitingCustomer,
    changesRequested,
    approved,
    delivered,
  ] = await Promise.all([
    countUnstartedRequests(),
    jobCount("in_production"),
    jobCount("internal_qa"),
    jobCount("customer_review"),
    jobCount("changes_requested"),
    jobCount("approved"),
    db.select({ value: count() }).from(delivery),
  ]);

  const [newRequests, attention, recentDeliveries] = await Promise.all([
    openRequestsQuery(ATTENTION_LIMIT),
    jobsInStates(attentionOrder, ATTENTION_LIMIT),
    db
      .select({
        id: delivery.id,
        workspaceSlug: workspace.slug,
        contextType: delivery.contextType,
        projectName: project.name,
        deliverableName: deliverable.name,
        version: delivery.version,
        filename: sql<string | null>`(
          select a.filename from asset a where a.id = ${delivery.assetId}
        )`,
        createdAt: delivery.createdAt,
      })
      .from(delivery)
      .innerJoin(workspace, eq(workspace.id, delivery.workspaceId))
      .innerJoin(project, eq(project.id, delivery.projectId))
      .innerJoin(deliverable, eq(deliverable.id, delivery.deliverableId))
      .orderBy(desc(delivery.createdAt), desc(delivery.id))
      .limit(RECENT_DELIVERY_LIMIT),
  ]);

  return {
    counts: {
      newRequests: unstartedRequests,
      inProduction: inProduction[0]?.value ?? 0,
      awaitingInternalQa: awaitingQa[0]?.value ?? 0,
      awaitingCustomer: awaitingCustomer[0]?.value ?? 0,
      changesRequested: changesRequested[0]?.value ?? 0,
      awaitingDelivery: approved[0]?.value ?? 0,
      deliveredTotal: delivered[0]?.value ?? 0,
    },
    newRequests,
    attention,
    recentDeliveries,
  };
}
