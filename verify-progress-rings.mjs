import { chromium } from "playwright";

async function verifyProgressRings() {
  console.log("🔍 Starting Progress Rings Verification...\n");
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to http://localhost:5173
    console.log("Step 1: Navigating to http://localhost:5173...");
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
    console.log("✅ Successfully loaded homepage\n");
    
    // Step 2: Click Selemani Mwomba case
    console.log("Step 2: Looking for Selemani Mwomba case...");
    const caseLink = await page.locator("text=Selemani Mwomba").first();
    if (await caseLink.count() > 0) {
      await caseLink.click();
      await page.waitForLoadState("networkidle");
      console.log("✅ Successfully clicked Selemani Mwomba case\n");
    } else {
      console.log("❌ Could not find Selemani Mwomba case");
      // Try to find any case
      const anyCase = await page.locator("tr").first();
      if (await anyCase.count() > 0) {
        await anyCase.click();
        console.log("✅ Clicked first available case\n");
      }
    }
    
    // Step 3: Click Treatment tab
    console.log("Step 3: Looking for Treatment tab...");
    const treatmentTab = await page.locator("text=Treatment").first();
    if (await treatmentTab.count() > 0) {
      await treatmentTab.click();
      await page.waitForTimeout(1000);
      console.log("✅ Successfully clicked Treatment tab\n");
    }
    
    // Step 4: Verify progress rings structure
    console.log("Step 4: Verifying progress rings structure...\n");
    
    const progressRingsContainer = await page.locator(".progress-rings-container");
    const containerExists = await progressRingsContainer.count() > 0;
    console.log("   📋 .progress-rings-container exists:", containerExists ? "✅" : "❌");
    
    const progressRingCircles = await page.locator(".progress-ring svg circle");
    const circleCount = await progressRingCircles.count();
    console.log("   🔵 .progress-ring svg circle elements found:", circleCount, circleCount > 0 ? "✅" : "❌");
    
    const progressRings = await page.locator(".progress-ring");
    const ringCount = await progressRings.count();
    console.log("   💍 Progress rings count:", ringCount, ringCount === 3 ? "✅" : "❌");
    
    console.log("\n📊 VERIFICATION SUMMARY:");
    console.log("✅ Navigation completed successfully");
    console.log(containerExists ? "✅" : "❌", "Progress rings container found");
    console.log(circleCount > 0 ? "✅" : "❌", "SVG circles present");
    console.log(ringCount === 3 ? "✅" : "❌", "Three progress rings displayed");
    
    console.log("\n⏳ Waiting 3 seconds for visual inspection...");
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error("❌ Error during verification:", error);
  } finally {
    await browser.close();
  }
}

verifyProgressRings();
