/**
 * Studio deliveries and the internal file view (Phase 4.1, spec §15, §16).
 *
 * Delivered work and the files behind it, seen from inside KeedoHub. Both are
 * read-only views over the SAME records the customer Library is derived from:
 * there is no second delivery system, no second file table, and — critically —
 * no way for anything here to change what a customer can see.
 *
 * In particular the internal file view reports `customerVisible` and the current
 * version rather than deciding them, so the Studio can answer "can the customer
 * see this?" truthfully and can never answer it by accident (spec §16).
 */

import { and, desc, eq, sql } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { assertOperatorAccess } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import {
  asset,
  deliverable,
  delivery,
  operator,
  project,
  workspace,
} from "@/lib/db/schema";

/** Longest Studio list served in one read. */
const STUDIO_LIST_LIMIT = 200;

/** One delivery, as the Studio shows it. */
export type StudioDeliveryRow = {
  id: string;
  workspaceId: string;
  workspaceSlug: string;
  contextType: "brand" | "artist";
  projectId: string;
  projectName: string;
  jobId: string;
  deliverableId: string;
  deliverableName: string;
  version: number;
  /** The exact file handed over, with enough detail to identify it. */
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  /** Whether the delivered file has been written to storage. */
  stored: boolean;
  /** The operator who delivered it, when one is recorded. */
  deliveredBy: string | null;
  createdAt: Date;
};

/**
 * Every delivery, newest first.
 *
 * The file detail is joined, not inferred: `filename` is null only when the
 * delivery genuinely has no file recorded, which is the honest answer rather
 * than a blank that looks like a bug.
 */
export async function listStudioDeliveries(
  access: OperatorAccess,
  filter: { workspaceId?: string; context?: "brand" | "artist"; limit?: number } = {},
): Promise<StudioDeliveryRow[]> {
  assertOperatorAccess(access);

  const limit = Math.min(filter.limit ?? STUDIO_LIST_LIMIT, STUDIO_LIST_LIMIT);
  const conditions = [
    filter.workspaceId ? eq(delivery.workspaceId, filter.workspaceId) : undefined,
    filter.context ? eq(delivery.contextType, filter.context) : undefined,
  ].filter((part) => part !== undefined);

  return getDb()
    .select({
      id: delivery.id,
      workspaceId: delivery.workspaceId,
      workspaceSlug: workspace.slug,
      contextType: delivery.contextType,
      projectId: delivery.projectId,
      projectName: project.name,
      jobId: delivery.jobId,
      deliverableId: delivery.deliverableId,
      deliverableName: deliverable.name,
      version: delivery.version,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      stored: sql<boolean>`${asset.storageKey} is not null`,
      deliveredBy: operator.displayName,
      createdAt: delivery.createdAt,
    })
    .from(delivery)
    .innerJoin(workspace, eq(workspace.id, delivery.workspaceId))
    .innerJoin(project, eq(project.id, delivery.projectId))
    .innerJoin(deliverable, eq(deliverable.id, delivery.deliverableId))
    .leftJoin(asset, eq(asset.id, delivery.assetId))
    .leftJoin(operator, eq(operator.id, delivery.deliveredByOperatorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(delivery.createdAt), desc(delivery.id))
    .limit(limit);
}

/**
 * One file in the chain, exactly as the database records it.
 *
 * `customerVisible`, `isCurrent` and `delivered` are REPORTED, never decided
 * here: the Studio's job is to show an operator what the customer's own rules
 * will do with this file, not to change them (spec §16).
 */
export type StudioFileRow = {
  id: string;
  filename: string;
  category: string;
  version: number;
  customerVisible: boolean;
  /** Whether this asset is the file of the deliverable's current version. */
  isCurrent: boolean;
  /** Whether a delivery exists for this deliverable. */
  delivered: boolean;
  /** Whether the bytes have been written to storage. */
  stored: boolean;
  sizeBytes: number | null;
  mimeType: string | null;
  workspaceSlug: string;
  contextType: "brand" | "artist";
  projectName: string | null;
  deliverableId: string | null;
  deliverableName: string | null;
  createdAt: Date;
};

/**
 * Files recorded in the chain, newest first.
 *
 * Deliberately an internal inventory rather than a "Studio Library" of its own:
 * it lists `asset` rows, which is what a file IS. Nothing here creates, moves or
 * publishes anything.
 */
export async function listStudioFiles(
  access: OperatorAccess,
  filter: { workspaceId?: string; limit?: number } = {},
): Promise<StudioFileRow[]> {
  assertOperatorAccess(access);

  const limit = Math.min(filter.limit ?? STUDIO_LIST_LIMIT, STUDIO_LIST_LIMIT);

  return getDb()
    .select({
      id: asset.id,
      filename: asset.filename,
      category: asset.category,
      version: asset.version,
      customerVisible: asset.customerVisible,
      isCurrent: sql<boolean>`exists (
        select 1 from deliverable_version dv
         where dv.deliverable_id = ${asset.deliverableId}
           and dv.asset_id = ${asset.id}
           and dv.is_current
      )`,
      delivered: sql<boolean>`exists (
        select 1 from delivery dl where dl.deliverable_id = ${asset.deliverableId}
      )`,
      stored: sql<boolean>`${asset.storageKey} is not null`,
      sizeBytes: asset.sizeBytes,
      mimeType: asset.mimeType,
      workspaceSlug: workspace.slug,
      contextType: sql<"brand" | "artist">`coalesce(
        (select j.context_type from production_job j where j.id = ${asset.jobId}),
        (select p.context_type from project p where p.id = ${asset.projectId})
      )`,
      projectName: project.name,
      deliverableId: asset.deliverableId,
      deliverableName: deliverable.name,
      createdAt: asset.createdAt,
    })
    .from(asset)
    .innerJoin(workspace, eq(workspace.id, asset.workspaceId))
    .leftJoin(project, eq(project.id, asset.projectId))
    .leftJoin(deliverable, eq(deliverable.id, asset.deliverableId))
    .where(filter.workspaceId ? eq(asset.workspaceId, filter.workspaceId) : undefined)
    .orderBy(desc(asset.createdAt), desc(asset.id))
    .limit(limit);
}

/** How many files exist for one deliverable (used by the delivery list). */
export async function countDeliverableFiles(
  access: OperatorAccess,
  deliverableId: string,
): Promise<number> {
  assertOperatorAccess(access);

  const [row] = await getDb()
    .select({ value: sql<number>`count(*)::int` })
    .from(asset)
    .where(eq(asset.deliverableId, deliverableId));

  return row?.value ?? 0;
}

/** The production job a deliverable belongs to, for internal cross-linking. */
export async function getDeliverableJob(
  access: OperatorAccess,
  deliverableId: string,
): Promise<{ jobId: string; projectId: string } | null> {
  assertOperatorAccess(access);

  const [row] = await getDb()
    .select({ jobId: deliverable.jobId, projectId: deliverable.projectId })
    .from(deliverable)
    .where(eq(deliverable.id, deliverableId))
    .limit(1);

  return row ?? null;
}
