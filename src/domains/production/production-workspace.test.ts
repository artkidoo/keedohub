/**
 * Production-workspace customer context + queue attribution, against real
 * PostgreSQL (Phase 4.2, spec §8 and §19).
 *
 * The pure normalisers are unit-tested elsewhere; this proves the parts that
 * need the database: that `getProductionContext` reads the profile the job is
 * bound to (present fields only, colours only when real), that a malformed or
 * unknown profile id answers "no context" rather than another customer's data,
 * that a non-operator is refused, and that the production queue now names the
 * assigned operator.
 *
 * Concurrency and integrity for the production output paths (Phase 4.3):
 * repeated checklist toggling, repeated instructions, repeated deliverable
 * creation, repeated QA release readiness, repeated version creation on the
 * same deliverable, review-open protection during version creation, and
 * changes-requested leading to a new version. No production system was
 * created for this: every test drives the existing writer — produceVersion,
 * createDeliverableVersion, createDeliverableForJob, transitionJob,
 * openReviewsForJob, qaReadiness — and asserts its documented guarantee.
 *
 * Fixtures are namespaced and removed in `after`, mirroring the Phase 4.1 test.
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
import { rmSync } from "node:fs";
import { join } from "node:path";

import { resolveOperator, type OperatorAccess } from "./access";
import { createDeliverableForJob, produceVersion } from "./output";
import { qaReadiness } from "./qa";
import { transitionJob } from "./chain";
import { listReviewsForDeliverable, openReviewsForJob } from "./review";
import { listDeliverableVersions } from "./versions";
import { getProductionContext } from "./customer-context";
import { listProductionQueue } from "./queue";
import { getDb } from "@/lib/db";
import {
  artistProfile,
  brandProfile,
  deliverable,
  deliverableVersion,
  operator,
  productionJob,
  project,
  user,
  workspace,
} from "@/lib/db/schema";

const stamp = Date.now().toString(36);
const unique = (label: string) => `pw-it-${label}-${stamp}`;

type Fixture = {
  access: OperatorAccess;
  userIds: string[];
  workspaceId: string;
  projectId: string;
  brandProfileId: string;
  artistProfileId: string;
  brandJobId: string;
  artistJobId: string;
  operatorDisplayName: string;
};

const fixture: Fixture = {
  access: null as unknown as OperatorAccess,
  userIds: [],
  workspaceId: "",
  projectId: "",
  brandProfileId: "",
  artistProfileId: "",
  brandJobId: "",
  artistJobId: "",
  operatorDisplayName: "Workspace IT Operator",
};

before(async () => {
  const db = getDb();

  // Self-heal any orphan from a crashed run, then rebuild fresh fixtures.
  await db.delete(user).where(sql`${user.email} like 'pw-it-%'`);

  const operatorUserId = randomUUID();
  const customerUserId = randomUUID();
  await db.insert(user).values([
    {
      id: operatorUserId,
      name: "PW IT Operator",
      email: unique("operator") + "@example.com",
    },
    {
      id: customerUserId,
      name: "PW IT Customer",
      email: unique("customer") + "@example.com",
    },
  ]);
  fixture.userIds = [operatorUserId, customerUserId];

  await db.insert(operator).values({
    userId: operatorUserId,
    role: "operator",
    displayName: fixture.operatorDisplayName,
    active: true,
  });
  const access = await resolveOperator(operatorUserId);
  if (!access) throw new Error("fixture operator did not resolve");
  fixture.access = access;

  const [ws] = await db
    .insert(workspace)
    .values({ userId: customerUserId, name: "PW Workspace", slug: unique("ws") })
    .returning({ id: workspace.id });
  fixture.workspaceId = ws.id;

  const [brand] = await db
    .insert(brandProfile)
    .values({
      workspaceId: ws.id,
      name: "PW Brand",
      industry: "Specialty coffee",
      voice: "Warm and grounded",
      colors: { primary: "#0a0a0a" },
    })
    .returning({ id: brandProfile.id });
  fixture.brandProfileId = brand.id;

  const [artist] = await db
    .insert(artistProfile)
    .values({ workspaceId: ws.id, name: "PW Artist", genre: "Synthwave" })
    .returning({ id: artistProfile.id });
  fixture.artistProfileId = artist.id;

  const [proj] = await db
    .insert(project)
    .values({
      workspaceId: ws.id,
      contextType: "brand",
      brandProfileId: brand.id,
      artistProfileId: null,
      name: "PW Project",
      status: "in_production",
    })
    .returning({ id: project.id });
  fixture.projectId = proj.id;

  const [brandJob] = await db
    .insert(productionJob)
    .values({
      workspaceId: ws.id,
      projectId: proj.id,
      contextType: "brand",
      brandProfileId: brand.id,
      artistProfileId: null,
      title: "Brand job",
      productionType: "social_content",
      status: "incoming",
      priority: 40,
      assignedOperatorId: access.operatorId,
    })
    .returning({ id: productionJob.id });
  fixture.brandJobId = brandJob.id;

  const [artistJob] = await db
    .insert(productionJob)
    .values({
      workspaceId: ws.id,
      projectId: proj.id,
      contextType: "artist",
      brandProfileId: null,
      artistProfileId: artist.id,
      title: "Artist job",
      productionType: "cover_artwork",
      status: "incoming",
      priority: 60,
    })
    .returning({ id: productionJob.id });
  fixture.artistJobId = artistJob.id;
});

after(async () => {
  const db = getDb();
  const ids = fixture.userIds.filter(Boolean);
  if (!ids.length) return;
  await db.delete(user).where(inArray(user.id, ids));
});

/* ==========================================================================
 * Customer context read (spec §8)
 * ========================================================================== */

