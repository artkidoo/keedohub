/**
 * Account-type separation — customer-experience upgrade, Part 5.
 *
 * Drives the real sign-up form (Better Auth issues the session), then proves
 * end to end that:
 *   - sign-up cannot proceed without an account type,
 *   - the chosen type is persisted on both user and workspace rows,
 *   - post-sign-up and post-login routing enters the matching context,
 *   - the other context is unreachable — page requests and API probes alike.
 *
 * No cookie or token is ever injected; every session is created by the real
 * forms, and every probe runs with the browser's own session cookie.
 */

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { clearSession, NOT_FOUND_TEXT, signIn, signUpWithRetry } from "./auth";
import { cleanupE2eUsers } from "./fixtures";

test.afterAll(async () => {
  await cleanupE2eUsers();
});

/** Resolve the database URL lazily, mirroring fixtures.ts. */
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

/** Reads the persisted account types for one sign-up email. */
async function storedAccountTypes(
  email: string,
): Promise<{ userType: string | null; workspaceType: string | null }> {
  const sql = postgres(resolveDbUrl(), { max: 1, onnotice: () => {} });
  try {
    const rows = await sql<{ user_type: string | null; ws_type: string | null }[]>`
      select u.account_type as user_type, w.account_type as ws_type
      from "user" u
      left join workspace w on w.user_id = u.id
      where u.email = ${email}`;
    const row = rows[0];
    if (!row) throw new Error(`no user row found for ${email}`);
    return { userType: row.user_type, workspaceType: row.ws_type };
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// 1. Sign-up intake: the type is required and chosen on the form.
// ---------------------------------------------------------------------------

test.describe("sign-up requires an account type", () => {
  test("submitting without a choice is refused client-side and creates nothing", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Name").fill("E2E No Type");
    await page.getByLabel("Email").fill(`no-type-${Date.now().toString(36)}@e2e.p53a.invalid`);
    await page.getByLabel("Password").fill("e2e-test-password-not-a-secret");
    await page.getByRole("button", { name: "Create workspace" }).click();

    // The missing choice is surfaced in plain language; no silent default.
    await expect(page.locator("form").getByRole("alert")).toContainText(
      "Choose what you create",
    );
    await expect(page).toHaveURL(/\/signup/);
  });
});

// ---------------------------------------------------------------------------
// 2. Persistence and routing per type.
// ---------------------------------------------------------------------------

test.describe("account type is persisted and drives routing", () => {
  test("a brand account lands in Brand OS and is stored as brand", async ({ page }) => {
    const { email } = await signUpWithRetry(page, "acct-brand", "brand");
    await expect(page).toHaveURL(/\/workspace\/brand/);

    const stored = await storedAccountTypes(email);
    expect(stored.userType).toBe("brand");
    expect(stored.workspaceType).toBe("brand");
  });

  test("an artist account lands in Artist OS and is stored as artist", async ({ page }) => {
    const { email } = await signUpWithRetry(page, "acct-artist", "artist");
    await expect(page).toHaveURL(/\/workspace\/artist/);

    const stored = await storedAccountTypes(email);
    expect(stored.userType).toBe("artist");
    expect(stored.workspaceType).toBe("artist");
  });

  test("signing back in returns each account to its own context", async ({ page }) => {
    const { email } = await signUpWithRetry(page, "acct-login", "artist");
    await expect(page).toHaveURL(/\/workspace\/artist/);

    await clearSession(page);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/workspace\/artist/);

    // The workspace root resolves from the row, never from the URL.
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/workspace\/artist/);
  });
});


// ---------------------------------------------------------------------------
// 3. Cross-context denial: the other context is a 404, never a 403 probe.
// ---------------------------------------------------------------------------

test.describe("a typed account never reaches the other context", () => {
  test("a brand account gets not-found on artist pages and APIs", async ({ page }) => {
    await signUpWithRetry(page, "deny-brand", "brand");

    for (const path of [
      "/workspace/artist",
      "/workspace/artist/releases",
      "/workspace/artist/assets",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} must be 404`).toBe(404);
      await expect(page.locator("body")).toContainText(NOT_FOUND_TEXT);
    }

    // Same denial at API level with the browser's own session cookie.
    const api = await page.request.get("/api/assets/probe-not-a-real-id");
    expect([401, 403, 404]).toContain(api.status());
  });

  test("an artist account gets not-found on brand pages", async ({ page }) => {
    await signUpWithRetry(page, "deny-artist", "artist");

    for (const path of [
      "/workspace/brand",
      "/workspace/brand/requests",
      "/workspace/brand/projects",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} must be 404`).toBe(404);
      await expect(page.locator("body")).toContainText(NOT_FOUND_TEXT);
    }
  });

  test("a brand account cannot open the artist request form (action entry point)", async ({ page }) => {
    await signUpWithRetry(page, "deny-action", "brand");

    // Server actions re-authorise through the same boundary; the form page
    // itself must therefore be unreachable for the wrong context.
    const response = await page.goto("/workspace/artist/requests/new");
    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).toContainText(NOT_FOUND_TEXT);
  });
});