/**
 * Studio request intake and detail (Phase 4.1, spec §7, §8).
 *
 * The operator's view of what customers have asked for. It is a read model over
 * the SAME `request` table the customer writes to — there is no second intake
 * system, no re-typing of what the customer already said, and no copy of the
 * request in the Studio.
 *
 * Everything is cross-customer by design, which is exactly why every function
 * takes `OperatorAccess`: the operator principal is the authorisation, and there
 * is no query here that can be issued without one (spec §19, §20.2).
 *
 * A request's related project and job are resolved by the request id the request
 * itself carries, never by anything supplied by the caller.
 */

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { assertOperatorAccess, isRealId } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import {
  asset,
  brandProfile,
  artistProfile,
  deliverable,
  productionJob,
  project,
  request,
  workspace,
} from "@/lib/db/schema";
import type { Request, RequestStatus } from "@/lib/db/schema";

/** Longest Studio list served in one read. */
const STUDIO_LIST_LIMIT = 200;

/** Which requests a filter can ask for. */
export type StudioRequestFilter = {
  /** Request states to include. Omitted means every state. */
  statuses?: readonly RequestStatus[];
  /** Brand or Artist context. Omitted means both. */
  contexts?: readonly ("brand" | "artist")[];
  /** Only requests with no project started yet. */
  unstartedOnly?: boolean;
  /** Restrict to one customer workspace. */
  workspaceId?: string;
  limit?: number;
};

/** One row of the Studio request list. */
export type StudioRequestRow = {
  id: string;
  title: string;
  category: string;
  status: RequestStatus;
  workspaceId: string;
  workspaceSlug: string;
  contextType: "brand" | "artist";
  profileName: string | null;
  createdAt: Date;
  projectId: string | null;
  projectName: string | null;
  projectStatus: string | null;
  jobId: string | null;
  jobStatus: string | null;
};

/**
 * The request list, newest first.
 *
 * The left joins to the project and job are how "what has been started from this
 * request" is answered without a second table or a second source of truth.
 */
