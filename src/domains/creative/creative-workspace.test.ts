/**
 * The creative production workspace against real PostgreSQL (Phase 4.3, spec
 * §23, §24, §25, §26, §28).
 *
 * The pure modules are unit-tested elsewhere. This file proves the parts that
 * need the database and a real operator principal:
 *
 *   • the brief store reads and writes `production_job.brief` WITHOUT touching
 *     the job's lifecycle status, and its two operations cannot clobber each
 *     other's half of the blob;
 *   • every write re-validates: an unknown instruction key and a checklist key
 *     outside the job's own template are both refused, and nothing is stored;
 *   • a malformed or unknown job id is "not found" — never a database error and
 *     never a hint that some other job exists;
 *   • reference reads are scoped to the job's own project or job, so another
 *     workspace's, another project's and another job's files never appear, and a
 *     non-reference asset is never presented as reference material;
 *   • the preview resolver derives a storage key server-side and answers null for
 *     anything it cannot resolve;
 *   • every read and write refuses a caller who is not a live operator.
 *
 * Fixtures are namespaced and removed in `after`, mirroring the Phase 4.1 and
 * Phase 4.2 database tests.
 */

// Load .env before the first query (DATABASE_URL / auth secret).
try {
  process.loadEnvFile();
} catch {
  // DATABASE_URL may already be in the process.
}

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";

import { resolveOperator, type OperatorAccess } from "@/domains/production/access";
import { ProductionError } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import {
  artistProfile,
  asset,
  brandProfile,
  deliverable,
  operator,
  productionJob,
  project,
  user,
  workspace,
} from "@/lib/db/schema";
import { getStorageKey } from "@/lib/storage";

import { deliverableExists, loadAssetForPreview } from "./preview";
import { listJobReferences } from "./references";
import { getJobBrief, toggleBriefChecklist, updateBriefInstructions } from "./store";

const stamp = Date.now().toString(36);
const unique = (label: string) => `cw-it-${label}-${stamp}`;

type Fixture = {
  access: OperatorAccess;
  userIds: string[];
  workspaceASlug: string;
  brandProfileAId: string;
  projectAId: string;
  projectBId: string;
  jobAId: string;
  jobBId: string;
  jobWithForeignBriefId: string;
  deliverableAId: string;
  /** An asset whose storage key is recorded on the row. */
  assetWithStoredKeyId: string;
  /** An asset whose storage key must be derived from workspace + deliverable. */
  assetWithoutStoredKeyId: string;
  referenceIds: {
    projectScopedId: string;
    jobScopedId: string;
    otherWorkspaceId: string;
    sourceAssetId: string;
  };
};

const fixture: Fixture = {
  access: null as unknown as OperatorAccess,
  userIds: [],
  workspaceASlug: "",
  brandProfileAId: "",
  projectAId: "",
  projectBId: "",
  jobAId: "",
  jobBId: "",
  jobWithForeignBriefId: "",
  deliverableAId: "",
  assetWithStoredKeyId: "",
  assetWithoutStoredKeyId: "",
  referenceIds: {
    projectScopedId: "",
    jobScopedId: "",
    otherWorkspaceId: "",
    sourceAssetId: "",
  },
};


