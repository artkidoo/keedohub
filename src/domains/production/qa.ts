/**
 * The internal QA gate (Phase 3.1, spec §10.4 rule 1).
 *
 * "Nothing reaches Customer Review without passing it." The state machine in
 * `./lifecycle` already forces a job through `internal_qa`; this module is the
 * second half of the rule — it checks that what would be sent is actually
 * reviewable, so an empty or unfinished deliverable cannot be released to a
 * customer by a state transition alone.
 *
 * Deliberately minimum viable. It answers one question — "if this job went to
 * the customer now, would there be something they could actually look at and
 * judge?" — and it answers it with real rows: the job produces at least one
 * deliverable, every deliverable has a current version, that version carries a
 * file, and that file is shared with the customer as a customer-facing kind.
 *
 * The file rules deliberately mirror the predicate the customer's download route
 * enforces, so "QA passed" and "the customer can see it" cannot disagree
 * (spec §20.2 rule 5). No scoring, no checklists, no second-opinion UI: if more
 * quality control is ever needed it is added here, in one place.
 */

import { and, eq } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import { assertOperatorAccess, isRealId, ProductionError } from "./errors";
import { getDb } from "@/lib/db";
import { asset, deliverable, deliverableVersion } from "@/lib/db/schema";

/** The file kinds a customer is allowed to be sent (mirrors the customer scope). */
const CUSTOMER_FILE_CATEGORIES: readonly string[] = ["delivered", "library"];

/** One reason a job is not yet releasable. Internal wording. */
export type QaFinding = {
  deliverableId: string;
  deliverableName: string;
  reason: "no_current_version" | "no_file" | "not_shared";
};

export type QaReadiness = {
  ready: boolean;
  findings: QaFinding[];
};

/**
 * What the internal QA gate sees for one job.
 *
 * Reads the current version of every deliverable of the job and the file that
 * version carries, then reports — honestly and specifically — what is missing.
 * The caller is an operator, so this is internal information and may be worded
 * as such.
 */
export async function qaReadiness(
  access: OperatorAccess,
  jobId: string,
): Promise<QaReadiness> {
  assertOperatorAccess(access);
  if (!isRealId(jobId)) return { ready: false, findings: [] };

  const rows = await getDb()
    .select({
      deliverableId: deliverable.id,
      deliverableName: deliverable.name,
      versionId: deliverableVersion.id,
      assetId: deliverableVersion.assetId,
      assetCategory: asset.category,
      assetVisible: asset.customerVisible,
    })
    .from(deliverable)
    .leftJoin(
      deliverableVersion,
      and(
        eq(deliverableVersion.deliverableId, deliverable.id),
        eq(deliverableVersion.isCurrent, true),
      ),
    )
    .leftJoin(asset, eq(asset.id, deliverableVersion.assetId))
    .where(eq(deliverable.jobId, jobId))
    .orderBy(deliverable.createdAt);

  // No deliverable at all is itself a finding: there is nothing to review.
  if (rows.length === 0) {
    return {
      ready: false,
      findings: [
        {
          deliverableId: jobId,
          deliverableName: "This job",
          reason: "no_current_version",
        },
      ],
    };
  }

  const findings: QaFinding[] = [];

  for (const row of rows) {
    if (!row.versionId) {
      findings.push({
        deliverableId: row.deliverableId,
        deliverableName: row.deliverableName,
        reason: "no_current_version",
      });
      continue;
    }
    if (!row.assetId) {
      findings.push({
        deliverableId: row.deliverableId,
        deliverableName: row.deliverableName,
        reason: "no_file",
      });
      continue;
    }
    const shared =
      row.assetVisible === true &&
      row.assetCategory !== null &&
      CUSTOMER_FILE_CATEGORIES.includes(row.assetCategory);
    if (!shared) {
      findings.push({
        deliverableId: row.deliverableId,
        deliverableName: row.deliverableName,
        reason: "not_shared",
      });
    }
  }

  return { ready: findings.length === 0, findings };
}

/**
 * Refuse to move a job into customer review when the gate is not satisfied.
 *
 * Called by the one transition that opens a customer review, so the check
 * cannot be skipped by calling the lifecycle directly.
 */
export async function assertReadyForCustomerReview(
  access: OperatorAccess,
  jobId: string,
): Promise<void> {
  const { ready, findings } = await qaReadiness(access, jobId);

  if (ready) return;

  throw new ProductionError(
    `Internal QA found ${findings.length} issue(s) to resolve before this work can be shared for review: ${findings
      .map((finding) => `${finding.deliverableName} (${qaReasonLabel(finding.reason)})`)
      .join(", ")}`,
    "not_ready",
  );
}

/** Internal wording for a finding, used only on the private production surface. */
export function qaReasonLabel(reason: QaFinding["reason"]): string {
  switch (reason) {
    case "no_current_version":
      return "no current version";
    case "no_file":
      return "the current version has no file";
    case "not_shared":
      return "the current file is not shared with the customer";
  }
}

/** Deliverables of one job (internal read, oldest first). */
export async function listJobDeliverables(
  access: OperatorAccess,
  jobId: string,
) {
  assertOperatorAccess(access);
  if (!isRealId(jobId)) return [];

  return getDb()
    .select({
      id: deliverable.id,
      name: deliverable.name,
      type: deliverable.type,
      status: deliverable.status,
      currentVersion: deliverable.currentVersion,
      createdAt: deliverable.createdAt,
      updatedAt: deliverable.updatedAt,
    })
    .from(deliverable)
    .where(eq(deliverable.jobId, jobId))
    .orderBy(deliverable.createdAt);
}