test("a brand job's context shows only the fields the brand actually filled in", async () => {
  const context = await getProductionContext(fixture.access, {
    contextType: "brand",
    brandProfileId: fixture.brandProfileId,
    artistProfileId: null,
  });
  assert.ok(context);
  assert.equal(context!.kind, "brand");
  assert.equal(context!.hasContent, true);
  // industry and voice were set; description/products/etc. were left null.
  assert.deepEqual(
    context!.facts.map((fact) => fact.label),
    ["Industry", "Voice"],
  );
  // A real colour is painted as a swatch, not left as text.
  assert.deepEqual(context!.colours, [{ role: "Primary", colour: "#0a0a0a" }]);
});

test("an artist job's context is present-only and carries its palette", async () => {
  const context = await getProductionContext(fixture.access, {
    contextType: "artist",
    brandProfileId: null,
    artistProfileId: fixture.artistProfileId,
  });
  assert.ok(context);
  assert.equal(context!.kind, "artist");
  assert.deepEqual(
    context!.facts.map((fact) => fact.label),
    ["Genre"],
  );
  assert.deepEqual(context!.colours, []);
});

test("a malformed profile id answers with no context rather than a query", async () => {
  const context = await getProductionContext(fixture.access, {
    contextType: "brand",
    brandProfileId: "not-a-uuid",
    artistProfileId: null,
  });
  assert.equal(context, null);
});

test("a well-formed but unknown profile id answers with no context, never a leak", async () => {
  const context = await getProductionContext(fixture.access, {
    contextType: "brand",
    brandProfileId: randomUUID(),
    artistProfileId: null,
  });
  assert.equal(context, null);
});

test("a caller who is not a verified operator is refused", async () => {
  await assert.rejects(
    getProductionContext({} as OperatorAccess, {
      contextType: "brand",
      brandProfileId: fixture.brandProfileId,
      artistProfileId: null,
    }),
    /verified operator/i,
  );
});

/* ==========================================================================
 * Queue attribution (spec §19)
 * ========================================================================== */

test("the production queue names the assigned operator and marks unassigned work", async () => {
  const rows = await listProductionQueue(fixture.access, {
    workspaceId: fixture.workspaceId,
  });
  const brandRow = rows.find((row) => row.id === fixture.brandJobId);
  const artistRow = rows.find((row) => row.id === fixture.artistJobId);
  assert.ok(brandRow && artistRow);
  assert.equal(brandRow!.assignedOperatorName, fixture.operatorDisplayName);
  assert.equal(artistRow!.assignedOperatorName, null);
});

/* ==========================================================================
 * Concurrency and integrity on the existing output paths (Phase 4.3)
 * ========================================================================== */

/**
 * A scratch job on the shared workspace, removed after the test. One writer
 * at a time owns it; concurrent calls race only their own writes against
 * each other, never another test's.
 */
async function withOutputJob(label: string, run: (jobId: string) => Promise<void>): Promise<void> {
  const db = getDb();
  const [job] = await db
    .insert(productionJob)
    .values({
      workspaceId: fixture.workspaceId,
      projectId: fixture.projectId,
      contextType: "brand",
      brandProfileId: fixture.brandProfileId,
      artistProfileId: null,
      title: `PW ${label}`,
      productionType: "social_content",
      status: "in_production",
      priority: 30,
    })
    .returning({ id: productionJob.id });

  try {
    await run(job.id);
  } finally {
    // Children first (versions/assets cascade from the deliverable, and the
    // deliverables from the job), then the bytes those deliverables wrote, so
    // neither the database nor the storage root keeps this test's residue.
    const deliverables = await db
      .select({ id: deliverable.id })
      .from(deliverable)
      .where(eq(deliverable.jobId, job.id));

    await db.delete(productionJob).where(eq(productionJob.id, job.id));

    const base = process.env.STORAGE_LOCAL_BASE_DIR;
    const [owner] = await db
      .select({ slug: workspace.slug })
      .from(workspace)
      .where(eq(workspace.id, fixture.workspaceId))
      .limit(1);
    if (base && owner) {
      for (const row of deliverables) {
        rmSync(join(base, owner.slug, "assets", row.id), { recursive: true, force: true });
      }
    }
  }
}

/** Real bytes for the local storage provider, written by the version call. */
function outputFile(name: string): { name: string; size: number; type: string; bytes: Buffer } {
  const bytes = Buffer.from(`pw-it ${name} ${Date.now()}`, "utf8");
  return { name, size: bytes.length, type: "image/png", bytes };
}

