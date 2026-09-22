import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { getDb } from "@/lib/db";
import { asset, deliverable, delivery, productionJob, project, request, review } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/** Access must come from requireWorkspaceContext, never client IDs. */
export function dashboardScope(access: WorkspaceContextAccess, context: WorkspaceContext) {
  const profile = context === "brand" ? access.brandProfile : access.artistProfile;
  if (!profile || profile.workspaceId !== access.workspace.id) throw new Error("Profile unavailable");
  return and(
    eq(project.workspaceId, access.workspace.id),
    eq(project.contextType, context),
    eq(context === "brand" ? project.brandProfileId : project.artistProfileId, profile.id),
    isNull(context === "brand" ? project.artistProfileId : project.brandProfileId),
  );
}

/** Fixed query count; finished work is independent of the active-project limit. */
export async function getDashboardData(access: WorkspaceContextAccess, context: WorkspaceContext) {
  const db = getDb();
  const workspaceId = access.workspace.id;
  const scope = dashboardScope(access, context);
  const profile = (context === "brand" ? access.brandProfile : access.artistProfile)!;
  const workQuery = (statuses: (typeof deliverable.$inferSelect.status)[]) => db
    .select({
      id: deliverable.id, name: deliverable.name, status: deliverable.status,
      version: deliverable.currentVersion, updatedAt: deliverable.updatedAt,
      projectName: project.name,
      delivered: sql<boolean>`exists (select 1 from ${delivery} where ${delivery.workspaceId} = ${workspaceId} and ${delivery.projectId} = ${project.id} and ${delivery.deliverableId} = ${deliverable.id} and ${delivery.version} = ${deliverable.currentVersion})`,
    })
    .from(deliverable)
    .innerJoin(project, eq(project.id, deliverable.projectId))
    .innerJoin(productionJob, and(eq(productionJob.id, deliverable.jobId), eq(productionJob.projectId, project.id), eq(productionJob.workspaceId, workspaceId)))
    .where(and(scope, eq(deliverable.workspaceId, workspaceId), inArray(deliverable.status, statuses),
      // A recorded decision on this version is no longer pending review.
      statuses.includes("customer_review") ? sql`not exists (select 1 from ${review} where ${review.workspaceId} = ${workspaceId} and ${review.deliverableId} = ${deliverable.id} and ${review.version} = ${deliverable.currentVersion})` : undefined,
    ))
    .orderBy(desc(deliverable.updatedAt), desc(deliverable.id)).limit(6);

  const [created, needsReview, projects, requests] = await Promise.all([
    workQuery(["approved", "delivered"]),
    workQuery(["customer_review"]),
    db.select({ id: project.id, name: project.name, status: project.status, updatedAt: project.updatedAt })
      .from(project).where(and(scope, inArray(project.status, ["requested", "in_production", "in_review", "changes_requested", "approved"])))
      .orderBy(desc(project.updatedAt), desc(project.id)).limit(6),
    db.select({ id: request.id, name: request.title, status: request.status, updatedAt: request.updatedAt })
      .from(request).where(and(eq(request.workspaceId, workspaceId), eq(request.contextType, context),
        eq(context === "brand" ? request.brandProfileId : request.artistProfileId, profile.id),
        isNull(context === "brand" ? request.artistProfileId : request.brandProfileId),
        inArray(request.status, ["submitted", "in_validation", "changes_needed"])))
      .orderBy(desc(request.updatedAt), desc(request.id)).limit(6),
  ]);
  return { created, needsReview, projects, requests };
}

/** Shared by the file list and byte route: fail closed on conflicting relationships. */
export function visibleFileScope(access: WorkspaceContextAccess, context: WorkspaceContext) {
  const profile = (context === "brand" ? access.brandProfile : access.artistProfile)!;
  return and(dashboardScope(access, context),
    eq(asset.workspaceId, access.workspace.id), eq(deliverable.workspaceId, access.workspace.id),
    eq(productionJob.workspaceId, access.workspace.id), eq(productionJob.projectId, project.id),
    eq(asset.customerVisible, true), inArray(asset.category, ["delivered", "library"]),
    eq(asset.version, deliverable.currentVersion),
    inArray(deliverable.status, ["customer_review", "approved", "delivered"]),
    or(isNull(asset.projectId), eq(asset.projectId, project.id)),
    or(isNull(asset.jobId), eq(asset.jobId, deliverable.jobId)),
    or(isNull(context === "brand" ? asset.brandProfileId : asset.artistProfileId), eq(context === "brand" ? asset.brandProfileId : asset.artistProfileId, profile.id)),
    isNull(context === "brand" ? asset.artistProfileId : asset.brandProfileId),
  );
}

export async function listWorkFiles(access: WorkspaceContextAccess, context: WorkspaceContext, id: string) {
  return getDb().select({ id: asset.id, filename: asset.filename })
    .from(asset).innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(and(visibleFileScope(access, context), eq(deliverable.id, id)))
    .orderBy(desc(asset.createdAt), desc(asset.id)).limit(50);
}

export async function getWork(access: WorkspaceContextAccess, context: WorkspaceContext, id: string) {
  const [work] = await getDb().select({
    id: deliverable.id, name: deliverable.name, status: deliverable.status,
    version: deliverable.currentVersion, projectName: project.name,
  }).from(deliverable)
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, and(eq(productionJob.id, deliverable.jobId), eq(productionJob.projectId, project.id), eq(productionJob.workspaceId, access.workspace.id)))
    .where(and(dashboardScope(access, context), eq(deliverable.workspaceId, access.workspace.id), eq(deliverable.id, id),
      inArray(deliverable.status, ["customer_review", "approved", "delivered"])))
    .limit(1);
  return work ?? null;
}

export async function getWorkFile(access: WorkspaceContextAccess, context: WorkspaceContext, workId: string, fileId: string) {
  const [file] = await getDb().select({ id: asset.id, deliverableId: deliverable.id })
    .from(asset).innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(and(visibleFileScope(access, context), eq(deliverable.id, workId), eq(asset.id, fileId))).limit(1);
  return file ?? null;
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
export type DashboardWork = DashboardData["created"][number];