before(async () => {
  const db = getDb();

  // Self-heal any orphan from a crashed run, then rebuild fresh fixtures.
  await db.delete(user).where(sql`${user.email} like 'cw-it-%'`);

  const operatorUserId = randomUUID();
  const customerAUserId = randomUUID();
  const customerBUserId = randomUUID();

  await db.insert(user).values([
    { id: operatorUserId, name: "CW IT Operator", email: unique("operator") + "@example.com" },
    { id: customerAUserId, name: "CW IT Customer A", email: unique("customer-a") + "@example.com" },
    { id: customerBUserId, name: "CW IT Customer B", email: unique("customer-b") + "@example.com" },
  ]);
  fixture.userIds = [operatorUserId, customerAUserId, customerBUserId];

  await db.insert(operator).values({
    userId: operatorUserId,
    role: "operator",
    displayName: "CW IT Operator",
    active: true,
  });
  const access = await resolveOperator(operatorUserId);
  if (!access) throw new Error("fixture operator did not resolve");
  fixture.access = access;

  const [wsA] = await db
    .insert(workspace)
    .values({ userId: customerAUserId, name: "CW Workspace A", slug: unique("ws-a") })
    .returning({ id: workspace.id, slug: workspace.slug });
  fixture.workspaceASlug = wsA.slug;

  const [wsB] = await db
    .insert(workspace)
    .values({ userId: customerBUserId, name: "CW Workspace B", slug: unique("ws-b") })
    .returning({ id: workspace.id });

  const [brandA] = await db
    .insert(brandProfile)
    .values({ workspaceId: wsA.id, name: "CW Brand A", industry: "Record label" })
    .returning({ id: brandProfile.id });
  fixture.brandProfileAId = brandA.id;

  const [artistB] = await db
    .insert(artistProfile)
    .values({ workspaceId: wsB.id, name: "CW Artist B", genre: "Ambient" })
    .returning({ id: artistProfile.id });

  const [projA] = await db
    .insert(project)
    .values({
      workspaceId: wsA.id,
      contextType: "brand",
      brandProfileId: brandA.id,
      artistProfileId: null,
      name: "CW Project A",
      status: "in_production",
    })
    .returning({ id: project.id });
  fixture.projectAId = projA.id;

  const [projB] = await db
    .insert(project)
    .values({
      workspaceId: wsB.id,
      contextType: "artist",
      brandProfileId: null,
      artistProfileId: artistB.id,
      name: "CW Project B",
      status: "in_production",
    })
    .returning({ id: project.id });
  fixture.projectBId = projB.id;

  const [jobA] = await db
    .insert(productionJob)
    .values({
      workspaceId: wsA.id,
      projectId: projA.id,
      contextType: "brand",
      brandProfileId: brandA.id,
      artistProfileId: null,
      title: "CW Job A",
      productionType: "social_content",
      status: "in_production",
      priority: 30,
      assignedOperatorId: access.operatorId,
    })
    .returning({ id: productionJob.id });
  fixture.jobAId = jobA.id;

  const [jobB] = await db
    .insert(productionJob)
    .values({
      workspaceId: wsB.id,
      projectId: projB.id,
      contextType: "artist",
      brandProfileId: null,
      artistProfileId: artistB.id,
      title: "CW Job B",
      productionType: "cover_artwork",
      status: "changes_requested",
      priority: 70,
      brief: {
        instructions: { objective: "Artwork for the second single" },
        checklist: ["brief_reviewed"],
      },
    })
    .returning({ id: productionJob.id });
  fixture.jobBId = jobB.id;

  const [jobForeign] = await db
    .insert(productionJob)
    .values({
      workspaceId: wsA.id,
      projectId: projA.id,
      contextType: "brand",
      brandProfileId: brandA.id,
      artistProfileId: null,
      title: "CW Job with a foreign brief",
      productionType: "document",
      status: "briefing",
      priority: 55,
      brief: { some_legacy_key: true, checklist: "not-an-array" },
    })
    .returning({ id: productionJob.id });
  fixture.jobWithForeignBriefId = jobForeign.id;

  const [delivA] = await db
    .insert(deliverable)
    .values({
      workspaceId: wsA.id,
      projectId: projA.id,
      jobId: jobA.id,
      name: "CW Deliverable A",
      type: "social_content",
      status: "in_production",
      currentVersion: 1,
    })
    .returning({ id: deliverable.id });
  fixture.deliverableAId = delivA.id;

  const [storedKeyAsset] = await db
    .insert(asset)
    .values({
      workspaceId: wsA.id,
      projectId: projA.id,
      jobId: jobA.id,
      deliverableId: delivA.id,
      category: "delivered",
      filename: "cw-artwork.png",
      mimeType: "image/png",
      sizeBytes: 4096,
      storageKey: "cw-recorded/key/for/artwork",
      storageProvider: "local",
      version: 1,
      customerVisible: true,
    })
    .returning({ id: asset.id });
  fixture.assetWithStoredKeyId = storedKeyAsset.id;

  const [derivedKeyAsset] = await db
    .insert(asset)
    .values({
      workspaceId: wsA.id,
      projectId: projA.id,
      jobId: jobA.id,
      deliverableId: delivA.id,
      category: "delivered",
      filename: "cw-artwork-v2.png",
      mimeType: "image/png",
      sizeBytes: 8192,
      storageKey: null,
      storageProvider: "local",
      version: 1,
      customerVisible: true,
    })
    .returning({ id: asset.id });
  fixture.assetWithoutStoredKeyId = derivedKeyAsset.id;

  const [projectScopedReference] = await db
    .insert(asset)
    .values({
      workspaceId: wsA.id,
      projectId: projA.id,
      jobId: null,
      deliverableId: null,
      category: "reference",
      filename: "cw-moodboard.png",
      mimeType: "image/png",
      sizeBytes: 2048,
      storageKey: null,
      storageProvider: "local",
      version: 1,
      customerVisible: false,
    })
    .returning({ id: asset.id });
  fixture.referenceIds.projectScopedId = projectScopedReference.id;

  const [jobScopedReference] = await db
    .insert(asset)
    .values({
      workspaceId: wsA.id,
      projectId: null,
      jobId: jobA.id,
      deliverableId: null,
      category: "reference",
      filename: "cw-brief-note.pdf",
      mimeType: "application/pdf",
      sizeBytes: 512,
      storageKey: null,
      storageProvider: "local",
      version: 1,
      customerVisible: false,
    })
    .returning({ id: asset.id });
  fixture.referenceIds.jobScopedId = jobScopedReference.id;

  const [otherWorkspaceReference] = await db
    .insert(asset)
    .values({
      workspaceId: wsB.id,
      projectId: projB.id,
      jobId: jobB.id,
      deliverableId: null,
      category: "reference",
      filename: "cw-artist-reference.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      storageKey: null,
      storageProvider: "local",
      version: 1,
      customerVisible: false,
    })
    .returning({ id: asset.id });
  fixture.referenceIds.otherWorkspaceId = otherWorkspaceReference.id;

  const [sourceAsset] = await db
    .insert(asset)
    .values({
      workspaceId: wsA.id,
      projectId: projA.id,
      jobId: jobA.id,
      deliverableId: delivA.id,
      category: "source",
      filename: "cw-working.psd",
      mimeType: "image/vnd.photoshop",
      sizeBytes: 16384,
      storageKey: null,
      storageProvider: "local",
      version: 1,
      customerVisible: false,
    })
    .returning({ id: asset.id });
  fixture.referenceIds.sourceAssetId = sourceAsset.id;
});

