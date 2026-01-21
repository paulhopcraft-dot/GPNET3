import { chromium } from "playwright";

async function checkHomepage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
    console.log("Page loaded. Current URL:", page.url());
    console.log("Page title:", await page.title());
    
    // Check what elements are on the page
    const bodyText = await page.locator("body").textContent();
    console.log("Page content preview:", bodyText?.substring(0, 500));
    
    // Look for links or buttons
    const links = await page.locator("a").allTextContents();
    console.log("Links found:", links.slice(0, 10));
    
    const buttons = await page.locator("button").allTextContents();
    console.log("Buttons found:", buttons.slice(0, 10));
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

checkHomepage();
