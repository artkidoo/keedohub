import { defineConfig, devices } from "@playwright/test";

/**
 * Browser (end-to-end) test configuration — Phase 5.3A.
 *
 * Deliberately separate from the `node --test` unit suite (`npm test`), which
 * runs without a server or a browser. These specs drive the real application
 * through real Better Auth flows — no forged sessions, no bypassed auth.
 *
 * Prerequisites (not automated here, because they are environment-specific):
 *   1. PostgreSQL running and migrated:  npm run db:migrate
 *   2. Dev server running:              npm run dev   (port 3000)
 *
 * Fixtures are created through the real /signup route and removed in an
 * `afterAll` sweep, so a failing test cannot leave rows behind.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // An already-running dev server is reused; nothing is started or torn down
  // here so that the suite never fights the developer's own server.
  webServer: process.env.E2E_START_SERVER
    ? {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
