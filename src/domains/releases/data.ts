/**
 * Release and asset data access for Artist customer surfaces (Checkpoint 2.6).
 *
 * Scope-first (spec §20.2): access is always the session-derived triple from
 * `requireWorkspaceContext`, and isolation comes from the SAME predicates the
 * rest of the workspace uses:
 *   - `dashboardScope`   — workspace + context + profile
 *   - `visibleFileScope` — customer-visible files (customer flag, customer
 *     categories, current version, customer-visible deliverable status,
 *     conflicting-relationship null checks)
 *
 * The deliverable statuses a customer may see (customer_review, approved,
 * delivered — spec §11.2) arrive implicitly through `visibleFileScope` and
 * the listReleaseWork grouping; nothing here writes. Storage keys, providers
 * and paths never leave this module; ids are used for routing only and are
 * never printed.
 */

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { dashboardScope, visibleFileScope } from "@/domains/dashboard/queries";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { getDb } from "@/lib/db";
import { asset, deliverable, productionJob, project } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/** Customer-visible file count per project, through `visibleFileScope`. */
async function projectFileCounts(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  projectIds: string[],
) {
  if (!projectIds.length) return new Map<string, number>();
  const rows = await getDb()
    .select({ projectId: project.id, files: sql<number>`count(*)::int` })
    .from(asset)
    .innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(and(visibleFileScope(access, context), inArray(project.id, projectIds)))
    .groupBy(project.id);
  return new Map(rows.map((row) => [row.projectId, row.files]));
}

/**
 * The artist's releases, most recently updated first. A release is an artist
 * project carrying release metadata, so this reads the existing project table
 * — there is no second release model to keep in sync. Releases are listed
 * whether or not files are shared yet (work in progress is real work); the
 * file count on each row is the real number of customer-visible files.
 */
export async function listReleases(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
) {
  const rows = await getDb()
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      releaseType: project.releaseType,
      releaseDate: project.releaseDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(
      and(
        dashboardScope(access, context),
        eq(project.workspaceId, access.workspace.id),
        isNotNull(project.releaseType),
      ),
    )
    .orderBy(desc(project.updatedAt), desc(project.id));

  const counts = await projectFileCounts(
    access,
    context,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({ ...row, fileCount: counts.get(row.id) ?? 0 }));
}

/**
 * One release, or null when the id does not resolve inside the caller's scoped
 * context OR is not a release at all (an ordinary artist project 404s here).
 */
export async function getRelease(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  id: string,
) {
  const [row] = await getDb()
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      releaseType: project.releaseType,
      releaseDate: project.releaseDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(
      and(
        dashboardScope(access, context),
        eq(project.workspaceId, access.workspace.id),
        eq(project.id, id),
        isNotNull(project.releaseType),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * The work behind one release: customer-visible deliverables with their files,
 * in one scoped read. Deliverables with no shared files yet are omitted here —
 * the release page shows an honest empty state instead of an empty list.
 */
export async function listReleaseWork(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  projectId: string,
) {
  const rows = await getDb()
    .select({
      deliverableId: deliverable.id,
      deliverableName: deliverable.name,
      deliverableType: deliverable.type,
      deliverableStatus: deliverable.status,
      version: deliverable.currentVersion,
      fileId: asset.id,
      filename: asset.filename,
      sizeBytes: asset.sizeBytes,
    })
    .from(asset)
    .innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(and(visibleFileScope(access, context), eq(project.id, projectId)))
    .orderBy(desc(deliverable.updatedAt), desc(asset.createdAt), desc(asset.id));

  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      status: (typeof rows)[number]["deliverableStatus"];
      version: number;
      files: { id: string; filename: string; sizeBytes: number | null }[];
    }
  >();

  for (const row of rows) {
    const existing = groups.get(row.deliverableId);
    const file = {
      id: row.fileId,
      filename: row.filename,
      sizeBytes: row.sizeBytes,
    };
    if (existing) {
      existing.files.push(file);
      continue;
    }
    groups.set(row.deliverableId, {
      id: row.deliverableId,
      name: row.deliverableName,
      type: row.deliverableType,
      status: row.deliverableStatus,
      version: row.version,
      files: [file],
    });
  }

  return [...groups.values()];
}

/**
 * The artist's asset library: every customer-visible file in the artist
 * context, newest first, with the deliverable and project it came from. This
 * is the existing Asset model — no second asset system exists.
 */
export async function listArtistAssets(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
) {
  return getDb()
    .select({
      id: asset.id,
      filename: asset.filename,
      sizeBytes: asset.sizeBytes,
      version: asset.version,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      deliverableId: deliverable.id,
      deliverableName: deliverable.name,
      deliverableType: deliverable.type,
      deliverableStatus: deliverable.status,
      projectId: project.id,
      projectName: project.name,
      projectReleaseType: project.releaseType,
    })
    .from(asset)
    .innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(visibleFileScope(access, context))
    .orderBy(desc(asset.updatedAt), desc(asset.id));
}

/** One asset of the caller's own artist context, or null. */
export async function getArtistAsset(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
  id: string,
) {
  const [row] = await getDb()
    .select({
      id: asset.id,
      filename: asset.filename,
      sizeBytes: asset.sizeBytes,
      version: asset.version,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      deliverableId: deliverable.id,
      deliverableName: deliverable.name,
      deliverableType: deliverable.type,
      deliverableStatus: deliverable.status,
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
      projectReleaseType: project.releaseType,
    })
    .from(asset)
    .innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(and(visibleFileScope(access, context), eq(asset.id, id)))
    .limit(1);

  return row ?? null;
}

/**
 * Real counts for the Artist dashboard links: releases that exist, and assets
 * that are ready to download. Both match their list pages exactly — zero is
 * reported as zero.
 */
export async function countArtistOutputs(
  access: WorkspaceContextAccess,
  context: WorkspaceContext,
): Promise<{ releases: number; assets: number }> {
  const [releases] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(project)
    .where(
      and(
        dashboardScope(access, context),
        eq(project.workspaceId, access.workspace.id),
        isNotNull(project.releaseType),
      ),
    );

  const [assets] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(asset)
    .innerJoin(deliverable, eq(asset.deliverableId, deliverable.id))
    .innerJoin(project, eq(deliverable.projectId, project.id))
    .innerJoin(productionJob, eq(deliverable.jobId, productionJob.id))
    .where(visibleFileScope(access, context));

  return { releases: releases?.total ?? 0, assets: assets?.total ?? 0 };
}

/** One row of `listReleases` (with its real customer-visible file count). */
export type ReleaseListItem = Awaited<ReturnType<typeof listReleases>>[number];

/** The shape returned by `getRelease` when a release resolves. */
export type ReleaseEntry = NonNullable<Awaited<ReturnType<typeof getRelease>>>;

/** The shape returned by `getArtistAsset` when an asset resolves. */
export type ArtistAssetEntry = NonNullable<
  Awaited<ReturnType<typeof getArtistAsset>>
>;

/** One entry of `listArtistAssets`. */
export type ArtistAssetListItem = Awaited<
  ReturnType<typeof listArtistAssets>
>[number];

