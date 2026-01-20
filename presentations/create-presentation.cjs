const globalModulePath = 'C:\\Users\\Paul\\AppData\\Roaming\\npm\\node_modules';
const pptxgen = require(`${globalModulePath}/pptxgenjs`);
const html2pptx = require('../.claude/skills/pptx/scripts/html2pptx.cjs');
const path = require('path');

async function createPresentation() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Preventli';
  pptx.title = 'Preventli Investment Pitch';
  pptx.subject = 'Investment Opportunity Presentation';

  const workspace = path.join(__dirname);

  console.log('Creating slide 1: Title...');
  await html2pptx(path.join(workspace, 'slide1-title.html'), pptx);

  console.log('Creating slide 2: The Problem...');
  await html2pptx(path.join(workspace, 'slide2-problem.html'), pptx);

  console.log('Creating slide 3: The Solution...');
  await html2pptx(path.join(workspace, 'slide3-solution.html'), pptx);

  console.log('Creating slide 4: Go Vertical Integration...');
  await html2pptx(path.join(workspace, 'slide4-govertical.html'), pptx);

  console.log('Creating slide 5: Market Opportunity...');
  await html2pptx(path.join(workspace, 'slide5-market.html'), pptx);

  console.log('Creating slide 6: Call to Action...');
  await html2pptx(path.join(workspace, 'slide6-cta.html'), pptx);

  const outputPath = path.join(workspace, 'Preventli_Investment_Pitch.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\n✅ Presentation created successfully: ${outputPath}`);
}

createPresentation().catch(err => {
  console.error('Error creating presentation:', err);
  process.exit(1);
});
