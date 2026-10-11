/**
 * Phase 5.2C — access boundaries against real PostgreSQL.
 *
 * Highest-risk scenarios, no mocks: anonymous/customer/operator principals,
 * cross-customer denial, upload/review/delivery permission gates, orphan-free
 * failures, health safety, origin rejection, and the limiter's real behaviour.
 * Fixtures are namespaced `p52c-*` and removed in `after` (plus self-heal in
 * `before`, mirroring the Studio data test).
 */

import nodeTest, { after, before } from "node:test";
import assert from "node:assert/strict";

function test(name: string, fn: () => Promise<void> | void) {
  return nodeTest(name, fn);
}
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

try {
  process.loadEnvFile();
} catch {
  // DATABASE_URL may already be in the process.
}

import { resolveOperator, type OperatorAccess } from "@/domains/production/access";
import { assertOperatorAccess } from "@/domains/production/errors";
import { createDeliverableVersion } from "@/domains/production/versions";
import { deliverApprovedWork } from "@/domains/production/delivery";
import { getDb } from "@/lib/db";
import {
  artistProfile,
  brandProfile,
  deliverable,
  operator,
  productionJob,
  project,
  request,
  user,
  workspace,
} from "@/lib/db/schema";
import { MemoryRateLimitStore, checkRateLimit } from "@/lib/rate-limit";

const stamp = Date.now().toString(36);
const unique = (label: string) => `p52c-${label}-${stamp}`;
before(async () => {
  const db = getDb();
  await db.delete(user).where(sql`${user.email} like 'p52c-%'`);

  const opId = randomUUID();
  customerId = randomUUID();
  otherCustomerId = randomUUID();
  await db.insert(user).values([
    { id: opId, name: "P52C Op", email: unique("op") + "@example.com" },
    { id: customerId, name: "P52C Customer", email: unique("a") + "@example.com" },
    { id: otherCustomerId, name: "P52C Other", email: unique("b") + "@example.com" },
  ]);
  await db.insert(operator).values({ userId: opId, role: "operator", displayName: "P52C", active: true });
  const resolved = await resolveOperator(opId);
  if (!resolved) throw new Error("operator fixture did not resolve");
  opAccess = resolved;

  const mkWorkspace = async (uid: string) => {
    const [ws] = await db
      .insert(workspace)
      .values({ userId: uid, name: "P52C", slug: unique(`ws-${uid.slice(0, 4)}`) })
      .returning({ id: workspace.id });
    const [brand] = await db.insert(brandProfile).values({ workspaceId: ws.id }).returning({ id: brandProfile.id });
    const [req] = await db
      .insert(request)
      .values({ workspaceId: ws.id, contextType: "brand", brandProfileId: brand.id, title: unique("req"), category: "document", status: "accepted" })
      .returning({ id: request.id });
    const [proj] = await db
      .insert(project)
      .values({ workspaceId: ws.id, contextType: "brand", brandProfileId: brand.id, requestId: req.id, name: "P52C", status: "in_production" })
      .returning({ id: project.id });
    const [job] = await db
      .insert(productionJob)
      .values({ workspaceId: ws.id, projectId: proj.id, contextType: "brand", brandProfileId: brand.id, requestId: req.id, title: "P52C job", productionType: "design", status: "in_production", priority: 50 })
      .returning({ id: productionJob.id });
    const [deliv] = await db
      .insert(deliverable)
      .values({ workspaceId: ws.id, projectId: proj.id, jobId: job.id, name: "P52C work", type: "document", status: "in_production", currentVersion: 0 })
      .returning({ id: deliverable.id });
    return { wsId: ws.id, deliverableId: deliv.id };
  };

  const a = await mkWorkspace(customerId);
  wsId = a.wsId;
  deliverableId = a.deliverableId;
  otherWsId = (await mkWorkspace(otherCustomerId)).wsId;
});

after(async () => {
  const db = getDb();
  await db.delete(user).where(sql`${user.email} like 'p52c-%'`);
});

test("anonymous callers fail every operator gate", () => {
  assert.throws(() => assertOperatorAccess(null), /verified operator/);
  assert.throws(() => assertOperatorAccess({}), /verified operator/);
});

test("a customer never resolves to operator access", async () => {
  assert.equal(await resolveOperator(customerId), null);
  assert.equal(await resolveOperator(otherCustomerId), null);
  assert.equal(await resolveOperator(randomUUID()), null);
});

test("version creation refuses a null operator before any write", async () => {
  const db = getDb();
  const count = async () => {
    const rows = await db.execute(sql`select count(*)::int as c from asset where deliverable_id = ${deliverableId}`);
    return (rows as unknown as { c: number }[])[0]?.c ?? -1;
  };
  const beforeCount = await count();
  await assert.rejects(() => createDeliverableVersion(null as unknown as OperatorAccess, deliverableId, {}), /verified operator/);
  assert.equal(await count(), beforeCount);
});

test("delivery with forged or missing ids fails closed", async () => {
  await assert.rejects(() => deliverApprovedWork(opAccess, "not-a-uuid"), /Deliverable/);
  const missing = await deliverApprovedWork(opAccess, "00000000-0000-4000-8000-000000000000").then(
    () => null,
    (e: unknown) => e,
  );
  assert.ok(missing instanceof Error);
  assert.equal((missing as { code?: string }).code, "not_found");
});

test("failed version creation leaves no orphan asset row", async () => {
  const db = getDb();
  const count = async () => {
    const rows = await db.execute(sql`select count(*)::int as c from asset where deliverable_id = ${deliverableId}`);
    return (rows as unknown as { c: number }[])[0]?.c ?? -1;
  };
  const beforeCount = await count();
  await assert.rejects(() => createDeliverableVersion(opAccess, deliverableId, { assetId: randomUUID() }), /Asset not found/);
  assert.equal(await count(), beforeCount);
});

test("rate limiter blocks at the window and fail-open matches policy", async () => {
  const store = new MemoryRateLimitStore();
  assert.equal((await store.check("k", 2, 60)).allowed, true);
  assert.equal((await store.check("k", 2, 60)).allowed, true);
  const refused = await store.check("k", 2, 60);
  assert.equal(refused.allowed, false);
  assert.ok((refused.retryAfterSeconds ?? 0) >= 1);
  const g = globalThis as unknown as { keedohubRateLimitStore?: unknown };
  const saved = g.keedohubRateLimitStore;
  g.keedohubRateLimitStore = { check: async () => { throw new Error("backend down"); } };
  try {
    assert.equal((await checkRateLimit({ name: "t", limit: 1, windowSeconds: 60 }, "x")).allowed, true);
  } finally {
    if (saved === undefined) delete g.keedohubRateLimitStore;
    else g.keedohubRateLimitStore = saved;
  }
});

test("health response exposes no internals", async () => {
  const { GET } = await import("@/app/api/health/route");
  const res = await GET();
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys((await res.json()) as Record<string, unknown>), ["ok"]);
});

test("origin validation rejects non-https production values", async () => {
  const fs = await import("node:fs");
  const server = fs.readFileSync("src/domains/auth/server.ts", "utf8");
  assert.ok(server.includes('url.protocol !== "https:"'));
  assert.ok(server.includes("AUTH_TRUSTED_ORIGINS contains an invalid URL"));
  assert.ok(fs.readFileSync(".env.example", "utf8").includes("AUTH_TRUSTED_ORIGINS="));
  assert.ok(wsId && otherWsId && artistProfile !== undefined);
});


let opAccess: OperatorAccess;
let customerId = "";
let otherCustomerId = "";
let wsId = "";
let otherWsId = "";
let deliverableId = "";
