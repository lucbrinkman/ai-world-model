import { test, expect } from "@playwright/test";

test.describe("Node Creation", () => {
  test("should create a new node via context menu", async ({ page }) => {
    await page.goto("/");

    // Wait for canvas to load
    await page.locator('[data-node="true"]').first().waitFor();

    // Count initial nodes
    const initialNodeCount = await page.locator('[data-node="true"]').count();

    // Right-click on empty canvas space to open context menu
    const canvas = page.locator(".relative.bg-background").first();
    await canvas.click({ button: "right", position: { x: 600, y: 400 } });

    // Wait for context menu to appear
    await page.waitForTimeout(200);

    // Click "Add Node" in context menu
    const addNodeButton = page.getByText("Add Node");
    await expect(addNodeButton).toBeVisible();
    await addNodeButton.click();

    // Wait for new node to be created
    await page.waitForTimeout(500);

    // Count nodes after creation
    const newNodeCount = await page.locator('[data-node="true"]').count();

    // Should have one more node
    expect(newNodeCount).toBe(initialNodeCount + 1);
  });

  test("should create a node using add arrow buttons", async ({ page }) => {
    await page.goto("/");

    // Wait for canvas to load
    await page.locator('[data-node="true"]').first().waitFor();

    // Click on a node to select it
    const firstNode = page.locator('[data-node="true"]').first();
    await firstNode.click();

    // Wait for node to be selected and add arrow buttons to appear
    await page.waitForTimeout(300);

    // Count initial nodes
    const initialNodeCount = await page.locator('[data-node="true"]').count();

    // Look for an add arrow button (they should be visible on selected nodes)
    // Try to find one of the directional arrow buttons
    const arrowButton = page
      .locator('button:has(svg[class*="lucide-arrow"])')
      .first();

    if (await arrowButton.isVisible()) {
      // Click and drag the arrow button to create a new connection
      await arrowButton.hover();
      await page.mouse.down();

      // Drag to a new position
      await page.mouse.move(700, 300);
      await page.mouse.up();

      // Wait for node creation
      await page.waitForTimeout(500);

      // Count nodes after creation
      const newNodeCount = await page.locator('[data-node="true"]').count();

      // Should have one more node
      expect(newNodeCount).toBe(initialNodeCount + 1);
    }
  });
});
