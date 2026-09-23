/**
 * Project data access for customer surfaces (Checkpoint 2.4).
 *
 * Scope-first (spec §20.2): every function takes verified workspace access
 * as an explicit parameter and a project id is only ever an additional
 * filter INSIDE that scope. The scope predicate is `dashboardScope` — the
 * shared workspace + context + profile isolation rule — so project reads
 * cannot drift from the dashboard's verified isolation; customer-visible
 * files reuse `visibleFileScope`, the same predicate that guards the secure
 * download route. Workspace identifiers are session-derived, never
 * client-supplied (spec §19). No writes live here: customers view projects,
 * they do not create them.
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";

import {
  dashboardScope,
  visibleFileScope,
} from "@/domains/dashboard/queries";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { getDb } from "@/lib/db";
import {
  asset,
  deliverable,
  delivery,
  productionJob,
  project,
  request,
} from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/**
 * Projects of one context, most recently updated first. Joins the
 * originating request only to expose its category for the list; `hasWork`
 * is true when customer-visible deliverables exist (deliverable statuses
 * that can appear on a customer surface: customer_review/approved/delivered
 * — the same set the secure file route serves). Full list, no cap.
 */
export async function listProjects(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
) {
  const workspaceId = access.workspace.id;
  return getDb()
    .select({
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      requestCategory: request.category,
      hasWork: sql<boolean>`exists (select 1 from ${deliverable} where ${deliverable.workspaceId} = ${workspaceId} and ${deliverable.projectId} = ${project.id} and ${deliverable.status} in ('customer_review', 'approved', 'delivered'))`,
    })
    .from(project)
    .leftJoin(
      request,
      and(eq(request.id, project.requestId), eq(request.workspaceId, workspaceId)),
    )
    .where(dashboardScope(access, context))
    .orderBy(desc(project.updatedAt), desc(project.id));
}

/**
 * One project with its origin request (nullable: projects may exist without
 * a request — handled honestly by callers) and the earliest delivery time
 * (null when nothing has been delivered). Returns null when the id does not
 * resolve inside the caller's scoped context, so callers can 404 without
 * revealing existence.
 */
export async function getProject(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  id: string,
) {
  const workspaceId = access.workspace.id;
  const [row] = await getDb()
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      requestId: request.id,
      requestTitle: request.title,
      requestCategory: request.category,
      requestDescription: request.description,
      requestCreatedAt: request.createdAt,
    })
    .from(project)
    .leftJoin(
      request,
      and(eq(request.id, project.requestId), eq(request.workspaceId, workspaceId)),
    )
    .where(and(dashboardScope(access, context), eq(project.id, id)))
    .limit(1);

  if (!row) {
    return null;
  }

  // The delivery time is read as its own scoped column select rather than a
  // `min()` aggregate: an aggregate arrives from the driver as a string, and
  // the timeline must receive a real Date (spec §9.3 — derived, never faked).
  const [delivered] = await getDb()
    .select({ createdAt: delivery.createdAt })
    .from(delivery)
    .where(
      and(eq(delivery.workspaceId, workspaceId), eq(delivery.projectId, row.id)),
    )
    .orderBy(asc(delivery.createdAt))
    .limit(1);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deliveredAt: delivered?.createdAt ?? null,
    request:
      row.requestId !== null && row.requestTitle !== null
        ? {
            id: row.requestId,
            title: row.requestTitle,
            category: row.requestCategory ?? "",
            description: row.requestDescription,
            createdAt: row.requestCreatedAt ?? row.createdAt,
          }
        : null,
  };
}

/**
 * Customer-visible files of one project, newest first. Guarded by
 * `visibleFileScope` — workspace + context + profile + customerVisible +
 * customer categories + version match + customer-visible deliverable
 * statuses + internal-metadata FK null checks. Returns deliverable ids for
 * the secure download route; storage keys and providers never leave this
 * function (spec §19, §20).
 */
export async function listProjectFiles(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  projectId: string,
) {
  return getDb()
    .select({
      id: asset.id,
      filename: asset.filename,
      deliverableId: deliverable.id,
      workName: deliverable.name,
    })
    .from(asset)
    .innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(and(visibleFileScope(access, context), eq(project.id, projectId)))
    .orderBy(desc(asset.createdAt), desc(asset.id))
    .limit(50);
}