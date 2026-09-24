/**
 * Customer Library data access (Checkpoint 2.7).
 *
 * The Library is NOT an entity: a library item is a real, customer-visible,
 * *delivered* file derived from the existing chain
 *   Project → Production Job → Deliverable → Asset ← Delivery
 * so no table, column or migration is introduced here.
 *
 * Scope-first (spec §20.2): every query is pinned to the session-derived
 * triple from `requireWorkspaceContext` and reuses the verified predicates
 * rather than restating them:
 *   - `dashboardScope`   — workspace + context + profile
 *   - `visibleFileScope` — customer flag, customer categories, current
 *     version, customer-visible deliverable status, fail-closed relationship
 *     checks. This is the SAME predicate the secure download route enforces,
 *     so a file that can be listed here is exactly a file that can be read.
 * Library adds one rule of its own: the file must actually be delivered, at
 * the version the delivery recorded.
 *
 * Nothing here writes, and no storage key, provider, path or internal id
 * leaves this module. Ids are used for routing only and never displayed.
 */

import { and, desc, eq } from "drizzle-orm";

import { visibleFileScope } from "@/domains/dashboard/queries";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { getDb } from "@/lib/db";
import { asset, deliverable, delivery, productionJob, project } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/** Base select shape: the file plus its work, project and delivery. */
const librarySelect = {
  id: asset.id,
  filename: asset.filename,
  mimeType: asset.mimeType,
  sizeBytes: asset.sizeBytes,
  version: asset.version,
  category: asset.category,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
  deliverableId: deliverable.id,
  workName: deliverable.name,
  workType: deliverable.type,
  projectId: project.id,
  projectName: project.name,
  projectDescription: project.description,
  deliveredAt: delivery.createdAt,
};

/**
 * Joined, delivered + customer-visible files for one context.
 *
 * The delivery row must match the workspace, the project AND the
 * deliverable, and must record the deliverable's CURRENT version — so a
 * superseded version can never be presented as the library copy, and an
 * undelivered file (no matching row) can never appear.
 *
 * `extra` is an optional id filter so the list and the single-item lookup
 * share one query shape rather than overriding `.where()`.
 */
function libraryQuery(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  extra?: ReturnType<typeof eq>,
) {
  const workspaceId = access.workspace.id;
  return getDb()
    .select(librarySelect)
    .from(asset)
    .innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(
      productionJob,
      and(
        eq(productionJob.id, deliverable.jobId),
        eq(productionJob.projectId, project.id),
        eq(productionJob.workspaceId, workspaceId),
      ),
    )
    .innerJoin(
      delivery,
      and(
        eq(delivery.workspaceId, workspaceId),
        eq(delivery.projectId, project.id),
        eq(delivery.deliverableId, deliverable.id),
        eq(delivery.version, deliverable.currentVersion),
      ),
    )
    .where(extra ? and(visibleFileScope(access, context), extra) : visibleFileScope(access, context));
}

/** Delivered files, most recently delivered first. */
export async function listLibrary(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
) {
  return libraryQuery(access, context)
    .orderBy(desc(delivery.createdAt), desc(asset.id))
    .limit(200);
}

/**
 * One library file, or null when it does not resolve inside the caller's
 * scoped context — so a foreign, hidden, undelivered or wrong-context id
 * 404s exactly like a missing one.
 */
export async function getLibraryFile(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  id: string,
) {
  const [row] = await libraryQuery(access, context, eq(asset.id, id)).limit(1);
  return row ?? null;
}

/**
 * Real count of delivered files for the dashboard/nav link. Zero is reported
 * as zero — never an invented number.
 */
export async function countLibrary(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
): Promise<number> {
  return listLibrary(access, context).then((rows) => rows.length);
}

/** A row of `listLibrary` / the shape returned by `getLibraryFile`. */
export type LibraryItem = NonNullable<Awaited<ReturnType<typeof getLibraryFile>>>;
