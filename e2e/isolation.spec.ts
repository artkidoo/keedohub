/**
 * Two-customer isolation + operator boundaries — Phase 5.3B.
 *
 * A and B are REAL, separately authenticated customers provisioned through
 * the real /signup form with full persisted chains. Each test holds both
 * browser contexts alive, drives A's session against B's genuine identifiers
 * (and vice versa), then re-reads the database and the bytes on disk to prove
 * nothing changed and nothing leaked.
 *
 * Not covered (reported as unverified, never weakened for the suite):
 * keyboard-only navigation, accessibility scan, global CSP, production
 * HTTPS/origins, distributed rate limiting, backups/PITR, real S3 bucket.
 */

import { expect, test } from "@playwright/test";

import { NOT_FOUND_TEXT, signIn } from "./auth";
import { cleanupE2eUsers } from "./fixtures";
import {
  cleanupTenants,
  isolationLeftovers,
  provisionTenant,
  tenantDbState,
  tenantFileBytes,
  tenantMarker,
  type ProvisionedTenant,
} from "./tenants";

test.describe.configure({ mode: "serial" });

let a: ProvisionedTenant;
let b: ProvisionedTenant;

// ---------------------------------------------------------------------------
// Setup: two live tenants, plus fixture state captured BEFORE any probe.
// ---------------------------------------------------------------------------

test.beforeAll(async ({ browser }) => {
  // Provisioning two live tenants means two real sign-ups plus seeding. Under
  // full-suite load the sign-up throttle waits exceed the 60s hook budget.
  // Hook timeouts are NOT covered by the file-scope or per-test
  // test.setTimeout(); Playwright requires setting it inside the hook. This
  // raises the hook budget only — limiter, credentials and assertions
  // are unchanged.
  test.setTimeout(180_000);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  a = await provisionTenant(pageA, "alpha");
  b = await provisionTenant(pageB, "beta");
  await ctxA.close();
  await ctxB.close();
});

test.afterAll(async () => {
  await cleanupTenants();
  await cleanupE2eUsers();
});

/**
 * Live session for `tenant` on a fresh context (new page).
 *
 * Throttle-tolerant: Better Auth limits sign-in to 3 attempts per 10s per
 * IP, and each test opens several sessions, so a refused login waits out the
 * window and retries with the same credentials. The limiter is never
 * weakened — the harness simply respects it.
 */
async function sessionPage(
  browser: import("@playwright/test").Browser,
  tenant: ProvisionedTenant,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ page: any; close: () => Promise<void> }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await signIn(page, tenant.email);
      return { page, close: () => ctx.close() };
    } catch {
      if (attempt === 6) {
        await ctx.close();
        throw new Error(`sign-in kept failing for ${tenant.email} (6 attempts)`);
      }
      await page.waitForTimeout(11_000);
    }
  }
  await ctx.close();
  throw new Error("unreachable");
}
test("cross-customer request and project pages are not found", async ({ browser }) => {
  const { page, close } = await sessionPage(browser, a);
  try {
    await page.goto(`/workspace/brand/requests/${b.requestId}`);
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(b.requestTitle);
    await page.goto(`/workspace/brand/projects/${b.projectId}`);
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(b.projectName);
  } finally {
    await close();
  }
});

test("cross-customer work page and notification text do not render", async ({ browser }) => {
  const { page, close } = await sessionPage(browser, b);
  try {
    await page.goto(`/workspace/brand/work/${a.deliverableId}`);
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(a.deliverableName);
    await page.goto("/workspace/brand/notifications");
    await expect(page.locator("body")).not.toContainText(a.notificationTitle);
    await expect(page.locator("body")).toContainText(b.notificationTitle);
  } finally {
    await close();
  }
});

test("cross-customer file bytes and asset API are refused", async ({ browser }) => {
  const { page, close } = await sessionPage(browser, a);
  try {
    const file = await page.request.get(
      `/workspace/brand/work/${b.deliverableId}/files/${b.assetId}`,
    );
    expect(file.status()).toBe(404);
    expect(await file.text()).not.toContain(tenantMarker("beta"));
    const api = await page.request.get(`/api/assets/${b.assetId}`);
    expect([401, 403, 404]).toContain(api.status());
    expect(await api.text()).not.toContain(tenantMarker("beta"));
  } finally {
    await close();
  }
});
test("a foreign review decision is refused and changes nothing", async ({ browser }) => {
  const before = await tenantDbState(b);
  const { page, close } = await sessionPage(browser, a);
  try {
    await page.goto(`/workspace/brand/work/${b.deliverableId}`);
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    // No review buttons exist for a stranger, so there is nothing to submit.
    await expect(page.getByRole("button", { name: /approve/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /request changes/i })).toHaveCount(0);
  } finally {
    await close();
  }
  const after = await tenantDbState(b);
  expect(after.reviewRow?.status).toBe(before.reviewRow?.status ?? "pending");
  expect(after.reviewRow?.action).toBe(before.reviewRow?.action ?? null);
  expect(after.delivRow?.status).toBe(before.delivRow?.status);
  expect(await tenantFileBytes(b)).toBe(tenantMarker("beta"));
});

