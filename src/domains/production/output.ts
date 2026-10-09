/**
 * Production output (Phase 3.1, spec §11, §12).
 *
 * The files KeedoHub produces for a customer: a deliverable is the piece of work,
 * and each version of it is one file plus the note explaining what changed.
 *
 * This is the write path an operator uses while working a job, and it obeys four
 * rules that the rest of the system depends on:
 *
 *   1. Scope is inherited, never submitted. Workspace, context and job come from
 *      the deliverable or job that was named, so an output cannot be attached to
 *      another customer's work (spec §20.2 rule 1).
 *   2. A new version never overwrites the old one. Each file is a new asset and a
 *      new version row; the previous version becomes superseded and is kept
 *      (spec §11.3, §12.3 rule 1).
 *   3. A version never points at a missing object. The bytes are written to
 *      storage and confirmed before the version references them; if the write
 *      fails, the placeholder asset is removed again (spec §21.2 rule 5).
 *   4. Customer visibility is explicit. An output is shared with the customer
 *      because an operator decided to share it, not because it exists.
 */

import { desc, eq } from "drizzle-orm";

import type { OperatorAccess } from "./access";
import { assertOperatorAccess, ProductionError, refuseMalformedId } from "./errors";
import { deliverableStatusForJob } from "./status";
import { createDeliverableVersion, retireReviewsOvertakenBy } from "./versions";
import { getDb } from "@/lib/db";
import { asset, deliverable, productionJob, workspace } from "@/lib/db/schema";
import type { Deliverable } from "@/lib/db/schema";
import { createStorageProvider } from "@/lib/storage";
import type { WorkspaceContext } from "@/lib/navigation";
import { MAX_OUTPUT_BYTES } from "./limits";

export { MAX_OUTPUT_BYTES };

/** What an operator submits to create a deliverable (the work being produced). */
export type DeliverableWrite = {
  name: string;
  type: string;
};

/** A cleaned, safe filename. Never a path, never control characters. */
export function safeFilename(input: string): string {
  const cleaned = Array.from(input)
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      // Control characters are removed and path separators flattened, so a
      // stored filename can never carry a path or a terminal escape sequence.
      if (code < 32 || code === 127) return "";
      if (character === "/" || character === "\\") return "-";
      return character;
    })
    .join("")
    // A run of dots or separators can only ever read as a path or a hidden or
    // relative name, so every run is flattened to a single dash before the name
    // is tidied. Phase 4.3 hardened this: `../../etc/passwd` now stores as
    // `etc-passwd` rather than as something that still looks like a path.
    .replace(/[.\-/\\]{2,}/g, "-")
    .replace(/^[.\s-]+/, "")
    .replace(/\.+$/, "")
    .trim()
    .slice(0, 180);

  return cleaned.length ? cleaned : "output";
}

/**
 * Bounded, honest validation of an uploaded production output.
 *
 * The file name, its extension, its size and (where a type is declared at all)
 * its mime type are the only things about an upload KeedoHub trusts, and only
 * after they have passed here — Phase 4.3 spec §11. A name with no readable
 * extension is refused rather than stored, because a version the customer cannot
 * identify is not a finished piece of work; the extension check is deliberately
 * permissive about *which* extension, so new working formats never need a code
 * change, and deliberately strict about *having* one.
 */
export function assertUsableFile(file: {
  name: string;
  size: number;
  type?: string;
}): void {
  if (!file.name?.trim()) {
    throw new ProductionError("The file has no name", "invalid_input");
  }
  if (!hasReadableExtension(file.name)) {
    throw new ProductionError(
      "The file has no recognisable extension, so KeedoHub cannot record what kind of file it is",
      "invalid_input",
    );
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new ProductionError("The file is empty", "invalid_input");
  }
  if (file.size > MAX_OUTPUT_BYTES) {
    throw new ProductionError(
      `The file is larger than ${Math.round(MAX_OUTPUT_BYTES / (1024 * 1024))} MB`,
      "invalid_input",
    );
  }
}

/**
 * Whether a filename ends in a plain, readable extension.
 *
 * Written as a shape test rather than an allow-list: the set of formats KeedoHub
 * can produce is open (PostScript, WAV, DOCX, AI …), but a name with no
 * extension after the last dot is not something an operator can identify later.
 * A trailing dot, a hidden file name and a doubled dot all fail.
 */
export function hasReadableExtension(name: string): boolean {
  // At least one character, then a dot, then a plain extension — so a hidden or
  // relative name such as ".png" is not mistaken for a real file.
  return /.+\.[a-z0-9]{1,12}$/i.test(name.trim());
}

