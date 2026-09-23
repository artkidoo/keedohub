/**
 * Output data access for customer surfaces (Checkpoint 2.5).
 *
 * Scope-first (spec §20.2): access is always the session-derived triple from
 * `requireWorkspaceContext`, and the isolation rules are the SAME predicates
 * the dashboard, projects and secure file route already use:
 *   - `dashboardScope`   — workspace + context + profile
 *   - `visibleFileScope` — customer-visible files (customer flag, customer
 *     categories, current version, customer-visible deliverable status,
 *     conflicting-relationship null checks)
 * Nothing here writes, and no storage key, provider or path leaves this
 * module. Deliverable ids are used for routing only; they are never printed.
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { dashboardScope, visibleFileScope } from "@/domains/dashboard/queries";
import {
  outputFamilyForType,
  outputTypesFor,
} from "@/domains/outputs/taxonomy";
import type { OutputFamily } from "@/domains/outputs/taxonomy";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { getDb } from "@/lib/db";
import { asset, deliverable, productionJob, project } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/**
 * Statuses a customer may see (spec §11.2). Identical set to the one the
 * secure file route enforces — duplicated here deliberately so this
 * checkpoint adds no edit to the verified 2.3/2.4 query module.
 */
const customerVisibleStatuses = [
  "customer_review",
  "approved",
  "delivered",
] as const;

/** Deliverables of one family that are customer-visible in this context. */
async function familyDeliverables(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  family: OutputFamily,
) {
  const workspaceId = access.workspace.id;
  return getDb()
    .select({
      id: deliverable.id,
      name: deliverable.name,
      type: deliverable.type,
      status: deliverable.status,
      version: deliverable.currentVersion,
      createdAt: deliverable.createdAt,
      updatedAt: deliverable.updatedAt,
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
    })
    .from(deliverable)
    .innerJoin(project, eq(project.id, deliverable.projectId))
    .innerJoin(
      productionJob,
      and(
        eq(productionJob.id, deliverable.jobId),
        eq(productionJob.projectId, project.id),
        eq(productionJob.workspaceId, workspaceId),
      ),
    )
    .where(
      and(
        dashboardScope(access, context),
        eq(deliverable.workspaceId, workspaceId),
        inArray(deliverable.status, [...customerVisibleStatuses]),
        inArray(deliverable.type, outputTypesFor(family)),
      ),
    )
    .orderBy(desc(deliverable.updatedAt), desc(deliverable.id));
}

/**
 * Customer-visible file count per deliverable, using `visibleFileScope`
 * verbatim — one source of truth for file visibility.
 */
async function visibleFileCounts(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  deliverableIds: string[],
) {
  if (!deliverableIds.length) return new Map<string, number>();
  const rows = await getDb()
    .select({
      deliverableId: asset.deliverableId,
      files: sql<number>`count(*)::int`,
    })
    .from(asset)
    .innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(
      and(visibleFileScope(access, context), inArray(deliverable.id, deliverableIds)),
    )
    .groupBy(asset.deliverableId);
  return new Map(rows.map((row) => [row.deliverableId, row.files]));
}

/**
 * Outputs of one family, newest first. Only items with at least one
 * customer-visible file are listed: these areas are collections of material
 * the customer can actually open, and every row shows a real file count.
 */
export async function listOutputs(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  family: OutputFamily,
) {
  const rows = await familyDeliverables(access, context, family);
  const counts = await visibleFileCounts(
    access,
    context,
    rows.map((row) => row.id),
  );

  return rows
    .map((row) => ({ ...row, fileCount: counts.get(row.id) ?? 0 }))
    .filter((row) => row.fileCount > 0);
}

/**
 * One output of the requested family, or null when it does not resolve inside
 * the caller's scoped context OR belongs to the other family — so a marketing
 * id 404s under the documents route and vice versa.
 */
export async function getOutput(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  family: OutputFamily,
  id: string,
) {
  const workspaceId = access.workspace.id;
  const [row] = await getDb()
    .select({
      id: deliverable.id,
      name: deliverable.name,
      type: deliverable.type,
      status: deliverable.status,
      version: deliverable.currentVersion,
      createdAt: deliverable.createdAt,
      updatedAt: deliverable.updatedAt,
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
    })
    .from(deliverable)
    .innerJoin(project, eq(project.id, deliverable.projectId))
    .innerJoin(
      productionJob,
      and(
        eq(productionJob.id, deliverable.jobId),
        eq(productionJob.projectId, project.id),
        eq(productionJob.workspaceId, workspaceId),
      ),
    )
    .where(
      and(
        dashboardScope(access, context),
        eq(deliverable.workspaceId, workspaceId),
        eq(deliverable.id, id),
        inArray(deliverable.status, [...customerVisibleStatuses]),
        inArray(deliverable.type, outputTypesFor(family)),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Real counts for the dashboard links: how many documents and marketing
 * materials are actually openable (the same rule the lists use). Zero is
 * reported as zero — never an invented number.
 */
export async function countOutputs(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
): Promise<{ documents: number; marketing: number }> {
  const workspaceId = access.workspace.id;
  const rows = await getDb()
    .select({ id: deliverable.id, type: deliverable.type })
    .from(deliverable)
    .innerJoin(project, eq(project.id, deliverable.projectId))
    .innerJoin(
      productionJob,
      and(
        eq(productionJob.id, deliverable.jobId),
        eq(productionJob.projectId, project.id),
        eq(productionJob.workspaceId, workspaceId),
      ),
    )
    .where(
      and(
        dashboardScope(access, context),
        eq(deliverable.workspaceId, workspaceId),
        inArray(deliverable.status, [...customerVisibleStatuses]),
        inArray(deliverable.type, [
          ...outputTypesFor("document"),
          ...outputTypesFor("marketing"),
        ]),
      ),
    );

  const counts = await visibleFileCounts(
    access,
    context,
    rows.map((row) => row.id),
  );

  const totals = { documents: 0, marketing: 0 };
  for (const row of rows) {
    if ((counts.get(row.id) ?? 0) === 0) continue;
    const family = outputFamilyForType(row.type);
    if (family === "document") totals.documents += 1;
    if (family === "marketing") totals.marketing += 1;
  }
  return totals;
}

/**
 * One row of `listOutputs` (plus its real file count) / the shape returned by
 * `getOutput` when an output resolves.
 */
export type OutputEntry = NonNullable<
  Awaited<ReturnType<typeof getOutput>>
>;

/** A listed output also carries its customer-visible file count. */
export type OutputListItem = OutputEntry & { fileCount: number };