after(async () => {
  const db = getDb();
  const ids = fixture.userIds.filter(Boolean);
  if (!ids.length) return;
  await db.delete(user).where(inArray(user.id, ids));
});

/** A scratch job on the shared workspace, cleared of its brief after the test. */
async function withScratchJob(
  label: string,
  productionType: "social_content" | "cover_artwork",
  run: (jobId: string, cleanup: () => Promise<void>) => Promise<void>,
): Promise<void> {
  const db = getDb();
  const [wsRow] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, fixture.workspaceASlug))
    .limit(1);
  if (!wsRow) throw new Error("fixture workspace is missing");
  const [projRow] = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.id, fixture.projectAId))
    .limit(1);
  if (!projRow) throw new Error("fixture project is missing");

  const [job] = await db
    .insert(productionJob)
    .values({
      workspaceId: wsRow.id,
      projectId: projRow.id,
      contextType: "brand",
      brandProfileId: fixture.brandProfileAId,
      artistProfileId: null,
      title: `CW ${label}`,
      productionType,
      status: "in_production",
      priority: 30,
    })
    .returning({ id: productionJob.id });

  try {
    await run(job.id, async () => {
      await db
        .update(productionJob)
        .set({ brief: null, updatedAt: new Date() })
        .where(eq(productionJob.id, job.id));
    });
  } finally {
    // A scratch job never outlives its test: the row itself is removed so the
    // next run starts from a clean brief and the fixture database stays clean.
    await db.delete(productionJob).where(eq(productionJob.id, job.id));
  }
}

