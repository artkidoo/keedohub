/**
 * Creative references for the production workspace (Phase 4.3, spec §13).
 *
 * A reference is something the customer supplied that the operator should look
 * at before producing: a mood board, a logo, a competitor example, a photo. The
 * Asset model already carries exactly this — `asset.category = 'reference'`,
 * scoped to a workspace, a project and (when it came in with the work) a job —
 * so this module surfaces those existing rows and invents no second reference
 * system.
 *
 * Two rules keep it honest and narrow:
 *   • Scope is inherited from the job. A reference is read because it belongs to
 *     this job's project or this job, never because an id was submitted.
 *   • Only describing fields are returned. The storage key is never selected, so
 *     it cannot leak from here; bytes are served only through the operator-gated
 *     preview route.
 *
 * Read-only by construction: there is no write path in this module at all.
 */

import { and, desc, eq, or } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { assertOperatorAccess, isRealId } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import { asset } from "@/lib/db/schema";

/** One reference file the customer supplied, as the workspace shows it. */
export type ProductionReference = {
  id: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
};

/**
 * Reference files attached to one job's project or to the job itself.
 *
 * A malformed or absent job id answers with no references rather than a query,
 * so a forged id can never widen the read. Requires proven operator access.
 */
export async function listJobReferences(
  access: OperatorAccess,
  job: { id: string; projectId: string },
): Promise<ProductionReference[]> {
  assertOperatorAccess(access);
  if (!isRealId(job.projectId)) return [];

  // The job's own id is only usable as a scope when it is a real id; the project
  // is the durable scope either way.
  const scopes = isRealId(job.id)
    ? or(eq(asset.projectId, job.projectId), eq(asset.jobId, job.id))
    : eq(asset.projectId, job.projectId);

  return getDb()
    .select({
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      createdAt: asset.createdAt,
    })
    .from(asset)
    .where(and(eq(asset.category, "reference"), scopes))
    .orderBy(desc(asset.createdAt), desc(asset.id))
    .limit(24);
}