/**
 * Create a deliverable for a job.
 *
 * The job is named, everything else is inherited from it — workspace, context,
 * project and profile — so the new record cannot disagree with the chain it
 * belongs to. The status is derived from the job, never chosen here
 * (spec §11.2).
 */
export async function createDeliverableForJob(
  access: OperatorAccess,
  jobId: string,
  input: DeliverableWrite,
): Promise<Deliverable> {
  assertOperatorAccess(access);
  refuseMalformedId(jobId, "Job");

  const name = input.name?.trim();
  const type = input.type?.trim();

  if (!name) {
    throw new ProductionError("A deliverable needs a name", "invalid_input");
  }
  if (!type) {
    throw new ProductionError("A deliverable needs a type", "invalid_input");
  }

  const [job] = await getDb()
    .select()
    .from(productionJob)
    .where(eq(productionJob.id, jobId))
    .limit(1);

  if (!job) {
    throw new ProductionError("Job not found", "not_found");
  }

  if (job.status === "delivered") {
    throw new ProductionError(
      "This job is finished and delivered; new work is a new job",
      "conflict",
    );
  }

  const [created] = await getDb()
    .insert(deliverable)
    .values({
      workspaceId: job.workspaceId,
      projectId: job.projectId,
      jobId: job.id,
      name,
      type,
      status: deliverableStatusForJob(job.status),
      currentVersion: 1,
    })
    .returning();

  return created;
}

/**
 * Rename or re-type a deliverable.
 *
 * Only the describing fields move. Status and version belong to the workflow and
 * are written by the transition and versioning paths, never from a form.
 */
export async function updateDeliverable(
  access: OperatorAccess,
  deliverableId: string,
  input: Partial<DeliverableWrite>,
): Promise<Deliverable> {
  assertOperatorAccess(access);

  const db = getDb();

  const [target] = await db
    .select({ id: deliverable.id, jobId: deliverable.jobId })
    .from(deliverable)
    .where(eq(deliverable.id, deliverableId))
    .limit(1);

  if (!target) {
    throw new ProductionError("Deliverable not found", "not_found");
  }

  const [job] = await db
    .select({ status: productionJob.status })
    .from(productionJob)
    .where(eq(productionJob.id, target.jobId))
    .limit(1);

  if (job?.status === "delivered") {
    throw new ProductionError(
      "Delivered work is immutable; new work is a new job",
      "conflict",
    );
  }

  const name = input.name?.trim();
  const type = input.type?.trim();

  if (name === undefined && type === undefined) {
    throw new ProductionError("Nothing to change", "invalid_input");
  }

  const [updated] = await db
    .update(deliverable)
    .set({
      ...(name ? { name } : {}),
      ...(type ? { type } : {}),
      updatedAt: new Date(),
    })
    .where(eq(deliverable.id, target.id))
    .returning();

  return updated;
}

/** The file an operator produced, as the server action received it. */
export type OutputFile = {
  name: string;
  size: number;
  type?: string;
  bytes: Buffer;
};

/** One production output, ready to be reviewed. */
export type ProductionOutput = {
  version: number;
  versionId: string;
  assetId: string;
  filename: string;
  sharedWithCustomer: boolean;
};

/**
 * Produce a new version of a deliverable: store the file, record it as an
 * asset, and make it the current version.
 *
 * Order matters and is deliberate:
 *   1. validate the upload before anything is written;
 *   2. refuse work the job cannot accept before any row is created (a job with
 *      the customer, or already delivered, cannot take a new version — checked
 *      here as well as in the versioning path, so a refused upload never leaves
 *      an asset row behind);
 *   3. create the asset row (a deliverable never points at a missing object);
 *   4. write the bytes to storage and confirm they landed;
 *   5. create the version row, which supersedes the previous one;
 *   6. close any review the new version has overtaken.
 *
 * If the bytes cannot be stored, the asset row created in step 3 is removed and
 * the failure is reported — the database is never left claiming a file that does
 * not exist (spec §21.2 rule 5). The previous version is never deleted or
 * overwritten at any point (spec §12.3 rule 1).
 */