/** The job's own lifecycle state, read straight from the row. */
async function jobState(jobId: string) {
  const [row] = await getDb()
    .select({ status: productionJob.status, startedAt: productionJob.startedAt })
    .from(productionJob)
    .where(eq(productionJob.id, jobId))
    .limit(1);
  return row;
}

/** The refusal a creative call produced, or null when it succeeded. */
async function refusalCode(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    return error instanceof ProductionError ? error.code : `unexpected:${String(error)}`;
  }
}

/* ==========================================================================
 * The brief store writes the brief and nothing else (spec §8, §9, §16)
 * ========================================================================== */

test("a job with no brief reads as an honest empty brief", async () => {
  const brief = await getJobBrief(fixture.access, fixture.jobAId);
  assert.deepEqual(brief, { instructions: {}, checklist: [] });
});

test("production instructions are written and read back", async () => {
  const saved = await updateBriefInstructions(fixture.access, fixture.jobAId, {
    objective: "Ten social posts for the launch week",
    composition: "One clear subject per post, generous negative space",
    dimensions: "1080 x 1350",
  });

  assert.deepEqual(saved.instructions, {
    objective: "Ten social posts for the launch week",
    composition: "One clear subject per post, generous negative space",
    dimensions: "1080 x 1350",
  });

  const read = await getJobBrief(fixture.access, fixture.jobAId);
  assert.deepEqual(read.instructions, saved.instructions);
});

test("ticking a checklist item does not disturb the instructions", async () => {
  const toggled = await toggleBriefChecklist(
    fixture.access,
    fixture.jobAId,
    "brief_reviewed",
    true,
  );

  assert.deepEqual(toggled.checklist, ["brief_reviewed"]);
  assert.equal(toggled.instructions.objective, "Ten social posts for the launch week");

  const read = await getJobBrief(fixture.access, fixture.jobAId);
  assert.deepEqual(read.checklist, ["brief_reviewed"]);
  assert.equal(read.instructions.objective, "Ten social posts for the launch week");
});

test("saving one half of the brief never clobbers the other half", async () => {
  await toggleBriefChecklist(fixture.access, fixture.jobAId, "references_reviewed", true);

  const after = await updateBriefInstructions(fixture.access, fixture.jobAId, {
    objective: "Ten social posts for the launch week",
    composition: "One clear subject per post, generous negative space",
    dimensions: "1080 x 1350",
    copyDirection: "Warm, plain, no exclamation marks",
  });

  // Both halves survive: the checklist is intact and the new field arrived.
  assert.deepEqual(after.checklist, ["brief_reviewed", "references_reviewed"]);
  assert.equal(after.instructions.copyDirection, "Warm, plain, no exclamation marks");
});

test("the creative brief never moves the job's lifecycle state", async () => {
  const before = await jobState(fixture.jobAId);

  await updateBriefInstructions(fixture.access, fixture.jobAId, { objective: "Still producing" });
  await toggleBriefChecklist(fixture.access, fixture.jobAId, "brief_reviewed", false);

  const after = await jobState(fixture.jobAId);
  assert.equal(after?.status, "in_production");
  assert.equal(after?.status, before?.status);
  // A checklist and an instruction save start nothing either.
  assert.equal(after?.startedAt, null);
});

/* ==========================================================================
 * Every write re-validates (spec §23)
 * ========================================================================== */

test("an unknown instruction key is refused and nothing is stored", async () => {
  const code = await refusalCode(() =>
    updateBriefInstructions(fixture.access, fixture.jobAId, {
      objective: "This should never land",
      productionStatus: "approved",
    }),
  );
  assert.equal(code, "invalid_input");

  const read = await getJobBrief(fixture.access, fixture.jobAId);
  assert.equal(read.instructions.objective, "Still producing");
  assert.equal("productionStatus" in read.instructions, false);
});

