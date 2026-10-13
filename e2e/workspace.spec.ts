/**
 * Workspace navigation and responsive-layout journeys — Phase 5.3A.
 */

import { expect, test } from "@playwright/test";

import { signUpWithRetry } from "./auth";
import { cleanupE2eUsers } from "./fixtures";

test.afterAll(async () => {
  await cleanupE2eUsers();
});

// ---------------------------------------------------------------------------
// 4. Brand and Artist workspace navigation render role-specific experiences.
// ---------------------------------------------------------------------------

test.describe("brand and artist context navigation", () => {
  test("a brand account sees brand sections and no artist vocabulary", async ({ page }) => {
    await signUpWithRetry(page, "brand-nav", "brand");
    await expect(page).toHaveURL(/\/workspace\/brand/);

    await page.goto("/workspace/brand");

    await expect(page.locator("body")).toContainText("Documents");
    await expect(page.locator("body")).toContainText("Marketing");
    await expect(page.locator("body")).not.toContainText("Releases");
  });

  test("an artist account sees artist sections and no brand vocabulary", async ({ page }) => {
    await signUpWithRetry(page, "artist-nav", "artist");
    await expect(page).toHaveURL(/\/workspace\/artist/);

    await page.goto("/workspace/artist");

    await expect(page.locator("body")).toContainText("Releases");
    await expect(page.locator("body")).not.toContainText("Marketing");
  });

  test("a typed account is offered no context switcher", async ({ page }) => {
    await signUpWithRetry(page, "no-switcher", "artist");
    await page.goto("/workspace/artist");

    // Nothing to switch between: the switcher renders nothing at all rather
    // than offering a second context the account may not open.
    await expect(
      page.getByRole("navigation", { name: "Workspace context" }),
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 6. No obvious horizontal overflow at the principal viewports.
// ---------------------------------------------------------------------------

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

// Each account only reaches its own context, so the principal screens are
// grouped per account type and checked with a real account of that type.
const principalScreensByAccount: {
  accountType: "brand" | "artist";
  label: string;
  screens: string[];
}[] = [
  {
    accountType: "brand",
    label: "responsive-brand",
    screens: [
      "/workspace/brand",
      "/workspace/brand/requests",
      "/workspace/brand/documents",
      "/workspace/brand/projects",
    ],
  },
  {
    accountType: "artist",
    label: "responsive-artist",
    screens: ["/workspace/artist", "/workspace/artist/releases"],
  },
];

test.describe("responsive layout at principal screens", () => {
  for (const group of principalScreensByAccount) {
    // This journey visits every principal screen at three viewports — 12 full
    // page loads plus a sign-up. The default per-test timeout is not enough for
    // a dev-server compile of each route, so the budget is tripled here rather
    // than by dropping a viewport, a screen, or an assertion.
    test(`no horizontal overflow on ${group.accountType} screens at 390x844, 768x1024 and 1440x900`, async ({ page }) => {
      test.slow();

      await signUpWithRetry(page, group.label, group.accountType);

      const overflow: string[] = [];

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        for (const path of group.screens) {
          await page.goto(path);
          await expect(page.locator("main")).toBeVisible();

          const overflowPx = await page.evaluate(() => {
            const doc = document.documentElement;
            return doc.scrollWidth - doc.clientWidth;
          });

          if (overflowPx > 1) {
            overflow.push(`${path} @ ${vp.width}x${vp.height}: +${overflowPx}px`);
          }
        }
      }

      expect(overflow, `horizontal overflow detected:\n${overflow.join("\n")}`).toEqual([]);
    });
  }
});
