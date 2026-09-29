/**
 * Studio data access and security, against real PostgreSQL (Phase 4.1).
 *
 * Three principals meet the Studio: an owner operator, a plain operator, and a
 * customer. The rules under test are the ones the spec calls non-negotiable:
 *
 *   - a customer never resolves to operator access (no row, no Studio, no
 *     route), and a revoked operator stops resolving immediately;
 *   - every Studio read refuses to run without verified operator access;
 *   - both operators see the same internal reality — the Studio is global by
 *     design — while credentials are never loaded onto any of these screens;
 *   - malformed and unknown identifiers answer "not found", never a database
 *     error and never someone else's record;
 *   - the Command Center, review board, deliveries and file view report the
 *     real state of the rows, including honest emptiness.
 *
 * The fixtures are created once for the file and removed at the end; they are
 * namespaced with a timestamp so a crashed run leaves only its own traces.
 */

import nodeTest, { after, before } from "node:test";
import assert from "node:assert/strict";

/**
 * Local test wrapper: logs each test's name and outcome to stderr so a crash
 * mid-run is attributable to a specific test, then delegates to node:test.
 */
function test(name: string, fn: (ctx: unknown) => Promise<void> | void) {
  return nodeTest(name, async (ctx) => {
    console.error(`▶ ${name}`);
    try {
      await fn(ctx);
      console.error(`✔ ${name}`);
    } catch (error) {
      console.error(`✖ ${name}: ${(error as Error).message}`);
      throw error;
    }
  });
}
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

// The database is configured in .env; load it before the first query.
try {
  process.loadEnvFile();
} catch {
  // No .env in some environments; DATABASE_URL may still be in the process.
}

import {
  resolveOperator,
  type OperatorAccess,
} from "@/domains/production/access";
import { getCommandCenter } from "@/domains/studio/command-center";
import { getStudioCustomer, listStudioCustomers } from "@/domains/studio/customers";
import { listStudioDeliveries, listStudioFiles } from "@/domains/studio/deliveries";
import {
  countStudioProjectsByStatus,
  getStudioProject,
  listStudioProjects,
} from "@/domains/studio/projects";
import {
  countStudioRequestsByStatus,
  getStudioRequest,
  listStudioRequests,
} from "@/domains/studio/requests";
import { getStudioReviewBoard } from "@/domains/studio/review-board";
import {
  getStudioOperator,
  getStudioPlatformSummary,
  listOperatorRoster,
} from "@/domains/studio/settings";
import { getDb } from "@/lib/db";
import {
  account,
  artistProfile,
  asset,
  brandProfile,
  deliverable,
  deliverableVersion,
  delivery,
  operator,
  productionJob,
  project,
  request,
  review,
  user,
  workspace,
} from "@/lib/db/schema";

const stamp = Date.now().toString(36);
const unique = (label: string) => `studio-it-${label}-${stamp}`;

/** Password that must never appear on any Studio surface. */
const SECRET_PASSWORD = `hunter2-it-${stamp}`;

type Fixture = {
  owner: OperatorAccess;
  staff: OperatorAccess;
  ownerOperatorId: string;
  staffOperatorId: string;
  /** Every user this file creates, removed in `after`. */
  userIds: string[];
  customerId: string;
  workspaceId: string;
  unstartedRequestId: string;
  startedRequestId: string;
  projectId: string;
  pendingDeliverableId: string;
  approvedDeliverableId: string;
  pendingJobId: string;
  deliveryId: string;
  storedAssetId: string;
};

const fixture: Fixture = {
  owner: null as unknown as OperatorAccess,
  staff: null as unknown as OperatorAccess,
  ownerOperatorId: "",
  staffOperatorId: "",
  userIds: [],
  customerId: "",
  workspaceId: "",
  unstartedRequestId: "",
  startedRequestId: "",
  projectId: "",
  pendingDeliverableId: "",
  approvedDeliverableId: "",
  pendingJobId: "",
  deliveryId: "",
  storedAssetId: "",
};