test("an instruction value over its bound is refused", async () => {
  const code = await refusalCode(() =>
    updateBriefInstructions(fixture.access, fixture.jobAId, { objective: "x".repeat(600) }),
  );
  assert.equal(code, "invalid_input");

  const read = await getJobBrief(fixture.access, fixture.jobAId);
  assert.equal(read.instructions.objective, "Still producing");
});

test("a checklist key outside this job's production type is refused and nothing is stored", async () => {
  // `slide_flow_reviewed` belongs to presentations; this job is social content.
  assert.equal(
    await refusalCode(() =>
      toggleBriefChecklist(fixture.access, fixture.jobAId, "slide_flow_reviewed", true),
    ),
    "invalid_input",
  );
  assert.equal(
    await refusalCode(() =>
      toggleBriefChecklist(fixture.access, fixture.jobAId, "invented_key", true),
    ),
    "invalid_input",
  );

  const read = await getJobBrief(fixture.access, fixture.jobAId);
  assert.equal(read.checklist.includes("slide_flow_reviewed"), false);
  assert.equal(read.checklist.includes("invented_key"), false);
});

/* ==========================================================================
 * Identifiers fail closed (spec §26)
 * ========================================================================== */

test("a malformed job id is not found, never a database error", async () => {
  assert.equal(await refusalCode(() => getJobBrief(fixture.access, "not-a-uuid")), "not_found");
  assert.equal(
    await refusalCode(() =>
      updateBriefInstructions(fixture.access, "not-a-uuid", { objective: "x" }),
    ),
    "not_found",
  );
  assert.equal(
    await refusalCode(() =>
      toggleBriefChecklist(fixture.access, "not-a-uuid", "brief_reviewed", true),
    ),
    "not_found",
  );
  assert.equal(await refusalCode(() => getJobBrief(fixture.access, "")), "not_found");
});

test("an unknown job id is not found, exactly as a malformed one is", async () => {
  const unknown = randomUUID();
  assert.equal(await refusalCode(() => getJobBrief(fixture.access, unknown)), "not_found");
  assert.equal(
    await refusalCode(() => updateBriefInstructions(fixture.access, unknown, { objective: "x" })),
    "not_found",
  );
  assert.equal(
    await refusalCode(() => toggleBriefChecklist(fixture.access, unknown, "brief_reviewed", true)),
    "not_found",
  );
});

/* ==========================================================================
 * Isolation between jobs and workspaces (spec §24, §25)
 * ========================================================================== */

test("a brief holding foreign jsonb reads as an honest empty brief", async () => {
  const brief = await getJobBrief(fixture.access, fixture.jobWithForeignBriefId);
  assert.deepEqual(brief, { instructions: {}, checklist: [] });
});

test("one job's brief is never returned for another job's id", async () => {
  const jobA = await getJobBrief(fixture.access, fixture.jobAId);
  const jobB = await getJobBrief(fixture.access, fixture.jobBId);

  assert.equal(jobB.instructions.objective, "Artwork for the second single");
  assert.deepEqual(jobB.checklist, ["brief_reviewed"]);
  assert.notEqual(jobA.instructions.objective, jobB.instructions.objective);
});

test("writing one job's brief leaves another job's brief untouched", async () => {
  const before = await getJobBrief(fixture.access, fixture.jobBId);

  await updateBriefInstructions(fixture.access, fixture.jobAId, { objective: "Job A only" });
  await toggleBriefChecklist(fixture.access, fixture.jobAId, "brief_reviewed", true);

  const after = await getJobBrief(fixture.access, fixture.jobBId);
  assert.deepEqual(after, before);
});

/* ==========================================================================
 * Creative references are scoped to the job (spec §13, §24)
 * ========================================================================== */

test("reference files are read from the job's own project and from the job itself", async () => {
  const references = await listJobReferences(fixture.access, {
    id: fixture.jobAId,
    projectId: fixture.projectAId,
  });

  assert.deepEqual(
    new Set(references.map((reference) => reference.id)),
    new Set([fixture.referenceIds.projectScopedId, fixture.referenceIds.jobScopedId]),
  );
  assert.deepEqual(
    new Set(references.map((reference) => reference.filename)),
    new Set(["cw-moodboard.png", "cw-brief-note.pdf"]),
  );
});

