const puppeteer = require('puppeteer');

async function verify() {
  console.log('Verifying progress rings...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);
    
    const data = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle');
      const animations = [];
      
      document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el);
        if (style.animationName !== 'none') {
          animations.push(style.animationName);
        }
      });
      
      return {
        circles: circles.length,
        animations: animations.length
      };
    });
    
    console.log('Circles found:', data.circles);
    console.log('Animations found:', data.animations);
    
    await page.screenshot({ path: 'C:/dev/gpnet3/verify.png' });
    
    setTimeout(() => browser.close(), 3000);
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

verify();