before(async () => {
  const db = getDb();

  // Self-heal first. Every run owns the "studio-it-" namespace; a run that
  // crashed before `after` could clean up would otherwise leave orphans behind.
  // Because the Command Center board is global and capped (its attention list is
  // the oldest 8 jobs), stale jobs from a dead run crowd a fresh fixture out of
  // the list and the assertions below would read a lie. Deleting these users
  // cascades away their workspaces, requests, jobs and deliveries in one pass.
  await db.delete(user).where(sql`${user.email} like 'studio-it-%'`);

  // --- principals ---------------------------------------------------------
  const ownerId = randomUUID();
  const staffId = randomUUID();
  const customerId = randomUUID();

  await db.insert(user).values([
    { id: ownerId, name: "Studio IT Owner", email: unique("owner") + "@example.com" },
    { id: staffId, name: "Studio IT Staff", email: unique("staff") + "@example.com" },
    { id: customerId, name: "Studio IT Customer", email: unique("customer") + "@example.com" },
  ]);
  fixture.userIds = [ownerId, staffId, customerId];

  const [ownerRow] = await db
    .insert(operator)
    .values({
      userId: ownerId,
      role: "owner",
      displayName: "IT Owner",
      active: true,
    })
    .returning({ id: operator.id });
  const [staffRow] = await db
    .insert(operator)
    .values({
      userId: staffId,
      role: "operator",
      displayName: "IT Staff",
      active: true,
    })
    .returning({ id: operator.id });

  // A credential exists for the customer, as it would for any real account.
  await db.insert(account).values({
    id: randomUUID(),
    userId: customerId,
    accountId: unique("acct"),
    providerId: "credential",
    password: SECRET_PASSWORD,
  });

  const ownerAccess = await resolveOperator(ownerId);
  const staffAccess = await resolveOperator(staffId);
  if (!ownerAccess || !staffAccess) {
    throw new Error("fixture operators did not resolve");
  }
  fixture.owner = ownerAccess;
  fixture.staff = staffAccess;
  fixture.customerId = customerId;
  fixture.ownerOperatorId = ownerRow.id;
  fixture.staffOperatorId = staffRow.id;
  // --- customer workspace -------------------------------------------------
  const [ws] = await db
    .insert(workspace)
    .values({
      userId: customerId,
      name: "Studio IT Workspace",
      slug: unique("ws"),
    })
    .returning({ id: workspace.id });
  fixture.workspaceId = ws.id;

  const [brand] = await db
    .insert(brandProfile)
    .values({ workspaceId: ws.id, name: "IT Brand", industry: "Testing" })
    .returning({ id: brandProfile.id });
  const [artist] = await db
    .insert(artistProfile)
    .values({ workspaceId: ws.id, name: "IT Artist", genre: "Post-rock" })
    .returning({ id: artistProfile.id });

  // --- requests: one nobody started, one with a project -------------------
  const [freshReq] = await db
    .insert(request)
    .values({
      workspaceId: ws.id,
      contextType: "brand",
      brandProfileId: brand.id,
      artistProfileId: null,
      title: "Unstarted request",
      category: "social_content",
      status: "submitted",
    })
    .returning({ id: request.id });
  fixture.unstartedRequestId = freshReq.id;

  const [startedReq] = await db
    .insert(request)
    .values({
      workspaceId: ws.id,
      contextType: "artist",
      brandProfileId: null,
      artistProfileId: artist.id,
      title: "Started request",
      category: "cover_artwork",
      status: "accepted",
    })
    .returning({ id: request.id });
  fixture.startedRequestId = startedReq.id;

  const [proj] = await db
    .insert(project)
    .values({
      workspaceId: ws.id,
      contextType: "artist",
      brandProfileId: null,
      artistProfileId: artist.id,
      requestId: startedReq.id,
      name: "IT Release Project",
      status: "in_review",
    })
    .returning({ id: project.id });
  fixture.projectId = proj.id;

  // --- jobs: one with the customer, one approved --------------------------
  const [pendingJob] = await db
    .insert(productionJob)
    .values({
      workspaceId: ws.id,
      projectId: proj.id,
      contextType: "artist",
      brandProfileId: null,
      artistProfileId: artist.id,
      requestId: startedReq.id,
      title: "Job with the customer",
      productionType: "design",
      status: "customer_review",
      priority: 50,
    })
    .returning({ id: productionJob.id });
  fixture.pendingJobId = pendingJob.id;

  const [approvedJob] = await db
    .insert(productionJob)
    .values({
      workspaceId: ws.id,
      projectId: proj.id,
      contextType: "artist",
      brandProfileId: null,
      artistProfileId: artist.id,
      requestId: startedReq.id,
      title: "Approved job",
      productionType: "design",
      status: "approved",
      priority: 50,
    })
    .returning({ id: productionJob.id });

  // --- deliverables, versions, files, reviews -----------------------------
  const [pendingDel] = await db
    .insert(deliverable)
    .values({
      workspaceId: ws.id,
      projectId: proj.id,
      jobId: pendingJob.id,
      name: "Cover artwork",
      type: "cover_artwork",
      status: "customer_review",
      currentVersion: 1,
    })
    .returning({ id: deliverable.id });
  fixture.pendingDeliverableId = pendingDel.id;

  const [workingAsset] = await db
    .insert(asset)
    .values({
      workspaceId: ws.id,
      projectId: proj.id,
      jobId: pendingJob.id,
      deliverableId: pendingDel.id,
      category: "source",
      filename: "working-file.psd",
      customerVisible: false,
      sizeBytes: 2048,
      mimeType: "image/vnd.photoshop",
      storageKey: null,
      storageProvider: "local",
      version: 1,
    })
    .returning({ id: asset.id });
  fixture.storedAssetId = workingAsset.id;

  await db.insert(deliverableVersion).values({
    workspaceId: ws.id,
    deliverableId: pendingDel.id,
    version: 1,
    assetId: workingAsset.id,
    isCurrent: true,
    note: "First pass",
  });

  // One pending review: the unique partial index allows exactly one.
  await db.insert(review).values({
    workspaceId: ws.id,
    contextType: "artist",
    deliverableId: pendingDel.id,
    version: 1,
    status: "pending",
    action: null,
    feedback: null,
  });
  const [approvedDel] = await db
    .insert(deliverable)
    .values({
      workspaceId: ws.id,
      projectId: proj.id,
      jobId: approvedJob.id,
      name: "Delivered artwork",
      type: "cover_artwork",
      status: "approved",
      currentVersion: 1,
    })
    .returning({ id: deliverable.id });
  fixture.approvedDeliverableId = approvedDel.id;

  const [finalAsset] = await db
    .insert(asset)
    .values({
      workspaceId: ws.id,
      projectId: proj.id,
      jobId: approvedJob.id,
      deliverableId: approvedDel.id,
      category: "delivered",
      filename: "final-artwork.png",
      customerVisible: true,
      sizeBytes: 5 * 1024 * 1024,
      mimeType: "image/png",
      storageKey: "local/it/final-artwork.png",
      storageProvider: "local",
      version: 1,
    })
    .returning({ id: asset.id });

  await db.insert(deliverableVersion).values({
    workspaceId: ws.id,
    deliverableId: approvedDel.id,
    version: 1,
    assetId: finalAsset.id,
    isCurrent: true,
    note: null,
  });

  await db.insert(review).values({
    workspaceId: ws.id,
    contextType: "artist",
    deliverableId: approvedDel.id,
    version: 1,
    status: "approved",
    action: "approve",
    feedback: null,
    reviewedBy: customerId,
  });

  const [delivered] = await db
    .insert(delivery)
    .values({
      workspaceId: ws.id,
      contextType: "artist",
      projectId: proj.id,
      jobId: approvedJob.id,
      deliverableId: approvedDel.id,
      version: 1,
      assetId: finalAsset.id,
      deliveredByOperatorId: fixture.ownerOperatorId,
    })
    .returning({ id: delivery.id });
  fixture.deliveryId = delivered.id;
});

