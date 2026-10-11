/**
 * Real login/signup helpers — Phase 5.3A.
 *
 * These drive the actual form and let Better Auth set the real session cookie.
 * They never construct or inject a session token themselves.
 */

import { expect, type Page } from "@playwright/test";

import { E2E_PASSWORD, e2eEmail } from "./fixtures";

/**
 * Drops the session cookie so the next /login visit renders the real form.
 *
 * This is not an auth bypass: it only removes the browser's own cookie. The
 * subsequent sign-in still goes through Better Auth's server routes and still
 * has to succeed before any protected page renders.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
}

/** Signs up through the real form and lands on the workspace home. */
export async function signUp(
  page: Page,
  label: string,
): Promise<{ email: string; password: string }> {
  const email = e2eEmail(label);
  const password = E2E_PASSWORD;

  await page.goto("/signup");
  await page.getByLabel("Name").fill(`E2E ${label}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL(/\/workspace(\/|\?|$)/, { timeout: 30_000 });
  return { email, password };
}

/** Signs in through the real form with an existing account. */
export async function signIn(page: Page, email: string): Promise<void> {
  // An authenticated visitor is bounced from /login to the workspace, so the
  // session must be dropped first for the form to exist.
  await clearSession(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/workspace(\/|\?|$)/, { timeout: 30_000 });
}

/** Text actually rendered by src/app/not-found.tsx. */
export const NOT_FOUND_TEXT = "We could not find that page";

/** Copy shown by AuthForm when sign-up is refused for any reason. */
const SIGNUP_REFUSED = "We could not create your account";

/**
 * Signs up, tolerating Better Auth's signup throttle.
 *
 * `rateLimit: { enabled: true }` in src/domains/auth/server.ts limits sign-up
 * to 3 attempts per 10 seconds — correct for production, but a suite that
 * creates an account per test hits it immediately. Rather than weakening the
 * limiter for tests, the harness waits out the window and retries with the
 * SAME email, so a throttled attempt never leaves a partial account behind.
 * A refusal that is not throttle-related is surfaced unchanged.
 */
export async function signUpWithRetry(
  page: Page,
  label: string,
  attempts = 6,
): Promise<{ email: string; password: string }> {
  const email = e2eEmail(label);
  const password = E2E_PASSWORD;
  const formAlert = page.locator("form").getByRole("alert");

  for (let attempt = 1; attempt <= attempts; attempt++) {
    await page.goto("/signup");
    await page.getByLabel("Name").fill(`E2E ${label}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create workspace" }).click();

    // Wait for whichever of the two outcomes appears first.
    const reachedWorkspace = await page
      .waitForURL(/\/workspace(\/|\?|$)/, { timeout: 40_000 })
      .then(() => true)
      .catch(() => false);

    if (reachedWorkspace) {
      return { email, password };
    }

    const refused = await formAlert
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!refused) {
      throw new Error(
        `sign-up for ${email} neither reached the workspace nor reported an error (attempt ${attempt}). Final URL: ${page.url()}`,
      );
    }

    const message = (await formAlert.textContent()) ?? "";

    if (!message.includes(SIGNUP_REFUSED)) {
      throw new Error(`sign-up refused for ${email} with unexpected message: "${message}"`);
    }

    if (attempt === attempts) {
      throw new Error(`sign-up refused ${attempts} times for ${email}`);
    }

    // Better Auth's sign-up limiter allows 3 attempts per 10s per IP. Wait out
    // the window, then retry with the same email. Retries cover throttle and
    // transient server hiccups only — the limiter itself is never weakened.
    await page.waitForTimeout(11_000);
  }

  throw new Error("unreachable");
}