test("another workspace's reference file never appears on this job", async () => {
  const references = await listJobReferences(fixture.access, {
    id: fixture.jobAId,
    projectId: fixture.projectAId,
  });

  assert.equal(
    references.some((reference) => reference.id === fixture.referenceIds.otherWorkspaceId),
    false,
  );
});

test("a non-reference asset is never presented as reference material", async () => {
  const references = await listJobReferences(fixture.access, {
    id: fixture.jobAId,
    projectId: fixture.projectAId,
  });

  // The working file and the produced output belong to the same job, and are
  // deliberately not reference material.
  assert.equal(
    references.some((reference) => reference.id === fixture.referenceIds.sourceAssetId),
    false,
  );
  assert.equal(
    references.some((reference) => reference.id === fixture.assetWithStoredKeyId),
    false,
  );
});

test("a reference read with an unusable scope yields nothing rather than a wider query", async () => {
  assert.deepEqual(
    await listJobReferences(fixture.access, { id: fixture.jobAId, projectId: "not-a-uuid" }),
    [],
  );
  assert.deepEqual(
    await listJobReferences(fixture.access, { id: "not-a-uuid", projectId: "" }),
    [],
  );
});

/* ==========================================================================
 * The preview resolver never guesses a location (spec §11, §12)
 * ========================================================================== */

test("a recorded storage key is used as recorded, and describes the file honestly", async () => {
  const asset = await loadAssetForPreview(fixture.access, fixture.assetWithStoredKeyId);

  assert.ok(asset);
  assert.equal(asset!.storageKey, "cw-recorded/key/for/artwork");
  assert.equal(asset!.deliverableId, fixture.deliverableAId);
  assert.equal(asset!.category, "delivered");
  assert.equal(asset!.customerVisible, true);
  assert.equal(asset!.filename, "cw-artwork.png");
  assert.equal(asset!.mimeType, "image/png");
  assert.equal(asset!.sizeBytes, 4096);
  // The returned object carries only what the route needs, and never any more.
  assert.deepEqual(Object.keys(asset!).sort(), [
    "category",
    "customerVisible",
    "deliverableId",
    "filename",
    "id",
    "mimeType",
    "sizeBytes",
    "storageKey",
  ]);
});

test("a storage key is derived server-side when the asset has none", async () => {
  const asset = await loadAssetForPreview(fixture.access, fixture.assetWithoutStoredKeyId);

  assert.ok(asset);
  assert.equal(
    asset!.storageKey,
    getStorageKey(fixture.workspaceASlug, fixture.deliverableAId, fixture.assetWithoutStoredKeyId),
  );
});

test("an asset that cannot be resolved answers null rather than a guessed path", async () => {
  assert.equal(await loadAssetForPreview(fixture.access, randomUUID()), null);
  assert.equal(await loadAssetForPreview(fixture.access, "not-a-uuid"), null);
  assert.equal(await loadAssetForPreview(fixture.access, ""), null);
  // A reference file that never became a version has no deliverable to key from.
  assert.equal(
    await loadAssetForPreview(fixture.access, fixture.referenceIds.projectScopedId),
    null,
  );
});

test("deliverable existence is answered exactly", async () => {
  assert.equal(await deliverableExists(fixture.deliverableAId), true);
  assert.equal(await deliverableExists(randomUUID()), false);
  assert.equal(await deliverableExists("not-a-uuid"), false);
  assert.equal(await deliverableExists(""), false);
});

/* ==========================================================================
 * Authorization: only a live operator reaches any of this (spec §23)
 * ========================================================================== */

