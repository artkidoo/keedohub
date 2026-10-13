/**
 * Sign-out regression — customer-experience upgrade.
 *
 * Sign-out was silently dead: Base UI's `Menu.Item` exposes `onClick`, not
 * `onSelect`, so the handler in SignOutMenuItem was never invoked. The item
 * looked wired up, did nothing on click, and left `better-auth.session_token`
 * valid — a signed-out visitor could still open the workspace, including via
 * the browser's back button.
 *
 * These tests drive the real form and the real control, then assert the things
 * that actually define "signed out":
 *   1. the sign-out request reaches Better Auth,
 *   2. the session cookie is gone from the browser,
 *   3. protected pages are no longer reachable,
 *   4. both the desktop menu and the mobile panel offer a working control.
 *
 * No cookie is cleared by the test to fake a sign-out — the only thing that may
 * clear the session is the app's own supported flow.
 */

import { expect, test } from "@playwright/test";

import { signUpWithRetry } from "./auth";
import { cleanupE2eUsers } from "./fixtures";

test.afterAll(async () => {
  await cleanupE2eUsers();
});

test.describe("signing out", () => {
  test("the desktop menu item revokes the session and clears the cookie", async ({
    page,
  }) => {
    await signUpWithRetry(page, "signout-desktop", "artist");
    await expect(page).toHaveURL(/\/workspace\/artist/);

    // The session cookie exists before sign-out — otherwise this test would
    // pass vacuously on a visitor who was never signed in.
    const before = await page.context().cookies();
    expect(
      before.some((c) => c.name.includes("session_token")),
      "expected an authenticated session before signing out",
    ).toBe(true);

    // Watch for the request that actually revokes the session.
    const signOutRequest = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().includes("/api/auth/sign-out"),
    );
    const signOutResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/sign-out") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Workspace menu" }).click();
    const item = page.getByRole("menuitem", { name: /Sign out/ });
    await expect(item).toBeVisible();
    await item.click();

    // The click must produce a real sign-out call, not a silent no-op.
    await signOutRequest;
    expect((await signOutResponse).status()).toBe(200);

    // The visitor is returned to the public site.
    await expect(page).toHaveURL("/", { timeout: 15_000 });

    // The cookie is genuinely gone, not merely ignored by the current page.
    await expect
      .poll(
        async () =>
          (await page.context().cookies()).filter((c) =>
            c.name.includes("session_token"),
          ).length,
        { timeout: 10_000 },
      )
      .toBe(0);

    // And the protected page is now unreachable with that same session.
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a signed-out visitor cannot reopen the workspace by going back", async ({
    page,
  }) => {
    await signUpWithRetry(page, "signout-back", "brand");
    await expect(page).toHaveURL(/\/workspace\/brand/);

    await page.getByRole("button", { name: "Workspace menu" }).click();
    await page.getByRole("menuitem", { name: /Sign out/ }).click();
    await expect(page).toHaveURL("/", { timeout: 15_000 });

    // Sign-out uses replace(), so the workspace is no longer in the history
    // stack — going back lands on a public screen, never the workspace.
    await page.goBack();
    await expect(page).not.toHaveURL(/\/workspace/);

    // Re-entering the workspace by URL is refused by the server: with no
    // session left, the request is redirected to sign-in.
    await page.goto("/workspace/brand");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Brand workspace");
  });

  test("the mobile panel offers a working sign-out control", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpWithRetry(page, "signout-mobile", "artist");
    await expect(page).toHaveURL(/\/workspace\/artist/);

    const signOutResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/sign-out") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Open navigation" }).click();
    const item = page.getByRole("button", { name: /Sign out/ });
    await expect(item).toBeVisible();
    await item.click();

    expect((await signOutResponse).status()).toBe(200);
    await expect(page).toHaveURL("/", { timeout: 15_000 });

    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login/);
  });

  test("sign-out reports a failure instead of silently ignoring the click", async ({
    page,
  }) => {
    await signUpWithRetry(page, "signout-error", "artist");
    await expect(page).toHaveURL(/\/workspace\/artist/);

    // Simulate an unreachable auth endpoint: the visitor must be told the
    // sign-out failed, and must NOT be redirected as though it had succeeded.
    await page.route("**/api/auth/sign-out", (route) => route.abort());

    await page.getByRole("button", { name: "Workspace menu" }).click();
    await page.getByRole("menuitem", { name: /Sign out/ }).click();

    await expect(page.getByTestId("signout-error")).toContainText(
      "We could not sign you out",
    );

    // Still signed in, and the workspace still protected — no fake logout.
    await expect(page).toHaveURL(/\/workspace\/artist/);
    await page.unroute("**/api/auth/sign-out");
    await page.goto("/workspace/artist");
    await expect(page).toHaveURL(/\/workspace\/artist/);
  });
});
