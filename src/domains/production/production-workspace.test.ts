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

import { inArray, sql } from "drizzle-orm";

import { resolveOperator, type OperatorAccess } from "./access";
import { getProductionContext } from "./customer-context";
import { listProductionQueue } from "./queue";
import { getDb } from "@/lib/db";
import {
  artistProfile,
  brandProfile,
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
  brandProfileId: string;
  artistProfileId: string;
  brandJobId: string;
  artistJobId: string;
  workspaceId: string;
  operatorDisplayName: string;
};

const fixture: Fixture = {
  access: null as unknown as OperatorAccess,
  userIds: [],
  brandProfileId: "",
  artistProfileId: "",
  brandJobId: "",
  artistJobId: "",
  workspaceId: "",
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

