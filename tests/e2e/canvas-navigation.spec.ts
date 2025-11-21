import { test, expect } from "@playwright/test";

test.describe("Canvas Navigation", () => {
  test("should load the flowchart page", async ({ page }) => {
    await page.goto("/");

    // Wait for the canvas to be visible
    await expect(page.locator('[data-node="true"]').first()).toBeVisible();

    // Check that we have nodes on the canvas
    const nodeCount = await page.locator('[data-node="true"]').count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test("should be able to pan the canvas", async ({ page }) => {
    await page.goto("/");

    // Wait for canvas to load
    await page.locator('[data-node="true"]').first().waitFor();

    // Get initial scroll position
    const scrollContainer = page
      .locator(".w-full.h-full.overflow-auto")
      .first();
    const initialScrollLeft = await scrollContainer.evaluate(
      (el) => el.scrollLeft
    );
    const initialScrollTop = await scrollContainer.evaluate(
      (el) => el.scrollTop
    );

    // Pan by dragging on empty canvas space
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(300, 300);
    await page.mouse.up();

    // Check that scroll position changed
    const newScrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
    const newScrollTop = await scrollContainer.evaluate((el) => el.scrollTop);

    expect(
      newScrollLeft !== initialScrollLeft || newScrollTop !== initialScrollTop
    ).toBeTruthy();
  });

  test("should zoom in and out with Ctrl+scroll", async ({ page }) => {
    await page.goto("/");

    // Wait for canvas to load
    await page.locator('[data-node="true"]').first().waitFor();

    // Get initial zoom (from the canvas container transform style)
    const canvas = page.locator(".relative.bg-background").first();
    const initialTransform = await canvas.evaluate(
      (el) => window.getComputedStyle(el).transform
    );

    // Zoom in with Ctrl+Wheel
    await page.mouse.move(500, 500);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -100);
    await page.keyboard.up("Control");

    // Wait for zoom to apply
    await page.waitForTimeout(100);

    const newTransform = await canvas.evaluate(
      (el) => window.getComputedStyle(el).transform
    );

    // Transform should have changed
    expect(newTransform).not.toBe(initialTransform);
  });
});