export async function listStudioRequests(
  access: OperatorAccess,
  filter: StudioRequestFilter = {},
): Promise<StudioRequestRow[]> {
  assertOperatorAccess(access);

  const limit = Math.min(filter.limit ?? STUDIO_LIST_LIMIT, STUDIO_LIST_LIMIT);
  const conditions = [
    filter.statuses?.length ? inArray(request.status, [...filter.statuses]) : undefined,
    filter.contexts?.length
      ? inArray(request.contextType, [...filter.contexts])
      : undefined,
    filter.workspaceId ? eq(request.workspaceId, filter.workspaceId) : undefined,
    filter.unstartedOnly ? sql`${project.id} is null` : undefined,
  ].filter((part) => part !== undefined);

  return getDb()
    .select({
      id: request.id,
      title: request.title,
      category: request.category,
      status: request.status,
      workspaceId: request.workspaceId,
      workspaceSlug: workspace.slug,
      contextType: request.contextType,
      profileName: sql<string | null>`coalesce(${brandProfile.name}, ${artistProfile.name})`,
      createdAt: request.createdAt,
      projectId: project.id,
      projectName: project.name,
      projectStatus: project.status,
      jobId: productionJob.id,
      jobStatus: productionJob.status,
    })
    .from(request)
    .innerJoin(workspace, eq(workspace.id, request.workspaceId))
    .leftJoin(brandProfile, eq(brandProfile.id, request.brandProfileId))
    .leftJoin(artistProfile, eq(artistProfile.id, request.artistProfileId))
    .leftJoin(project, eq(project.requestId, request.id))
    .leftJoin(productionJob, eq(productionJob.projectId, project.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(request.createdAt), desc(request.id))
    .limit(limit);
}

/** Counts per status, so the list can be filtered honestly. */
export async function countStudioRequestsByStatus(
  access: OperatorAccess,
): Promise<Record<RequestStatus, number>> {
  assertOperatorAccess(access);

  const rows = await getDb()
    .select({ status: request.status, value: count() })
    .from(request)
    .groupBy(request.status);

  const totals: Record<RequestStatus, number> = {
    submitted: 0,
    in_validation: 0,
    changes_needed: 0,
    accepted: 0,
    declined: 0,
  };

  for (const row of rows) {
    totals[row.status] = row.value;
  }

  return totals;
}

/**
 * One request in full, with the chain it produced.
 *
 * `requestId` comes from the route, so it is validated as a UUID before any
 * query: a malformed id is "not found", never a database type error. A missing
 * id and an id that belongs to a customer who deleted their account both resolve
 * to null, and the page turns that into a 404.
 *
 * The related files are the customer's own reference material and any assets
 * already attached to the project — read through the same asset table the secure
 * customer route uses, so the Studio sees exactly the files that exist and never
 * a file it invented.
 */
export async function getStudioRequest(
  access: OperatorAccess,
  requestId: string,
): Promise<{
  request: Request;
  workspaceSlug: string;
  profileName: string | null;
  project: {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
  } | null;
  jobs: {
    id: string;
    title: string;
    status: string;
    productionType: string;
    assignedOperatorId: string | null;
  }[];
  deliverables: {
    id: string;
    name: string;
    status: string;
    currentVersion: number;
    jobId: string;
  }[];
  files: {
    id: string;
    filename: string;
    category: string;
    version: number;
    customerVisible: boolean;
    sizeBytes: number | null;
  }[];
} | null> {
  assertOperatorAccess(access);
  if (!isRealId(requestId)) return null;

  const db = getDb();

  const [record] = await db
    .select()
    .from(request)
    .where(eq(request.id, requestId))
    .limit(1);

  if (!record) return null;

  const [owner] = await db
    .select({ slug: workspace.slug })
    .from(workspace)
    .where(eq(workspace.id, record.workspaceId))
    .limit(1);

  const [profile] = await db
    .select({
      name: sql<string | null>`coalesce(${brandProfile.name}, ${artistProfile.name})`,
    })
    .from(request)
    .leftJoin(brandProfile, eq(brandProfile.id, request.brandProfileId))
    .leftJoin(artistProfile, eq(artistProfile.id, request.artistProfileId))
    .where(eq(request.id, record.id))
    .limit(1);

  const [made] = await db
    .select({
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.createdAt,
    })
    .from(project)
    .where(and(eq(project.requestId, record.id), eq(project.workspaceId, record.workspaceId)))
    .limit(1);

  const jobs = made
    ? await db
        .select({
          id: productionJob.id,
          title: productionJob.title,
          status: productionJob.status,
          productionType: productionJob.productionType,
          assignedOperatorId: productionJob.assignedOperatorId,
        })
        .from(productionJob)
        .where(eq(productionJob.projectId, made.id))
        .orderBy(asc(productionJob.createdAt))
    : [];

  const deliverables = made
    ? await db
        .select({
          id: deliverable.id,
          name: deliverable.name,
          status: deliverable.status,
          currentVersion: deliverable.currentVersion,
          jobId: deliverable.jobId,
        })
        .from(deliverable)
        .where(eq(deliverable.projectId, made.id))
        .orderBy(asc(deliverable.createdAt))
    : [];

  const files = made
    ? await db
        .select({
          id: asset.id,
          filename: asset.filename,
          category: asset.category,
          version: asset.version,
          customerVisible: asset.customerVisible,
          sizeBytes: asset.sizeBytes,
        })
        .from(asset)
        .where(eq(asset.projectId, made.id))
        .orderBy(desc(asset.createdAt))
        .limit(50)
    : [];

  return {
    request: record,
    workspaceSlug: owner?.slug ?? "—",
    profileName: profile?.name ?? null,
    project: made ?? null,
    jobs,
    deliverables,
    files,
  };
}

/** Recent requests for one customer workspace (used by the customer detail). */
export async function listWorkspaceRequests(
  access: OperatorAccess,
  workspaceId: string,
  limit = 10,
): Promise<StudioRequestRow[]> {
  return listStudioRequests(access, { workspaceId, limit });
}
