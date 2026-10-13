/**
 * Public marketing homepage — customer-experience upgrade, Part 5.
 *
 * Covers the two public-surface requirements end to end:
 *   1. The services-grid "Read more" dialog is operable and announced:
 *      accessible name, title, Escape close, visible close control, enquiry
 *      link target.
 *   2. No obvious horizontal overflow on the homepage at the three principal
 *      viewports (the workspace screens are checked in workspace.spec.ts).
 *
 * No sign-up needed — the homepage is public, so these tests run fast and
 * leave no rows behind.
 */

import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

test.describe("services grid dialog", () => {
  test("Read more opens an accessible dialog and Escape closes it", async ({ page }) => {
    await page.goto("/");

    // The trigger announces its target for screen readers ("Read more about X").
    const trigger = page.getByRole("button", { name: "Read more about Brand identity" });
    await trigger.click();

    // A dialog with an accessible name, description and a labelled close.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Brand identity" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Who it is for" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "What we make" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();

    // Escape dismisses — the keyboard path is real, not decorative.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("the close control also dismisses the dialog", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Read more about Website design & development" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("the enquiry CTA targets the matching context behind login", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Read more about Music cover artwork" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByRole("link", { name: /Start an enquiry/ })).toHaveAttribute(
      "href",
      /\/login\?next=%2Fworkspace%2Fartist%2Frequests%2Fnew/,
    );
  });
});

test.describe("homepage responsive layout", () => {
  test("no horizontal overflow at 390x844, 768x1024 and 1440x900", async ({ page }) => {
    const overflow: string[] = [];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(page.locator("main")).toBeVisible();

      const overflowPx = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });

      if (overflowPx > 1) {
        overflow.push(`/ @ ${vp.width}x${vp.height}: +${overflowPx}px`);
      }
    }

    expect(overflow, `horizontal overflow detected:\n${overflow.join("\n")}`).toEqual([]);
  });

  test("an open dialog stays inside the viewport while scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: "Read more about Brand identity" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const overflowPx = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflowPx, "open dialog must not overflow horizontally").toBeLessThanOrEqual(1);
  });
});