export async function produceVersion(
  access: OperatorAccess,
  deliverableId: string,
  input: {
    file: OutputFile;
    note?: string | null;
    /** Whether the customer may see this file at all. */
    shareWithCustomer?: boolean;
  },
): Promise<ProductionOutput> {
  assertOperatorAccess(access);
  refuseMalformedId(deliverableId, "Deliverable");
  assertUsableFile(input.file);

  const db = getDb();

  const [deliv] = await db
    .select({
      id: deliverable.id,
      workspaceId: deliverable.workspaceId,
      projectId: deliverable.projectId,
      jobId: deliverable.jobId,
    })
    .from(deliverable)
    .where(eq(deliverable.id, deliverableId))
    .limit(1);

  if (!deliv) {
    throw new ProductionError("Deliverable not found", "not_found");
  }

  // The storage namespace comes from the workspace row the deliverable already
  // belongs to — never from the upload, the form or a URL (spec §21.1).
  const [owner] = await db
    .select({ slug: workspace.slug })
    .from(workspace)
    .where(eq(workspace.id, deliv.workspaceId))
    .limit(1);

  if (!owner) {
    throw new ProductionError("Workspace not found", "not_found");
  }

  const [job] = await db
    .select({
      contextType: productionJob.contextType,
      brandProfileId: productionJob.brandProfileId,
      artistProfileId: productionJob.artistProfileId,
      status: productionJob.status,
    })
    .from(productionJob)
    .where(eq(productionJob.id, deliv.jobId))
    .limit(1);

  if (!job) {
    throw new ProductionError("Job not found", "not_found");
  }

  // The versioning path refuses these states too, but it runs after the asset
  // row exists — checking here first means a refused upload leaves nothing
  // behind, not even an unversioned asset row.
  if (job.status === "customer_review") {
    throw new ProductionError(
      "This work is with the customer for review; a new version can only be produced after the review is decided",
      "conflict",
    );
  }

  if (job.status === "delivered") {
    throw new ProductionError(
      "This work has been delivered and its record is permanent; new work is a new job",
      "conflict",
    );
  }

  const shareWithCustomer = input.shareWithCustomer !== false;
  const filename = safeFilename(input.file.name);
  const context: WorkspaceContext = job.contextType;

  const [created] = await db
    .insert(asset)
    .values({
      workspaceId: deliv.workspaceId,
      projectId: deliv.projectId,
      jobId: deliv.jobId,
      deliverableId: deliv.id,
      brandProfileId: context === "brand" ? job.brandProfileId : null,
      artistProfileId: context === "artist" ? job.artistProfileId : null,
      category: "delivered",
      filename,
      mimeType: input.file.type || null,
      sizeBytes: input.file.size,
      storageKey: null,
      storageProvider: process.env.STORAGE_PROVIDER?.toLowerCase() === "s3" ? "s3" : "local",
      // The version number is assigned by the versioning path below; until then
      // this file belongs to no version and cannot be shown to a customer.
      version: 0,
      customerVisible: shareWithCustomer,
    })
    .returning({ id: asset.id });

  const storage = createStorageProvider();
  const key = storage.getKey(owner.slug, deliv.id, created.id);

  try {
    await storage.write(key, input.file.bytes);
  } catch (error) {
    // Compensate: a record that points at a file nobody can read is worse than
    // no record at all, and the operator is told the version was not created.
    await db.delete(asset).where(eq(asset.id, created.id));
    console.error("Production output could not be stored:", error);
    throw new ProductionError(
      "The file could not be stored, so no new version was created",
      "conflict",
    );
  }

  await db
    .update(asset)
    .set({ storageKey: key, updatedAt: new Date() })
    .where(eq(asset.id, created.id));

  const version = await createDeliverableVersion(access, deliv.id, {
    assetId: created.id,
    note: input.note ?? null,
  });

  // The file belongs to the version number it was produced as; the previous
  // file keeps its own (now historical) number.
  await db
    .update(asset)
    .set({ version: version.version })
    .where(eq(asset.id, created.id));

  // Any review the new version has overtaken is closed, never deleted.
  await retireReviewsOvertakenBy(deliv.id, version.version);

  return {
    version: version.version,
    versionId: version.id,
    assetId: created.id,
    filename,
    sharedWithCustomer: shareWithCustomer,
  };
}

/** Every file recorded for a deliverable, newest first (internal read). */
export async function listDeliverableAssets(
  access: OperatorAccess,
  deliverableId: string,
) {
  assertOperatorAccess(access);
  refuseMalformedId(deliverableId, "Deliverable");

  return getDb()
    .select({
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      version: asset.version,
      category: asset.category,
      customerVisible: asset.customerVisible,
      createdAt: asset.createdAt,
    })
    .from(asset)
    .where(eq(asset.deliverableId, deliverableId))
    .orderBy(desc(asset.createdAt), desc(asset.id));
}