test("every creative read and write refuses a caller who is not a verified operator", async () => {
  const anonymous = {} as OperatorAccess;

  await assert.rejects(() => getJobBrief(anonymous, fixture.jobAId), /verified operator/i);
  await assert.rejects(
    () => updateBriefInstructions(anonymous, fixture.jobAId, { objective: "x" }),
    /verified operator/i,
  );
  await assert.rejects(
    () => toggleBriefChecklist(anonymous, fixture.jobAId, "brief_reviewed", true),
    /verified operator/i,
  );
  await assert.rejects(
    () => listJobReferences(anonymous, { id: fixture.jobAId, projectId: fixture.projectAId }),
    /verified operator/i,
  );
  await assert.rejects(
    () => loadAssetForPreview(anonymous, fixture.assetWithStoredKeyId),
    /verified operator/i,
  );
});

test("an access object missing its operator id is refused rather than trusted", async () => {
  const halfAccess = { userId: randomUUID() } as OperatorAccess;

  await assert.rejects(() => getJobBrief(halfAccess, fixture.jobAId), /verified operator/i);
  await assert.rejects(
    () => updateBriefInstructions(halfAccess, fixture.jobAId, { objective: "x" }),
    /verified operator/i,
  );
  await assert.rejects(
    () => toggleBriefChecklist(halfAccess, fixture.jobAId, "brief_reviewed", true),
    /verified operator/i,
  );
});

test("refusing a caller changes nothing on the job", async () => {
  const before = await getJobBrief(fixture.access, fixture.jobAId);

  await assert.rejects(() => getJobBrief({} as OperatorAccess, fixture.jobAId));
  await assert.rejects(() =>
    updateBriefInstructions({} as OperatorAccess, fixture.jobAId, { objective: "hijacked" }),
  );

  const after = await getJobBrief(fixture.access, fixture.jobAId);
  assert.deepEqual(after, before);
});

/* ==========================================================================
 * The two writers never lose each other's work, however they interleave
 * (spec §23: no silent clobber; the fix is a row lock, never UI disabling)
 * ========================================================================== */

test("two instruction writes to the same job both land", async () => {
  await withScratchJob("two writers", "social_content", async (jobId, reset) => {
    await updateBriefInstructions(fixture.access, jobId, { objective: "first writer" });
    await updateBriefInstructions(fixture.access, jobId, { objective: "second writer" });

    const brief = await getJobBrief(fixture.access, jobId);
    assert.equal(brief.instructions.objective, "second writer");
    await reset();
    assert.deepEqual(await getJobBrief(fixture.access, jobId), {
      instructions: {},
      checklist: [],
    });
  });
});

test("concurrent instruction and checklist writes keep both halves", async () => {
  await withScratchJob("two halves at once", "social_content", async (jobId, reset) => {
    await updateBriefInstructions(fixture.access, jobId, { objective: "write me first" });

    // The checklist toggle races the instructions write on purpose: whichever
    // order the rows lock in, neither half may be lost.
    await Promise.all([
      updateBriefInstructions(fixture.access, jobId, { objective: "raced instructions" }),
      toggleBriefChecklist(fixture.access, jobId, "brief_reviewed", true),
    ]);

    const brief = await getJobBrief(fixture.access, jobId);
    assert.equal(brief.instructions.objective, "raced instructions");
    assert.deepEqual(brief.checklist, ["brief_reviewed"]);
    await reset();
  });
});

test("repeated checklist toggling is stable however it interleaves", async () => {
  await withScratchJob("toggle storm", "social_content", async (jobId, reset) => {
    await Promise.all([
      toggleBriefChecklist(fixture.access, jobId, "brief_reviewed", true),
      toggleBriefChecklist(fixture.access, jobId, "brief_reviewed", true),
      toggleBriefChecklist(fixture.access, jobId, "references_reviewed", true),
      toggleBriefChecklist(fixture.access, jobId, "references_reviewed", true),
    ]);

    assert.deepEqual((await getJobBrief(fixture.access, jobId)).checklist, [
      "brief_reviewed",
      "references_reviewed",
    ]);

    await Promise.all([
      toggleBriefChecklist(fixture.access, jobId, "brief_reviewed", false),
      toggleBriefChecklist(fixture.access, jobId, "references_reviewed", false),
    ]);

    assert.deepEqual((await getJobBrief(fixture.access, jobId)).checklist, []);
    await reset();
  });
});
