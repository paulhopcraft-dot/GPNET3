const globalModulePath = 'C:\\Users\\Paul\\AppData\\Roaming\\npm\\node_modules';
const pptxgen = require(`${globalModulePath}/pptxgenjs`);
const html2pptx = require('./html2pptx.cjs');
const path = require('path');

async function createPresentation() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Preventli';
  pptx.title = 'Preventli Partnership Presentation';
  pptx.subject = 'WorkSafe Victoria Compliance Platform - Partnership Overview';

  const workspace = path.join(__dirname);

  // 13-Slide Partnership Presentation

  console.log('Creating slide 1: Title...');
  await html2pptx(path.join(workspace, 'slide1-title.html'), pptx);

  // Add logo to title slide - small, top area
  const slide1 = pptx.slides[0];
  slide1.addImage({
    path: path.join(workspace, 'preventli-logo.png'),
    x: 3.5,
    y: 0.5,
    w: 3.0,
    h: 1.6,
  });

  console.log('Creating slide 2: The Problem...');
  await html2pptx(path.join(workspace, 'slide2-problem.html'), pptx);

  console.log('Creating slide 3: The Solution...');
  await html2pptx(path.join(workspace, 'slide3-solution.html'), pptx);

  console.log('Creating slide 4: Compliance Features...');
  await html2pptx(path.join(workspace, 'slide4-compliance-features.html'), pptx);

  console.log('Creating slide 5: Automation & AI...');
  await html2pptx(path.join(workspace, 'slide5-automation-ai.html'), pptx);

  console.log('Creating slide 6: Business Rules...');
  await html2pptx(path.join(workspace, 'slide7-business-rules.html'), pptx);

  console.log('Creating slide 7: AI & Intelligence...');
  await html2pptx(path.join(workspace, 'slide7b-ai-intelligence.html'), pptx);

  console.log('Creating slide 8: Integration & Data...');
  await html2pptx(path.join(workspace, 'slide7c-integration.html'), pptx);

  console.log('Creating slide 9: Sales Outreach...');
  await html2pptx(path.join(workspace, 'slide4-govertical.html'), pptx);

  console.log('Creating slide 10: Target Market (Tiered)...');
  await html2pptx(path.join(workspace, 'slide8-target-market.html'), pptx);

  console.log('Creating slide 11: Tier 1 GTM - Land the Anchors...');
  await html2pptx(path.join(workspace, 'slide9-gtm-tier1.html'), pptx);

  console.log('Creating slide 12: Tier 2 GTM - Scale with Inbound...');
  await html2pptx(path.join(workspace, 'slide10-gtm-tier2.html'), pptx);

  console.log('Creating slide 13: Tier 3 GTM - Enterprise Expansion...');
  await html2pptx(path.join(workspace, 'slide11-gtm-tier3.html'), pptx);

  console.log('Creating slide 14: Voice AI Agent...');
  await html2pptx(path.join(workspace, 'slide12-voice-ai.html'), pptx);

  console.log('Creating slide 15: Legacy Integration...');
  await html2pptx(path.join(workspace, 'slide14-integration.html'), pptx);

  console.log('Creating slide 16: Next Steps...');
  await html2pptx(path.join(workspace, 'slide13-next-steps.html'), pptx);

  // Add tiny logo to bottom-right of slides 2-14
  const logoPath = path.join(workspace, 'preventli-logo.png');
  for (let i = 1; i < pptx.slides.length; i++) {
    pptx.slides[i].addImage({
      path: logoPath,
      x: 9.2,
      y: 5.1,
      w: 0.65,
      h: 0.35,
    });
  }

  const outputPath = path.join(workspace, 'Preventli_Partnership_Final.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\n✅ Presentation created successfully: ${outputPath}`);
  console.log('Total slides: 16');
}

createPresentation().catch(err => {
  console.error('Error creating presentation:', err);
  process.exit(1);
});