/**
 * Remove every row this file created.
 *
 * The three fixture users own everything else, and every table below them is
 * referenced with `onDelete: cascade`, so deleting the users removes the whole
 * fixture in one pass and leaves the database as it was found.
 */
after(async () => {
  const db = getDb();
  const ids = fixture.userIds.filter(Boolean);
  if (!ids.length) return;
  await db.delete(user).where(inArray(user.id, ids));
});

/* ==========================================================================
 * Authorisation boundary (spec §19)
 * ========================================================================== */

test("a customer never resolves to operator access", async () => {
  assert.equal(await resolveOperator(fixture.customerId), null);
});

test("a revoked operator stops resolving immediately", async () => {
  const db = getDb();
  const [revokedUser] = await db
    .insert(user)
    .values({
      id: randomUUID(),
      name: "Studio IT Revoked",
      email: unique("revoked") + "@example.com",
    })
    .returning({ id: user.id });
  fixture.userIds.push(revokedUser.id);
  await db.insert(operator).values({
    userId: revokedUser.id,
    role: "operator",
    active: false,
  });

  assert.equal(await resolveOperator(revokedUser.id), null);
});

test("every Studio read refuses to run without verified access", async () => {
  await assert.rejects(
    listStudioCustomers(null as unknown as OperatorAccess),
    /verified operator/i,
  );
  await assert.rejects(
    getCommandCenter({} as OperatorAccess),
    /verified operator/i,
  );
  await assert.rejects(
    listStudioDeliveries(undefined as unknown as OperatorAccess),
    /verified operator/i,
  );
});

