const fs = require('fs');
const path = require('path');
const pptxgen = require('C:\\Users\\Paul\\AppData\\Roaming\\npm\\node_modules\\pptxgenjs');
const html2pptx = require('../.claude/skills/pptx/scripts/html2pptx.js');

async function mergeBusinessRulesSlide() {
  try {
    console.log('Loading existing Preventli presentation...');

    // Create a new presentation based on existing one
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Preventli';
    pptx.title = 'Preventli Investment Pitch';
    pptx.subject = 'Investment Opportunity Presentation';

    const workspace = __dirname;

    // Add existing slides back in order
    console.log('Creating slide 1: Title...');
    await html2pptx(path.join(workspace, 'slide1-title.html'), pptx);

    console.log('Creating slide 2: The Problem...');
    await html2pptx(path.join(workspace, 'slide2-problem.html'), pptx);

    console.log('Creating slide 3: The Solution...');
    await html2pptx(path.join(workspace, 'slide3-solution.html'), pptx);

    console.log('Creating slide 4: Business Rules & Automation...');
    await html2pptx(path.join(workspace, 'slide7-business-rules.html'), pptx);

    console.log('Creating slide 5: Go Vertical Integration...');
    await html2pptx(path.join(workspace, 'slide4-govertical.html'), pptx);

    console.log('Creating slide 6: Market Opportunity...');
    await html2pptx(path.join(workspace, 'slide5-market.html'), pptx);

    console.log('Creating slide 7: Call to Action...');
    await html2pptx(path.join(workspace, 'slide6-cta.html'), pptx);

    // Save the updated presentation
    const outputPath = path.join(workspace, 'Preventli_Investment_Pitch_Updated.pptx');
    await pptx.writeFile({ fileName: outputPath });

    console.log(`\n✅ Business rules slide merged successfully!`);
    console.log(`📄 Updated presentation: ${outputPath}`);
    console.log(`\n📋 Slide order:`);
    console.log(`   1. Title`);
    console.log(`   2. The Problem`);
    console.log(`   3. The Solution`);
    console.log(`   4. Business Rules & Automation (NEW)`);
    console.log(`   5. Go Vertical Integration`);
    console.log(`   6. Market Opportunity`);
    console.log(`   7. Call to Action`);

  } catch (error) {
    console.error('❌ Error merging business rules slide:', error);
    process.exit(1);
  }
}

// Run the merge
mergeBusinessRulesSlide();