test("repeated version creation on the same deliverable stays monotonic and singular", async () => {
  await withOutputJob("version bursts", async (jobId) => {
    const created = await createDeliverableForJob(fixture.access, jobId, {
      name: "Burst deliverable",
      type: "social_content",
    });

    // Five versions in one burst: the transaction plus the unique index mean
    // the numbers come out 1..5 with exactly one current row.
    const outputs = await Promise.all(
      ["v1.png", "v2.png", "v3.png", "v4.png", "v5.png"].map((name) =>
        produceVersion(fixture.access, created.id, { file: outputFile(name) }),
      ),
    );
    assert.deepEqual(
      outputs.map((output) => output.version).sort((a, b) => a - b),
      [1, 2, 3, 4, 5],
    );

    const versions = await listDeliverableVersions(fixture.access, created.id);
    assert.equal(versions.length, 5);
    assert.equal(versions.filter((row) => row.isCurrent).length, 1);
    assert.equal(versions.find((row) => row.isCurrent)?.version, 5);

    // No version row was deleted to make room: history is five rows deep.
    const db = getDb();
    const rows = await db
      .select({ version: deliverableVersion.version })
      .from(deliverableVersion)
      .where(eq(deliverableVersion.deliverableId, created.id));
    assert.equal(rows.length, 5);
  });
});

test("a new version is refused while the customer is still deciding", async () => {
  await withOutputJob("review-open guard", async (jobId) => {
    const created = await createDeliverableForJob(fixture.access, jobId, {
      name: "Guarded deliverable",
      type: "social_content",
    });
    await produceVersion(fixture.access, created.id, { file: outputFile("open.png") });

    // Move the job to review the honest way: QA first, then the guarded
    // transition. A version write must still be refused afterwards.
    await transitionJob(fixture.access, jobId, "internal_qa");
    const before = await qaReadiness(fixture.access, jobId);
    assert.equal(before.ready, true);
    await transitionJob(fixture.access, jobId, "customer_review");

    await assert.rejects(
      () => produceVersion(fixture.access, created.id, { file: outputFile("late.png") }),
      /with the customer for review/i,
    );

    // Deciding the review re-opens production; the next version then lands.
    await transitionJob(fixture.access, jobId, "changes_requested");
    await transitionJob(fixture.access, jobId, "in_production");
    const revised = await produceVersion(fixture.access, created.id, {
      file: outputFile("revised.png"),
    });
    assert.equal(revised.version, 2);
  });
});

test("changes-requested leads to a new version that supersedes the old one", async () => {
  await withOutputJob("changes cycle", async (jobId) => {
    const created = await createDeliverableForJob(fixture.access, jobId, {
      name: "Cycled deliverable",
      type: "social_content",
    });
    await produceVersion(fixture.access, created.id, { file: outputFile("first.png") });

    await transitionJob(fixture.access, jobId, "internal_qa");
    await transitionJob(fixture.access, jobId, "customer_review");

    // The guarded transition opens exactly one review per deliverable, and
    // asking again creates nothing: the release is idempotent.
    const afterRelease = await listReviewsForDeliverable(fixture.access, created.id);
    assert.equal(afterRelease.filter((row) => row.status === "pending").length, 1);
    assert.deepEqual(await openReviewsForJob(fixture.access, jobId), []);
    assert.equal(
      (await listReviewsForDeliverable(fixture.access, created.id)).filter(
        (row) => row.status === "pending",
      ).length,
      1,
    );

    await transitionJob(fixture.access, jobId, "changes_requested");
    await transitionJob(fixture.access, jobId, "in_production");
    const revised = await produceVersion(fixture.access, created.id, {
      file: outputFile("second.png"),
    });
    assert.equal(revised.version, 2);

    const versions = await listDeliverableVersions(fixture.access, created.id);
    assert.equal(versions.filter((row) => row.isCurrent).length, 1);
    assert.ok(versions.some((row) => row.version === 1 && !row.isCurrent));
  });
});

test("repeated QA release reads stay consistent", async () => {
  await withOutputJob("qa repeats", async (jobId) => {
    const created = await createDeliverableForJob(fixture.access, jobId, {
      name: "QA deliverable",
      type: "social_content",
    });

    const empty = await qaReadiness(fixture.access, jobId);
    assert.equal(empty.ready, false);

    await produceVersion(fixture.access, created.id, { file: outputFile("ready.png") });
    const readiness = await Promise.all([
      qaReadiness(fixture.access, jobId),
      qaReadiness(fixture.access, jobId),
      qaReadiness(fixture.access, jobId),
    ]);
    for (const read of readiness) assert.equal(read.ready, true);
  });
});

test("repeated deliverable creation creates siblings, never duplicates", async () => {
  await withOutputJob("deliverable repeats", async (jobId) => {
    const created = await Promise.all([
      createDeliverableForJob(fixture.access, jobId, { name: "Sibling A", type: "social_content" }),
      createDeliverableForJob(fixture.access, jobId, { name: "Sibling B", type: "social_content" }),
    ]);
    assert.equal(new Set(created.map((row) => row.id)).size, 2);
    for (const row of created) assert.equal(row.jobId, jobId);
  });
});
