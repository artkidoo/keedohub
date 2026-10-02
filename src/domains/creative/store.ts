/**
 * The brief store — reading and writing the creative brief for a job
 * (Phase 4.3, spec §8, §9, §16, §23).
 *
 * This is the ONLY place the creative brief is persisted, and it is deliberately
 * narrow: it reads and writes the `production_job.brief` jsonb blob, always behind
 * a verified operator and an existing job, and it never touches the job's `status`.
 * The lifecycle (applyJobTransition) remains the sole owner of production state;
 * the brief is the operator's own working notes, not a competing status field
 * (spec §16). A malformed job id is refused as not-found (hard-404, spec §26); a
 * job that does not exist is refused the same way, so a forged or foreign id never
 * writes another job's brief and never reveals that some other job exists.
 *
 * Two operations, each deliberately partial so the two forms cannot clobber each
 * other's half of the blob:
 *   • updateBriefInstructions — replaces the instruction fields only.
 *   • toggleBriefChecklist    — flips one checklist key only.
 * Both re-validate their input with the Zod schemas in brief.ts and reject any
 * value the schema does not recognise (spec §23: never trust client state).
 *
 * Both writes are atomic at the row level: the merged jsonb object is built
 * server-side from the freshly read row and written back inside the same
 * transaction that locks the row (SELECT … FOR UPDATE). A concurrent writer in
 * the other half therefore sees the half-second split between its own read and
 * write rather than silently discarding the other half's update.
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { OperatorAccess } from "@/domains/production/access";
import {
  assertOperatorAccess,
  ProductionError,
  refuseMalformedId,
} from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import { productionJob } from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";

import {
  briefInputSchema,
  readBrief,
  writeBrief,
  type ProductionBrief,
} from "./brief";
import { isChecklistKey, toggleChecklist } from "./checklist";

/** The job fields the creative store is allowed to see. */
type BriefJob = {
  id: string;
  status: string;
  productionType: string;
  brief: unknown;
};

async function loadBriefJob(access: OperatorAccess, jobId: string): Promise<BriefJob> {
  assertOperatorAccess(access);
  refuseMalformedId(jobId, "Job");

  const [row] = await getDb()
    .select({
      id: productionJob.id,
      status: productionJob.status,
      productionType: productionJob.productionType,
      brief: productionJob.brief,
    })
    .from(productionJob)
    .where(eq(productionJob.id, jobId))
    .limit(1);

  if (!row) {
    // Same refusal for a missing job as a malformed id: existence is never
    // revealed and a foreign id cannot be told apart from an absent one.
    throw new ProductionError("Job not found", "not_found");
  }
  return row;
}

/**
 * The locked job row, written back inside the same transaction.
 *
 * Both creative writes run inside a transaction that holds this row lock from
 * read to write (SELECT … FOR UPDATE), so two concurrent writers —
 * instructions and checklist, or two instructions submitted together —
 * serialise on the row instead of one silently discarding the other's half
 * (no UI disabling involved). Drizzle exposes the lock through the select
 * builder's `for("update")`; the executor type is the transaction client
 * handed to the callback.
 */
type BriefTransaction = Omit<
  PostgresJsDatabase<typeof schema>,
  "$client" | "transaction" | "execute" | "refreshMaterializedView"
>;

async function loadBriefJobForUpdate(tx: BriefTransaction, job: BriefJob): Promise<BriefJob> {
  const [locked] = await tx
    .select({
      id: productionJob.id,
      status: productionJob.status,
      productionType: productionJob.productionType,
      brief: productionJob.brief,
    })
    .from(productionJob)
    .where(eq(productionJob.id, job.id))
    .limit(1)
    .for("update");

  if (!locked) {
    throw new ProductionError("Job not found", "not_found");
  }
  return locked;
}

async function writeBriefForUpdate(
  tx: BriefTransaction,
  jobId: string,
  brief: ProductionBrief,
): Promise<void> {
  await tx
    .update(productionJob)
    .set({ brief: writeBrief(brief), updatedAt: new Date() })
    .where(eq(productionJob.id, jobId));
}

/** The creative brief of one job, or an honest empty brief (internal read). */
export async function getJobBrief(
  access: OperatorAccess,
  jobId: string,
): Promise<ProductionBrief> {
  const job = await loadBriefJob(access, jobId);
  return readBrief(job.brief);
}

/**
 * Replace a job's instruction fields with the operator's submission. Every field is
 * re-validated against the instruction schema (unknown keys are refused by
 * `.strict()`), and the existing checklist is preserved untouched. Returns the full
 * updated brief so the caller can render the result.
 */
export async function updateBriefInstructions(
  access: OperatorAccess,
  jobId: string,
  input: unknown,
): Promise<ProductionBrief> {
  const job = await loadBriefJob(access, jobId);

  const parsed = briefInputSchema.shape.instructions.safeParse(input);
  if (!parsed.success) {
    throw new ProductionError("The production instructions were not accepted", "invalid_input");
  }

  return getDb().transaction(async (tx) => {
    const locked = await loadBriefJobForUpdate(tx, job);
    const current = readBrief(locked.brief);
    const next: ProductionBrief = { instructions: parsed.data, checklist: current.checklist };

    await writeBriefForUpdate(tx, locked.id, next);
    return next;
  });
}

/**
 * Toggle one checklist key on a job. The key must belong to this job's production
 * type template (a stray or forged key is refused rather than stored), and only the
 * instruction fields that already exist are preserved. This never changes the job's
 * status — completing every checklist item is not what releases work; internal QA is
 * (spec §9, §16, §17).
 */
export async function toggleBriefChecklist(
  access: OperatorAccess,
  jobId: string,
  key: string,
  checked: boolean,
): Promise<ProductionBrief> {
  const job = await loadBriefJob(access, jobId);

  if (!isChecklistKey(job.productionType, key)) {
    throw new ProductionError("That checklist item is not valid for this job", "invalid_input");
  }

  return getDb().transaction(async (tx) => {
    const locked = await loadBriefJobForUpdate(tx, job);
    const current = readBrief(locked.brief);
    const next: ProductionBrief = {
      instructions: current.instructions,
      checklist: toggleChecklist(locked.productionType, current.checklist, key, checked),
    };

    await writeBriefForUpdate(tx, locked.id, next);
    return next;
  });
}
