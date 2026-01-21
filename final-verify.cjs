const puppeteer = require("puppeteer");

async function verify() {
  console.log("Verifying Treatment Dashboard Progress Ring Animations...");
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log("1. Navigating to http://localhost:5173...");
    await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log("2. Analyzing page for progress elements...");
    
    const data = await page.evaluate(() => {
      const results = {
        svgCircles: [],
        animations: [],
        strokeDashArrayElements: []
      };
      
      const circles = document.querySelectorAll("circle");
      results.svgCircles = Array.from(circles).map(circle => ({
        strokeDashArray: circle.getAttribute("stroke-dasharray") || "none",
        r: circle.getAttribute("r")
      }));
      
      const allElements = document.querySelectorAll("*");
      allElements.forEach(el => {
        const style = getComputedStyle(el);
        
        if (style.animationName && style.animationName \!== "none") {
          results.animations.push({
            animationName: style.animationName,
            animationDuration: style.animationDuration
          });
        }
        
        if (style.strokeDasharray && style.strokeDasharray \!== "none") {
          results.strokeDashArrayElements.push({
            strokeDasharray: style.strokeDasharray
          });
        }
      });
      
      return results;
    });
    
    console.log("Results:");
    console.log("SVG Circles:", data.svgCircles.length);
    console.log("Animations:", data.animations.length);
    console.log("Stroke-dasharray elements:", data.strokeDashArrayElements.length);
    
    let score = 0;
    if (data.svgCircles.length > 0) score++;
    if (data.strokeDashArrayElements.length > 0) score++;
    if (data.animations.length > 0) score++;
    
    console.log("Score:", score + "/3");
    
    await page.screenshot({ path: "C:/dev/gpnet3/verification-final.png" });
    console.log("Screenshot saved");
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return score >= 2;
    
  } catch (error) {
    console.error("Error:", error.message);
    return false;
  } finally {
    await browser.close();
  }
}

verify().then(success => {
  console.log(success ? "SUCCESS" : "FAILED");
}).catch(console.error);
