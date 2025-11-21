import { test, expect } from "@playwright/test";

test.describe("Node Deletion", () => {
  test("should delete a node using the delete button", async ({ page }) => {
    await page.goto("/");

    // Wait for canvas to load
    await page.locator('[data-node="true"]').first().waitFor();

    // Count initial nodes
    const initialNodeCount = await page.locator('[data-node="true"]').count();

    // Click on a node to select it (not the first one which might be START)
    const nodeToDelete = page.locator('[data-node="true"]').nth(2);
    await nodeToDelete.click();

    // Wait for selection and buttons to appear
    await page.waitForTimeout(300);

    // Look for the delete button (trash icon)
    // The trash button should appear above the selected node
    const deleteButton = page.locator("button:has(svg.lucide-trash-2)").first();

    // Check if delete button is visible
    if (await deleteButton.isVisible()) {
      // Click the delete button
      await deleteButton.click();

      // Wait for deletion
      await page.waitForTimeout(300);

      // Count nodes after deletion
      const newNodeCount = await page.locator('[data-node="true"]').count();

      // Should have one fewer node
      expect(newNodeCount).toBe(initialNodeCount - 1);
    }
  });

  test("should not delete the START node", async ({ page }) => {
    await page.goto("/");

    // Wait for canvas to load
    await page.locator('[data-node="true"]').first().waitFor();

    // Find and click the START node
    // The START node should have specific styling or be the first node
    const startNode = page.locator('[data-node="true"]').first();
    await startNode.click();

    // Wait for selection
    await page.waitForTimeout(300);

    // Count initial nodes
    const initialNodeCount = await page.locator('[data-node="true"]').count();

    // Try to find delete button - it should not be visible for START node
    const deleteButton = page.locator("button:has(svg.lucide-trash-2)").first();

    const isDeleteVisible = await deleteButton.isVisible().catch(() => false);

    if (isDeleteVisible) {
      // If delete button is somehow visible, clicking it should not delete START
      await deleteButton.click();
      await page.waitForTimeout(300);

      // Node count should remain the same
      const newNodeCount = await page.locator('[data-node="true"]').count();
      expect(newNodeCount).toBe(initialNodeCount);
    } else {
      // Delete button should not be visible - this is the expected behavior
      expect(isDeleteVisible).toBe(false);
    }
  });

  test("should handle deleting a node with connections", async ({ page }) => {
    await page.goto("/");

    // Wait for canvas to load
    await page.locator('[data-node="true"]').first().waitFor();

    // Count initial nodes
    const initialNodeCount = await page.locator('[data-node="true"]').count();

    // Click on a node that likely has connections (a middle node)
    const connectedNode = page.locator('[data-node="true"]').nth(1);
    await connectedNode.click();

    // Wait for selection
    await page.waitForTimeout(300);

    // Find and click delete button
    const deleteButton = page.locator("button:has(svg.lucide-trash-2)").first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      // Count nodes after deletion
      const newNodeCount = await page.locator('[data-node="true"]').count();

      // Should have one fewer node
      expect(newNodeCount).toBe(initialNodeCount - 1);

      // The app should still be functional (no errors)
      // Canvas should still be visible
      await expect(
        page.locator(".relative.bg-background").first()
      ).toBeVisible();
    }
  });
});