test("settings reads the operator resolved from the session, not from input", async () => {
  const owner = await getStudioOperator(fixture.owner);
  assert.ok(owner);
  assert.equal(owner.id, fixture.owner.operatorId);

  // An operator id that does not exist answers null rather than a fabricated
  // record — identity comes from the server-side resolution, never a request.
  assert.equal(await getStudioOperator({ ...fixture.staff, operatorId: randomUUID() }), null);
});

/* ==========================================================================
 * Malformed and unknown identifiers answer "not found" (spec §19.4 rule 4)
 * ========================================================================== */

test("malformed identifiers are a lookup miss, never a database error", async () => {
  const malformed = ["not-a-uuid", "1; drop table request", "", "00000000-0000-4000-8000-000000000000"];

  for (const value of malformed) {
    assert.equal(await getStudioCustomer(fixture.owner, value), null, `customer(${value})`);
    assert.equal(await getStudioRequest(fixture.owner, value), null, `request(${value})`);
    assert.equal(await getStudioProject(fixture.owner, value), null, `project(${value})`);
  }
});

test("a well-formed id that belongs to nobody is still not found", async () => {
  assert.equal(
    await getStudioRequest(fixture.owner, randomUUID()),
    null,
  );
  assert.equal(
    await getStudioProject(fixture.owner, randomUUID()),
    null,
  );
});

/* ==========================================================================
 * The Command Center reports real rows (spec §6)
 * ========================================================================== */

test("Command Center counts and lists match the fixture's actual state", async () => {
  const board = await getCommandCenter(fixture.owner);

  // The unstarted request is submitted, open, and has no project: counted.
  const inNewRequests = board.newRequests.some(
    (entry) => entry.id === fixture.unstartedRequestId,
  );
  assert.equal(inNewRequests, true, "unstarted request should be listed");
  assert.ok(board.counts.newRequests >= 1);

  // The started request must NOT appear among unstarted requests.
  const startedListed = board.newRequests.some(
    (entry) => entry.id === fixture.startedRequestId,
  );
  assert.equal(startedListed, false, "a request with a project is not unstarted");

  // Jobs in fixture states are counted from real rows.
  assert.ok(board.counts.awaitingCustomer >= 1, "customer_review job not counted");
  assert.ok(board.counts.awaitingDelivery >= 1, "approved job not counted");

  // The job with the customer, in attention order, links to its real ids.
  const attention = board.attention.find((entry) => entry.id === fixture.pendingJobId);
  assert.ok(attention, "pending job missing from attention");
  assert.equal(attention.projectId, fixture.projectId);

  // Recent deliveries show the fixture delivery with the real file name.
  const recent = board.recentDeliveries.find((entry) => entry.id === fixture.deliveryId);
  assert.ok(recent, "fixture delivery missing from recent deliveries");
  assert.equal(recent.filename, "final-artwork.png");
  assert.equal(recent.version, 1);
});

/* ==========================================================================
 * Requests: intake truth and what was started from each (spec §10)
 * ========================================================================== */

test("the request list reports exactly what each request became", async () => {
  const requests = await listStudioRequests(fixture.owner, { limit: 200 });

  const fresh = requests.find((entry) => entry.id === fixture.unstartedRequestId);
  assert.ok(fresh, "unstarted request missing");
  assert.equal(fresh.projectId, null);
  assert.equal(fresh.jobId, null);

  const started = requests.find((entry) => entry.id === fixture.startedRequestId);
  assert.ok(started, "started request missing");
  assert.equal(started.projectId, fixture.projectId);
  assert.ok(started.jobId, "request detail should surface the job it created");

  // The unstarted-only filter is a real predicate, not client-side slicing.
  const unstarted = await listStudioRequests(fixture.owner, {
    unstartedOnly: true,
    limit: 200,
  });
  assert.ok(unstarted.every((entry) => entry.projectId === null));
  assert.ok(unstarted.some((entry) => entry.id === fixture.unstartedRequestId));
  assert.ok(!unstarted.some((entry) => entry.id === fixture.startedRequestId));

  const counts = await countStudioRequestsByStatus(fixture.owner);
  assert.ok(counts.submitted >= 1);
  assert.ok(counts.accepted >= 1);
});

