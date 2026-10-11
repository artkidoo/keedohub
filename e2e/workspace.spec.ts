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
  test("brand context shows brand sections and hides artist vocabulary", async ({ page }) => {
    await signUpWithRetry(page, "brand-nav");
    await page.goto("/workspace/brand");

    await expect(page.locator("body")).toContainText("Documents");
    await expect(page.locator("body")).toContainText("Marketing");
    await expect(page.locator("body")).not.toContainText("Releases");
  });

  test("artist context shows artist sections and hides brand vocabulary", async ({ page }) => {
    await signUpWithRetry(page, "artist-nav");
    await page.goto("/workspace/artist");

    await expect(page.locator("body")).toContainText("Releases");
    await expect(page.locator("body")).not.toContainText("Marketing");
  });

  test("switching context swaps the section set", async ({ page }) => {
    await signUpWithRetry(page, "ctx-switch");

    await page.goto("/workspace/brand");
    await expect(page.locator("body")).toContainText("Documents");

    await page.goto("/workspace/artist");
    await expect(page.locator("body")).toContainText("Releases");

    await page.goto("/workspace/brand");
    await expect(page.locator("body")).toContainText("Documents");
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

const principalScreens = [
  "/workspace/brand",
  "/workspace/brand/requests",
  "/workspace/brand/documents",
  "/workspace/artist",
  "/workspace/artist/releases",
  "/workspace/brand/projects",
];

test.describe("responsive layout at principal screens", () => {
  test("no horizontal overflow at 390x844, 768x1024 and 1440x900", async ({ page }) => {
    await signUpWithRetry(page, "responsive");

    const overflow: string[] = [];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const path of principalScreens) {
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
});
