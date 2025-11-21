/**
 * Memory Leak Detection Script for AI World Model
 *
 * USAGE:
 * 1. Open http://localhost:3000 in Chrome
 * 2. Open DevTools Console (F12)
 * 3. Copy and paste this entire script
 * 4. The script will automatically run stress tests and report results
 *
 * The script will:
 * - Perform 100 interactions (arrow creation attempts, modal operations)
 * - Monitor JS heap size before/after
 * - Report if there's a memory leak (>20% growth without GC recovery)
 */

(async function detectMemoryLeak() {
  console.log("🔍 Starting Memory Leak Detection...\n");

  // Force garbage collection if available (Chrome with --enable-precise-memory-info)
  if (window.gc) {
    console.log("⚠️  Manual GC available - forcing initial collection");
    window.gc();
  } else {
    console.log(
      "⚠️  Manual GC not available. Start Chrome with --enable-precise-memory-info for better results"
    );
  }

  // Wait for GC
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Get initial memory
  const initialMemory = performance.memory.usedJSHeapSize;
  console.log(
    `📊 Initial JS Heap Size: ${(initialMemory / 1024 / 1024).toFixed(2)} MB\n`
  );

  // Helper to find elements
  const findButton = (text) => {
    return Array.from(document.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes(text)
    );
  };

  const findNodeByText = (text) => {
    return Array.from(document.querySelectorAll('[role="button"]')).find((el) =>
      el.textContent.includes(text)
    );
  };

  // Stress Test 1: Simulate arrow drag creation attempts
  console.log("🧪 Test 1: Simulating 50 arrow drag attempts...");
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll('[role="button"]');
    if (nodes.length > 0) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];

      // Simulate mousedown on connector dot area
      const rect = randomNode.getBoundingClientRect();
      const mouseDownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: rect.right - 5,
        clientY: rect.top + rect.height / 2,
        button: 0,
      });
      randomNode.dispatchEvent(mouseDownEvent);

      // Immediately mouseup (canceling the drag)
      const mouseUpEvent = new MouseEvent("mouseup", {
        bubbles: true,
        clientX: rect.right + 50,
        clientY: rect.top + rect.height / 2,
        button: 0,
      });
      window.dispatchEvent(mouseUpEvent);
    }

    if (i % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  console.log("✓ Arrow drag simulation complete\n");

  // Stress Test 2: Open/close feedback modal (if exists)
  console.log("🧪 Test 2: Opening/closing feedback modal 30 times...");
  for (let i = 0; i < 30; i++) {
    const feedbackBtn = findButton("Feedback") || findButton("Beta");
    if (feedbackBtn) {
      feedbackBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Try to close modal (look for close button or overlay)
      const closeBtn =
        findButton("Cancel") ||
        findButton("Close") ||
        document.querySelector('[aria-label="Close"]');
      if (closeBtn) {
        closeBtn.click();
      } else {
        // Click outside modal (overlay)
        const overlay =
          document.querySelector('[role="dialog"]')?.parentElement;
        if (overlay) {
          overlay.click();
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  console.log("✓ Modal open/close complete\n");

  // Stress Test 3: Node clicking
  console.log("🧪 Test 3: Clicking nodes 30 times...");
  for (let i = 0; i < 30; i++) {
    const nodes = document.querySelectorAll('[role="button"]');
    if (nodes.length > 0) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      randomNode.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  console.log("✓ Node clicking complete\n");

  // Get memory after tests
  console.log("⏳ Waiting 2 seconds for potential GC...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const beforeGCMemory = performance.memory.usedJSHeapSize;
  console.log(
    `📊 Memory before forced GC: ${(beforeGCMemory / 1024 / 1024).toFixed(2)} MB`
  );

  // Force GC if available
  if (window.gc) {
    console.log("🗑️  Forcing garbage collection...");
    window.gc();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const finalMemory = performance.memory.usedJSHeapSize;
  const growth = finalMemory - initialMemory;
  const growthPercent = ((growth / initialMemory) * 100).toFixed(2);

  console.log(
    `📊 Final JS Heap Size: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(
    `📈 Memory Growth: ${(growth / 1024 / 1024).toFixed(2)} MB (${growthPercent}%)\n`
  );

  // Analysis
  console.log("═══════════════════════════════════════");
  console.log("📋 RESULTS");
  console.log("═══════════════════════════════════════");

  if (growthPercent > 20) {
    console.log("🔴 MEMORY LEAK DETECTED");
    console.log(`   Memory grew by ${growthPercent}% after tests`);
    console.log("   This commit is BAD");
    console.log("\n   Run: git bisect bad");
  } else if (growthPercent > 10) {
    console.log("🟡 POSSIBLE MEMORY LEAK");
    console.log(`   Memory grew by ${growthPercent}%`);
    console.log("   Consider running test again to confirm");
  } else {
    console.log("🟢 NO SIGNIFICANT LEAK DETECTED");
    console.log(`   Memory growth of ${growthPercent}% is within normal range`);
    console.log("   This commit is GOOD");
    console.log("\n   Run: git bisect good");
  }

  console.log("═══════════════════════════════════════\n");

  // Additional diagnostics
  console.log("💡 Additional Diagnostics:");
  console.log(`   - DOM Nodes: ${document.querySelectorAll("*").length}`);
  console.log(`   - Event Listeners: Check Elements tab > Event Listeners`);
  console.log(`   - For detailed analysis: Take heap snapshot in Memory tab\n`);

  return {
    initialMemory,
    finalMemory,
    growth,
    growthPercent,
    hasLeak: growthPercent > 20,
    possibleLeak: growthPercent > 10 && growthPercent <= 20,
  };
})();