test("request detail shows the project, job, deliverables and files it led to", async () => {
  const detail = await getStudioRequest(fixture.owner, fixture.startedRequestId);
  assert.ok(detail);
  assert.ok(detail.project, "project missing from request detail");
  assert.equal(detail.project.id, fixture.projectId);
  assert.ok(detail.jobs.length >= 2, "both jobs should be listed");
  assert.ok(
    detail.deliverables.some((entry) => entry.id === fixture.pendingDeliverableId),
    "pending deliverable missing",
  );
  assert.ok(
    detail.files.some((entry) => entry.filename === "final-artwork.png"),
    "delivered file missing",
  );

  const unstarted = await getStudioRequest(fixture.owner, fixture.unstartedRequestId);
  assert.ok(unstarted);
  assert.equal(unstarted.project, null);
  assert.equal(unstarted.jobs.length, 0);
});

/* ==========================================================================
 * Projects: one project, two views (spec §11, §12)
 * ========================================================================== */

test("the project list reports volume from real child rows", async () => {
  const projects = await listStudioProjects(fixture.owner, { limit: 200 });
  const row = projects.find((entry) => entry.id === fixture.projectId);
  assert.ok(row, "fixture project missing");
  assert.equal(row.jobs, 2, "job count must come from the production_job rows");
  assert.equal(row.deliverables, 2, "deliverable count must come from real rows");
  assert.equal(row.deliveries, 1, "delivery count must come from real rows");
  assert.equal(row.workspaceId, fixture.workspaceId);
  assert.equal(row.contextType, "artist");
  assert.ok(row.profileName, "artist profile name should join through");

  const counts = await countStudioProjectsByStatus(fixture.owner);
  const inReview = counts.find((entry) => entry.status === "in_review");
  assert.ok(inReview && inReview.value >= 1);
});

test("project detail rebuilds the whole chain from Phase 3 reads", async () => {
  const detail = await getStudioProject(fixture.owner, fixture.projectId);
  assert.ok(detail);
  assert.equal(detail.project.id, fixture.projectId);
  assert.equal(detail.request?.id, fixture.startedRequestId);
  assert.equal(detail.jobs.length, 2);

  const withCustomer = detail.jobs.find((entry) => entry.job.id === fixture.pendingJobId);
  assert.ok(withCustomer, "customer_review job missing from project detail");
  assert.equal(withCustomer.job.status, "customer_review");

  const cover = withCustomer.deliverables.find(
    (entry) => entry.deliverable.id === fixture.pendingDeliverableId,
  );
  assert.ok(cover, "deliverable missing from job detail");
  assert.equal(cover.versions.length, 1, "version history should show v1");
  assert.equal(cover.versions[0].isCurrent, true);
  assert.equal(cover.reviews.length, 1, "review history should show the pending review");
  assert.equal(cover.reviews[0].status, "pending");

  const approved = detail.jobs.find((entry) => entry.job.status === "approved");
  assert.ok(approved);
  assert.ok(approved.deliveries.length >= 1, "delivery should be visible on its job");
});

/* ==========================================================================
 * Review board: three columns, real decisions (spec §14)
 * ========================================================================== */

test("the review board reflects the actual state of every column", async () => {
  const board = await getStudioReviewBoard(fixture.owner);

  const withCustomer = board.awaitingCustomer.find(
    (entry) => entry.deliverableId === fixture.pendingDeliverableId,
  );
  assert.ok(withCustomer, "pending deliverable should be with the customer");
  assert.equal(withCustomer.jobStatus, "customer_review");
  assert.equal(withCustomer.reviewStatus, "pending");
  assert.equal(withCustomer.delivered, false);

  const approved = board.awaitingDelivery.find(
    (entry) => entry.deliverableId === fixture.approvedDeliverableId,
  );
  assert.ok(approved, "approved deliverable should await delivery");
  assert.equal(approved.delivered, true, "a delivered file must be reported as delivered");

  // History holds the decision the customer actually made, with their identity
  // resolved from the account table rather than a free-text field.
  const decision = board.history.find(
    (entry) => entry.deliverableId === fixture.approvedDeliverableId,
  );
  assert.ok(decision, "approved decision missing from history");
  assert.equal(decision.status, "approved");
  assert.equal(decision.version, 1);
  assert.equal(decision.reviewerName, "Studio IT Customer");
  assert.equal(decision.workspaceSlug.includes("studio-it-ws"), true);
});

