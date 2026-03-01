import { chromium } from "playwright";

async function verifyProgressRings() {
  console.log("🔍 Starting Progress Rings Verification...\n");
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to http://localhost:5173
    console.log("Step 1: Navigating to http://localhost:5173...");
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    console.log("✅ Successfully loaded homepage\n");
    
    // Step 2: Look for any case in the table
    console.log("Step 2: Looking for a case to click...");
    // Wait for table to load
    await page.waitForSelector("table", { timeout: 10000 });
    
    // Look for case rows (skip header)
    const caseRows = await page.locator("table tbody tr").all();
    console.log(`Found ${caseRows.length} case rows`);
    
    if (caseRows.length > 0) {
      // Click the first case row
      await caseRows[0].click();
      await page.waitForTimeout(2000);
      console.log("✅ Successfully clicked first case\n");
    } else {
      console.log("❌ No case rows found");
      await browser.close();
      return;
    }
    
    // Step 3: Click Treatment tab
    console.log("Step 3: Looking for Treatment tab...");
    const treatmentTab = await page.locator("*[role=\"tab\"]:has-text(\"Treatment\"), button:has-text(\"Treatment\"), .tab:has-text(\"Treatment\")").first();
    if (await treatmentTab.count() > 0) {
      await treatmentTab.click();
      await page.waitForTimeout(3000); // Wait for content to load
      console.log("✅ Successfully clicked Treatment tab\n");
    } else {
      console.log("❌ Treatment tab not found");
      // List available tabs
      const tabs = await page.locator("*[role=\"tab\"]").allTextContents();
      console.log("Available tabs:", tabs);
    }
    
    // Step 4: Verify progress rings structure
    console.log("Step 4: Verifying progress rings structure...\n");
    
    // Wait for progress rings to load
    await page.waitForTimeout(2000);
    
    const progressRingsContainer = await page.locator(".progress-rings-container");
    const containerExists = await progressRingsContainer.count() > 0;
    console.log("   📋 .progress-rings-container exists:", containerExists ? "✅" : "❌");
    
    const progressRingCircles = await page.locator(".progress-ring svg circle");
    const circleCount = await progressRingCircles.count();
    console.log("   🔵 .progress-ring svg circle elements found:", circleCount, circleCount > 0 ? "✅" : "❌");
    
    const progressRings = await page.locator(".progress-ring");
    const ringCount = await progressRings.count();
    console.log("   💍 Progress rings count:", ringCount, ringCount === 3 ? "✅" : "❌");
    
    // Check ring content
    if (ringCount > 0) {
      const ringTexts = await progressRings.allTextContents();
      console.log("   📝 Ring contents:", ringTexts);
      
      // Look for expected ring types
      const hasWorkCapacity = ringTexts.some(text => text.includes("Work Capacity") || text.includes("Capacity"));
      const hasRecoveryTime = ringTexts.some(text => text.includes("Recovery Time") || text.includes("Recovery"));
      const hasRiskLevel = ringTexts.some(text => text.includes("Risk Level") || text.includes("Risk"));
      
      console.log("   💪 Work Capacity ring:", hasWorkCapacity ? "✅" : "❌");
      console.log("   ⏰ Recovery Time ring:", hasRecoveryTime ? "✅" : "❌");
      console.log("   ⚠️  Risk Level ring:", hasRiskLevel ? "✅" : "❌");
      
      // Check SVG structure
      console.log("\n   🔍 Detailed SVG Structure:");
      for (let i = 0; i < Math.min(ringCount, 3); i++) {
        const ring = progressRings.nth(i);
        const svgs = await ring.locator("svg").count();
        const circles = await ring.locator("svg circle").count();
        const ringText = await ring.textContent();
        console.log(`   Ring ${i + 1}: ${svgs} SVG(s), ${circles} circle(s) - "${ringText?.trim()}"`);
      }
      
      // Check for colors
      const circlesWithStyles = await page.locator(".progress-ring svg circle[stroke], .progress-ring svg circle[fill]");
      const styledCirclesCount = await circlesWithStyles.count();
      console.log("   🎨 Circles with color styling:", styledCirclesCount, styledCirclesCount > 0 ? "✅" : "❌");
    }
    
    // Summary
    console.log("\n📊 VERIFICATION SUMMARY:");
    console.log("✅ Navigation completed successfully");
    console.log(containerExists ? "✅" : "❌", "Progress rings container found");
    console.log(circleCount > 0 ? "✅" : "❌", "SVG circles present");
    console.log(ringCount === 3 ? "✅" : "❌", "Three progress rings displayed");
    
    console.log("\n⏳ Waiting 5 seconds for visual inspection...");
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error("❌ Error during verification:", error);
  } finally {
    await browser.close();
  }
}

verifyProgressRings();
