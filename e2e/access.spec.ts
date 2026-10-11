/**
 * Access-control browser journeys — Phase 5.3A.
 *
 * Every test drives the real application. Authentication happens through the
 * real signup/signin forms so Better Auth issues the session; no cookie or
 * token is ever injected by the test.
 */

import { expect, test } from "@playwright/test";

import {
  clearSession,
  NOT_FOUND_TEXT,
  signIn,
  signUpWithRetry,
} from "./auth";

// ---------------------------------------------------------------------------
// 1. Anonymous visitors are redirected away from protected workspace routes.
// ---------------------------------------------------------------------------

test.describe("anonymous access to the customer workspace", () => {
  const protectedPaths = [
    "/workspace",
    "/workspace/brand",
    "/workspace/brand/requests",
    "/workspace/artist",
    "/workspace/artist/releases",
    "/workspace/brand/projects",
  ];

  for (const path of protectedPaths) {
    test(`redirects ${path} to the login screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      // The original destination is preserved so login can return there.
      await expect(page).toHaveURL(/next=%2F/);
    });
  }

  test("does not leak workspace content to anonymous visitors", async ({ page }) => {
    await page.goto("/workspace/brand");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Anonymous visitors cannot enter the private Studio.
// ---------------------------------------------------------------------------

test.describe("anonymous access to the private Studio", () => {
  const studioPaths = [
    "/studio",
    "/studio/customers",
    "/studio/requests",
    "/studio/production",
    "/studio/review",
    "/studio/deliveries",
    "/studio/library",
  ];

  for (const path of studioPaths) {
    test(`${path} is not reachable anonymously`, async ({ page }) => {
      await page.goto(path);
      // Fail closed: bounced to login. Any other result is a defect.
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator("body")).not.toContainText("Operator");
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Login and logout work with a dedicated test account.
// ---------------------------------------------------------------------------

test.describe("login and logout", () => {
  test("signs up, drops the session and signs back in", async ({ page }) => {
    const { email } = await signUpWithRetry(page, "auth");

    await expect(page).toHaveURL(/\/workspace/);

    // Logging out is only the cookie going away — no server-side bypass.
    await clearSession(page);
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, email);
    await expect(page).toHaveURL(/\/workspace/);
  });

  test("rejects a wrong password without creating a session", async ({ page }) => {
    const { email } = await signUpWithRetry(page, "wrongpass");
    await clearSession(page);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("form").getByRole("alert")).toContainText("did not match");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// 5. A customer cannot access operator-only controls.
// ---------------------------------------------------------------------------

test.describe("customer cannot reach the operator-only surface", () => {
  test("Studio routes stay closed to a signed-in customer", async ({ page }) => {
    await signUpWithRetry(page, "no-operator");

    for (const path of ["/studio", "/studio/customers", "/studio/production", "/studio/review"]) {
      await page.goto(path);
      await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Operator");
    }
  });

  test("a customer sees no approve or deliver controls", async ({ page }) => {
    await signUpWithRetry(page, "no-approve");

    await page.goto("/workspace/brand");
    await expect(page.getByRole("button", { name: /approve/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /deliver/i })).toHaveCount(0);
  });

  test("operator-only asset API rejects a customer session", async ({ page }) => {
    await signUpWithRetry(page, "api-operator");

    const forged = "00000000-0000-4000-8000-000000000000";
    const res = await page.request.get(`/api/assets/${forged}`);
    expect([401, 403, 404]).toContain(res.status());
  });
});