/* ==========================================================================
 * Deliveries and the internal file view (spec §15, §16)
 * ========================================================================== */

test("deliveries show the exact file handed over, and who handed it", async () => {
  const deliveries = await listStudioDeliveries(fixture.owner, {
    workspaceId: fixture.workspaceId,
  });
  const row = deliveries.find((entry) => entry.id === fixture.deliveryId);
  assert.ok(row, "fixture delivery missing");
  assert.equal(row.filename, "final-artwork.png");
  assert.equal(row.mimeType, "image/png");
  assert.equal(row.sizeBytes, 5 * 1024 * 1024);
  assert.equal(row.stored, true, "storageKey was set: the bytes are stored");
  assert.equal(row.deliveredBy, "IT Owner");
  assert.equal(row.deliverableName, "Delivered artwork");
  assert.equal(row.projectName, "IT Release Project");
});

test("the file view reports visibility and currentness instead of deciding them", async () => {
  const files = await listStudioFiles(fixture.owner, { workspaceId: fixture.workspaceId });
  assert.equal(files.length, 2, "both fixture files should be listed");

  const working = files.find((entry) => entry.filename === "working-file.psd");
  assert.ok(working);
  assert.equal(working.customerVisible, false, "a source file is not visible to the customer");
  assert.equal(working.isCurrent, true);
  assert.equal(working.delivered, false, "nothing was delivered from that deliverable");
  assert.equal(working.stored, false, "no storageKey means the bytes are not stored");

  const final = files.find((entry) => entry.filename === "final-artwork.png");
  assert.ok(final);
  assert.equal(final.customerVisible, true);
  assert.equal(final.delivered, true);
  assert.equal(final.stored, true);
  assert.equal(final.projectName, "IT Release Project");
});

/* ==========================================================================
 * Settings: the smallest screen, and the owner-only roster (spec §17, §19.3)
 * ========================================================================== */

test("settings reports this environment honestly", async () => {
  const summary = await getStudioPlatformSummary(fixture.owner);
  assert.ok(summary.workspaces >= 1, "the fixture workspace exists");
  assert.ok(summary.operators >= 2, "owner and staff operators exist");
});

test("the operator roster is owner-only and carries no credentials", async () => {
  const asOwner = await listOperatorRoster(fixture.owner);
  assert.ok(asOwner.length >= 2, "owner sees the roster");
  assert.ok(asOwner.some((entry) => entry.userId === fixture.owner.userId));
  for (const entry of asOwner) {
    const keys = Object.keys(entry);
    assert.ok(!keys.includes("password"), "roster must not carry credentials");
    assert.ok(!keys.includes("token"), "roster must not carry tokens");
  }

  const asStaff = await listOperatorRoster(fixture.staff);
  assert.deepEqual(asStaff, [], "a plain operator sees no roster at all");
});

/* ==========================================================================
 * Credential isolation (spec §16, §19.4)
 * ========================================================================== */

test("no Studio screen loads credentials for anybody", async () => {
  const customers = await listStudioCustomers(fixture.owner);
  const row = customers.find((entry) => entry.workspaceId === fixture.workspaceId);
  assert.ok(row, "fixture workspace should be listed");

  const serialized = JSON.stringify(customers);
  assert.ok(!serialized.includes(SECRET_PASSWORD), "password hash leaked into the list");

  const detail = await getStudioCustomer(fixture.owner, fixture.workspaceId);
  assert.ok(detail);
  assert.ok(!JSON.stringify(detail).includes(SECRET_PASSWORD), "password hash leaked into detail");
  assert.deepEqual(Object.keys(detail.owner).sort(), ["email", "name"]);
  assert.equal(detail.owner.email.includes("studio-it-customer"), true);
});

/* ==========================================================================
 * Both operators see the same internal reality (spec §9)
 * ========================================================================== */

test("owner and staff operators see identical customer data", async () => {
  const [asOwner, asStaff] = await Promise.all([
    listStudioCustomers(fixture.owner),
    listStudioCustomers(fixture.staff),
  ]);
  assert.equal(asOwner.length, asStaff.length);
  assert.deepEqual(
    asOwner.map((entry) => entry.workspaceId).sort(),
    asStaff.map((entry) => entry.workspaceId).sort(),
  );
});