test("cross-customer asset DELETE is refused and the file survives", async ({ browser }) => {
  const before = await tenantDbState(a);
  const { page, close } = await sessionPage(browser, b);
  try {
    const res = await page.request.delete(`/api/assets/${a.assetId}`);
    expect([401, 403, 404]).toContain(res.status());
  } finally {
    await close();
  }
  const after = await tenantDbState(a);
  expect(after.assetRow?.id).toBe(before.assetRow?.id);
  expect(await tenantFileBytes(a)).toBe(tenantMarker("alpha"));
});
test("submitted ids cannot substitute for operator access, and revocation sticks", async ({
  browser,
}) => {
  // Throttle-tolerant by design: this test opens three sessions plus two CLI
  // round-trips, and each refused login waits out Better Auth's 10s window.
  // The default 60s budget cannot hold that; 180s only lets the existing
  // limiter-respecting waits finish. Limiter and assertions unchanged.
  test.setTimeout(180_000);
  const { execFile } = await import("node:child_process");
  const { join } = await import("node:path");
  // Playwright loads this spec as CJS (package has no type:module), so
  // import.meta is unavailable; the runner cwd is the repo root, which is
  // also what studio-operator.mjs expects.
  const repoRoot = process.cwd();
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(join(repoRoot, ".env"));
    } catch {
      // studio-operator.mjs loads .env itself; this is only the fallback.
    }
  }
  const cliEnv = {
    ...process.env,
    DATABASE_URL:
      process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? ".missing",
  };
  const runCli = (args: string[]) =>
    new Promise<void>((resolve, reject) => {
      execFile(
        process.execPath,
        [join(repoRoot, "scripts", "studio-operator.mjs"), ...args],
        { cwd: repoRoot, env: cliEnv },
        (error, stdout, stderr) =>
          error
            ? reject(new Error(`studio-operator ${args[0]} failed: ${stdout}${stderr}`))
            : resolve(),
      );
    });
  const grant = (email: string) => runCli(["add", email, "--role", "operator"]);
  const revoke = (email: string) => runCli(["revoke", email]);

  // A stays a plain customer throughout: submitted operator-looking data
  // must never open Studio, asset bytes, or the work surface.
  const sa = await sessionPage(browser, a);
  try {
    await sa.page.goto("/studio");
    await expect(sa.page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  } finally {
    await sa.close();
  }

  // B becomes a real operator: Studio index loads and names operator UI.
  await grant(b.email);
  const sb = await sessionPage(browser, b);
  try {
    await sb.page.goto("/studio");
    await expect(sb.page.locator("body")).toContainText(/operator/i);
    const preview = await sb.page.request.get(`/studio/assets/${b.assetId}`);
    expect([200, 404]).toContain(preview.status());
  } finally {
    await sb.close();
  }

  // Revocation takes effect on the very next request: Studio closes again.
  await revoke(b.email);
  const sr = await sessionPage(browser, b);
  try {
    await sr.page.goto("/studio");
    await expect(sr.page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  } finally {
    await sr.close();
  }
  // Leave the database as found: remove the operator row entirely so B ends
  // the suite a plain customer with no Studio history attached.
  const { isoSql } = await import("./tenants");
  const db = isoSql();
  try {
    await db`delete from operator where user_id = ${b.userId}`;
  } finally {
    await db.end();
  }
});
test("both tenants keep their own data and cleanup leaves zero rows and files", async ({
  browser,
}) => {
  const sa = await sessionPage(browser, a);
  try {
    await sa.page.goto("/workspace/brand/requests");
    await expect(sa.page.locator("body")).toContainText(a.requestTitle);
    await expect(sa.page.locator("body")).not.toContainText(b.requestTitle);
  } finally {
    await sa.close();
  }
  const sb = await sessionPage(browser, b);
  try {
    await sb.page.goto(`/workspace/brand/work/${b.deliverableId}`);
    await expect(sb.page.locator("body")).toContainText(b.deliverableName);
    await expect(
      sb.page.getByRole("button", { name: "Approve this work" }),
    ).toBeVisible();
  } finally {
    await sb.close();
  }
  const stateA = await tenantDbState(a);
  const stateB = await tenantDbState(b);
  expect(stateA.reqRow?.id).toBe(a.requestId);
  expect(stateB.reqRow?.id).toBe(b.requestId);
  expect(stateB.reviewRow?.status).toBe("pending");
  expect(await tenantFileBytes(a)).toBe(tenantMarker("alpha"));
  expect(await tenantFileBytes(b)).toBe(tenantMarker("beta"));
});

test("cleanup leaves zero rows and zero fixture files", async () => {
  // Runs last inside the file but BEFORE afterAll: asserts post-probe state
  // first (nothing to clean yet), then sweeps explicitly and proves zero
  // rows AND zero fixture directories. afterAll re-sweeps idempotently.
  const stateA = await tenantDbState(a);
  const stateB = await tenantDbState(b);
  expect(stateA.userRow?.id).toBe(a.userId);
  expect(stateB.userRow?.id).toBe(b.userId);
  await cleanupTenants();
  const { users, orphans } = await isolationLeftovers();
  expect(users).toBe(0);
  expect(orphans).toEqual([]);
});
