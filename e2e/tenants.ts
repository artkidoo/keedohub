/**
 * Two-customer isolation harness — Phase 5.3B (part 1: types + storage).
 *
 * Provisions REAL customer tenants through the real /signup form, then seeds
 * a representative customer-visible chain per tenant so cross-tenant probes
 * use genuine identifiers. Seeding uses SQL; every access attempt goes
 * through the real browser session and real routes. Nothing here weakens the
 * app. This file never imports or edits fixtures.ts / auth.ts.
 */

import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";

export const E2E_ISOLATION_DOMAIN = "e2e.p53b.invalid";
export const E2E_PASSWORD = "e2e-test-password-not-a-secret";

/** Resolve the database URL lazily (after .env is loaded), never at import. */
function resolveDbUrl(): string {
  if (!process.env.E2E_DATABASE_URL && !process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env");
    } catch {
      // fall through to the localhost default below
    }
  }
  return (
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres@127.0.0.1:5432/keedohub"
  );
}

/** Marker bytes per tenant; distinct so any leak is attributable. */
export const tenantMarker = (label: string) =>
  `keedohub-isolation-fixture tenant=${label} DO-NOT-TOUCH`;

export type ProvisionedTenant = {
  label: string;
  email: string;
  userId: string;
  workspaceId: string;
  workspaceSlug: string;
  requestId: string;
  requestTitle: string;
  projectId: string;
  projectName: string;
  jobId: string;
  deliverableId: string;
  deliverableName: string;
  assetId: string;
  assetFilename: string;
  notificationId: string;
  notificationTitle: string;
  storageKey: string;
};

export const tenants: ProvisionedTenant[] = [];

/** Workspace slugs ever provisioned — survives cleanupTenants for the proof. */
const knownSlugs: string[] = [];
export const provisionedSlugs = (): string[] => [...knownSlugs];

export function isoSql() {
  return postgres(resolveDbUrl(), { max: 1, onnotice: () => {} });
}

/** Absolute local storage root the dev server reads (same .env value). */
export function storageBaseDir(): string {
  loadRepoEnvOnce();
  const base = process.env.STORAGE_LOCAL_BASE_DIR;
  if (!base) {
    throw new Error(
      "STORAGE_LOCAL_BASE_DIR is not set: storage probes cannot run safely.",
    );
  }
  return base;
}

/**
 * Load the repo .env into the CURRENT process only (Playwright workers do
 * not inherit next dev's environment). Called solely by provisionTenant —
 * the one code path that WRITES fixture bytes. All readers reuse the stored
 * key, so the value never leaks into assertions.
 */
function loadRepoEnvOnce(): void {
  if (process.env.STORAGE_LOCAL_BASE_DIR) return;
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env: storageBaseDir() throws the honest error below.
  }
}

/** Copy shown by AuthForm when sign-up is refused for any reason. */
const SIGNUP_REFUSED = "We could not create your account";

/**
 * Real signup, throttle-tolerant: Better Auth allows 3 sign-ups per 10s per
 * IP, so a refusal waits out the window and retries the SAME email. The
 * limiter itself is never weakened or bypassed.
 */
async function signUpReal(page: Page, label: string): Promise<string> {
  const email = `p53b-${label}-${Date.now().toString(36)}@${E2E_ISOLATION_DOMAIN}`;
  const formAlert = page.locator("form").getByRole("alert");
  for (let attempt = 1; attempt <= 6; attempt++) {
    await page.goto("/signup");
    await page.getByLabel("Name").fill(`E2E ISO ${label}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    // Sign-up requires an explicit account type; these fixtures are Brand
    // tenants, so the form must be completed exactly as a customer would.
    await page.getByRole("radio", { name: /Brand \/ business/ }).check();
    await page.getByRole("button", { name: "Create workspace" }).click();
    const reached = await page
      .waitForURL(/\/workspace(\/|\?|$)/, { timeout: 40_000 })
      .then(() => true)
      .catch(() => false);
    if (reached) return email;
    const refused = await formAlert
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!refused) {
      throw new Error(`signup ${email} neither landed nor reported (try ${attempt}).`);
    }
    const message = (await formAlert.textContent()) ?? "";
    if (!message.includes(SIGNUP_REFUSED)) {
      throw new Error(`signup refused for ${email}: "${message}"`);
    }
    if (attempt === 6) throw new Error(`signup refused 6 times for ${email}`);
    await page.waitForTimeout(11_000);
  }
  throw new Error("unreachable");
}
/** Raw row snapshot helpers for the no-side-effect assertions. */
export async function tenantDbState(tenant: ProvisionedTenant) {
  const db = isoSql();
  try {
    const [reviewRow] = await db`
      select status, action from review
      where workspace_id = ${tenant.workspaceId} and deliverable_id = ${tenant.deliverableId}`;
    const [delivRow] = await db`
      select status, current_version from deliverable where id = ${tenant.deliverableId}`;
    const [assetRow] = await db`
      select id, filename from asset where id = ${tenant.assetId}`;
    const [reqRow] = await db`
      select id from request
      where workspace_id = ${tenant.workspaceId} and title = ${tenant.requestTitle}`;
    const [userRow] = await db`select id from "user" where email = ${tenant.email}`;
    return { reviewRow, delivRow, assetRow, reqRow, userRow };
  } finally {
    await db.end();
  }
}

/** Bytes currently on disk for a tenant's fixture file. */
export async function tenantFileBytes(tenant: ProvisionedTenant): Promise<string> {
  const fs = await import("node:fs/promises");
  return fs.readFile(`${storageBaseDir()}/${tenant.storageKey}`, "utf8");
}
/**
 * Remove every provisioned tenant: user rows (cascades remove workspace,
 * profiles, chain rows, notifications) plus the storage directories.
 * Idempotent; safe to call twice or when nothing was provisioned.
 */
export async function cleanupTenants(): Promise<void> {
  const fs = await import("node:fs/promises");
  const db = isoSql();
  try {
    for (const tenant of tenants) {
      await db`delete from "user" where email = ${tenant.email}`;
      await fs.rm(`${storageBaseDir()}/${tenant.workspaceSlug}`, {
        recursive: true,
        force: true,
      });
    }
    await db`delete from "user" where email like ${`%@${E2E_ISOLATION_DOMAIN}`}`;
  } finally {
    tenants.length = 0;
    await db.end();
  }
}

/** Zero-leftover proof the spec asserts on: no rows, no fixture dirs. */
export async function isolationLeftovers(): Promise<{ users: number; orphans: string[] }> {
  const fs = await import("node:fs/promises");
  const db = isoSql();
  try {
    const [row] = await db`
      select count(*)::int as c from "user" where email like ${`%@${E2E_ISOLATION_DOMAIN}`}`;
    const orphans: string[] = [];
    for (const slug of provisionedSlugs()) {
      try {
        await fs.stat(`${storageBaseDir()}/${slug}`);
        orphans.push(slug);
      } catch {
        // absent: exactly what cleanup must achieve.
      }
    }
    return { users: row?.c ?? -1, orphans };
  } finally {
    await db.end();
  }
}

/**
 * Sign up a real customer on `page` (no prior session), then seed a full
 * customer-visible chain for them. The page keeps their live session after.
 */
export async function provisionTenant(
  page: Page,
  label: string,
): Promise<ProvisionedTenant> {
  const email = await signUpReal(page, label);
  await expect(page).toHaveURL(/\/workspace(\/|\?|$)/, { timeout: 30_000 });
  loadRepoEnvOnce();
  const db = isoSql();
  try {
    const [user] = await db`select id from "user" where email = ${email}`;
    if (!user?.id) throw new Error(`signup created no user row for ${email}`);
    const [ws] = await db`select id, slug from workspace where user_id = ${user.id}`;
    if (!ws) throw new Error(`signup provisioned no workspace for ${email}`);
    const [brand] = await db`select id from brand_profile where workspace_id = ${ws.id}`;
    if (!brand) throw new Error(`signup provisioned no brand profile for ${email}`);
    const stamp = Date.now().toString(36);
    const requestTitle = `ISO ${label} request ${stamp}`;
    const projectName = `ISO ${label} project ${stamp}`;
    const deliverableName = `ISO ${label} work ${stamp}`;
    const assetFilename = `iso-${label}-${stamp}.txt`;
    const notificationTitle = `ISO ${label} update ${stamp}`;
    const [req] = await db`
      insert into request (workspace_id, context_type, brand_profile_id, title, category, description, status)
      values (${ws.id}, 'brand', ${brand.id}, ${requestTitle}, 'document', ${`Isolation fixture request for tenant ${label}.`}, 'accepted')
      returning id`;
    const [proj] = await db`
      insert into project (workspace_id, context_type, brand_profile_id, request_id, name, status)
      values (${ws.id}, 'brand', ${brand.id}, ${req.id}, ${projectName}, 'in_review')
      returning id`;
    const [job] = await db`
      insert into production_job (workspace_id, project_id, context_type, brand_profile_id, request_id, title, production_type, status, priority)
      values (${ws.id}, ${proj.id}, 'brand', ${brand.id}, ${req.id}, ${`ISO ${label} job`}, 'document', 'customer_review', 50)
      returning id`;
    const [deliv] = await db`
      insert into deliverable (workspace_id, project_id, job_id, name, type, status, current_version)
      values (${ws.id}, ${proj.id}, ${job.id}, ${deliverableName}, 'document', 'customer_review', 1)
      returning id`;
    const [assetRow] = await db`
      insert into asset (workspace_id, brand_profile_id, project_id, job_id, deliverable_id, category, filename, mime_type, size_bytes, storage_provider, version, customer_visible)
      values (${ws.id}, ${brand.id}, ${proj.id}, ${job.id}, ${deliv.id}, 'delivered', ${assetFilename}, 'text/plain', 64, 'local', 1, true)
      returning id`;
    const storageKey = `${ws.slug}/assets/${deliv.id}/${assetRow.id}`;
    await db`update asset set storage_key = ${storageKey} where id = ${assetRow.id}`;
    await db`
      insert into deliverable_version (workspace_id, deliverable_id, version, asset_id, is_current)
      values (${ws.id}, ${deliv.id}, 1, ${assetRow.id}, true)`;
    await db`
      insert into review (workspace_id, context_type, deliverable_id, version, status)
      values (${ws.id}, 'brand', ${deliv.id}, 1, 'pending')`;
    const [notif] = await db`
      insert into notification (user_id, workspace_id, context_type, type, title, message, href)
      values (${user.id}, ${ws.id}, 'brand', 'request_received', ${notificationTitle}, ${`Isolation fixture update for tenant ${label}.`}, ${`/workspace/brand/requests/${req.id}`})
      returning id`;
    mkdirSync(`${storageBaseDir()}/${ws.slug}/assets/${deliv.id}`, { recursive: true });
    writeFileSync(`${storageBaseDir()}/${storageKey}`, tenantMarker(label), "utf8");
    const tenant: ProvisionedTenant = {
      label, email, userId: user.id, workspaceId: ws.id, workspaceSlug: ws.slug,
      requestId: req.id, requestTitle, projectId: proj.id, projectName,
      jobId: job.id, deliverableId: deliv.id, deliverableName,
      assetId: assetRow.id, assetFilename, notificationId: notif.id,
      notificationTitle, storageKey,
    };
    tenants.push(tenant);
    knownSlugs.push(tenant.workspaceSlug);
    return tenant;
  } finally {
    await db.end();
  }
}

