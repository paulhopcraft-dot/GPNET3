const pptxgen = require('pptxgenjs');
const path = require('path');

const COLORS = {
  bgDark: '0D0D0D',
  bgMedium: '1A1A1A',
  gold: 'D4AF37',
  white: 'FFFFFF',
  lightGray: 'CCCCCC',
  red: 'E74C3C',
  green: '2ECC71',
  accent: 'F39C12',
  blue: '3498DB'
};

async function createPresentation() {
  console.log('Creating Employer Presentation (Hormozi Style)...\n');

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Preventli - For Employers';
  pptx.author = 'Preventli';
  pptx.company = 'Preventli';

  function addDarkSlide() {
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.bgDark };
    return slide;
  }

  // SLIDE 1: Title
  console.log('Creating Slide 1: Title...');
  let slide = addDarkSlide();
  slide.addText('Stop Losing $42,600/Year\nto WorkCover Chaos', {
    x: 0.5, y: 1.4, w: 9, h: 1.4,
    fontSize: 38, color: COLORS.gold, bold: true, align: 'center', lineSpacing: 50
  });
  slide.addText('How Smart Employers Get Workers Back Faster\nWhile Eliminating Compliance Headaches', {
    x: 0.5, y: 3.1, w: 9, h: 0.8,
    fontSize: 18, color: COLORS.white, align: 'center', lineSpacing: 28
  });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 4.5, w: 9, h: 0.5,
    fontSize: 28, color: COLORS.gold, bold: true, align: 'center', charSpacing: 6
  });

  // SLIDE 2: Problem
  console.log('Creating Slide 2: Problem...');
  slide = addDarkSlide();
  slide.addText('WorkCover Is Eating Your Time and Money', {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 28, color: COLORS.red, bold: true
  });
  const problems = [
    { stat: '$6,100', text: ' average cost per injured worker (before premiums)' },
    { stat: '8 hours', text: ' per week chasing certificates and paperwork' },
    { stat: 'Penalties', text: ' up to $18,000 for missed compliance obligations' },
    { stat: 'Longer', text: ' claims = higher premiums for years to come' }
  ];
  problems.forEach((p, i) => {
    slide.addText([
      { text: p.stat, options: { color: COLORS.gold, bold: true, fontSize: 20 } },
      { text: p.text, options: { color: COLORS.white, fontSize: 17 } }
    ], { x: 0.8, y: 1.4 + (i * 0.7), w: 8.5, h: 0.6 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 4.2, w: 9, h: 0.9, fill: { color: COLORS.bgMedium } });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 4.2, w: 0.08, h: 0.9, fill: { color: COLORS.red } });
  slide.addText('You\'re not a WorkCover expert. You shouldn\'t have to be.', {
    x: 0.8, y: 4.4, w: 8.5, h: 0.5, fontSize: 16, color: COLORS.white, italic: true
  });

  // SLIDE 3: Daily Pain
  console.log('Creating Slide 3: Daily Pain...');
  slide = addDarkSlide();
  slide.addText('Your WorkCover "System" Right Now', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 26, color: COLORS.white, bold: true
  });
  const pains = [
    'Spreadsheets you forget to update',
    'Certificates buried in email somewhere',
    'No idea what\'s due when',
    'Always reacting, never ahead',
    'Hoping the insurer handles it (they don\'t)'
  ];
  pains.forEach((p, i) => {
    slide.addText([
      { text: 'X  ', options: { color: COLORS.red, bold: true, fontSize: 20 } },
      { text: p, options: { color: COLORS.white, fontSize: 17 } }
    ], { x: 0.8, y: 1.25 + (i * 0.6), w: 8.5, h: 0.55 });
  });
  slide.addText([
    { text: 'Sound familiar? ', options: { color: COLORS.lightGray } },
    { text: 'You\'re not alone.', options: { color: COLORS.gold, bold: true } }
  ], { x: 0.5, y: 4.3, w: 9, h: 0.4, fontSize: 16, align: 'center' });

  // SLIDE 4: Solution
  console.log('Creating Slide 4: Solution...');
  slide = addDarkSlide();
  slide.addText('INTRODUCING', {
    x: 0.5, y: 1.3, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.lightGray, align: 'center', charSpacing: 5
  });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 56, color: COLORS.gold, bold: true, align: 'center', charSpacing: 8
  });
  slide.addText('Your AI-Powered WorkCover Assistant', {
    x: 0.5, y: 2.9, w: 9, h: 0.5,
    fontSize: 22, color: COLORS.white, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2.5, y: 3.6, w: 5, h: 0.8, fill: { color: COLORS.bgMedium }, line: { color: COLORS.gold, width: 2 } });
  slide.addText('Never Miss a Deadline. Never Lose a Document.', {
    x: 2.5, y: 3.75, w: 5, h: 0.5,
    fontSize: 15, color: COLORS.gold, bold: true, align: 'center'
  });

  // SLIDE 5: What You Get 1
  console.log('Creating Slide 5: What You Get 1...');
  slide = addDarkSlide();
  slide.addText('Everything You Need. Nothing You Don\'t.', {
    x: 0.5, y: 0.3, w: 7, h: 0.6,
    fontSize: 24, color: COLORS.gold, bold: true
  });
  const features1 = [
    { title: 'One Dashboard for Everything', desc: 'All your injured workers, certificates, deadlines - one place' },
    { title: 'Automatic Certificate Tracking', desc: 'Never chase a medical certificate again - we track expiries for you' },
    { title: 'Compliance Alerts Before Deadlines', desc: '7-day warnings so you\'re always ahead, never scrambling' },
    { title: 'Clear Action Lists', desc: 'Know exactly what needs doing today, this week, this month' }
  ];
  features1.forEach((item, i) => {
    const y = 1.0 + (i * 0.85);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: COLORS.bgMedium } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: COLORS.green } });
    slide.addText(item.title, { x: 0.8, y: y + 0.08, w: 8.5, h: 0.35, fontSize: 16, color: COLORS.white, bold: true });
    slide.addText(item.desc, { x: 0.8, y: y + 0.4, w: 8.5, h: 0.3, fontSize: 12, color: COLORS.lightGray });
  });

  // SLIDE 6: What You Get 2
  console.log('Creating Slide 6: What You Get 2...');
  slide = addDarkSlide();
  slide.addText('Plus AI That Does the Hard Work', {
    x: 0.5, y: 0.3, w: 7, h: 0.6,
    fontSize: 24, color: COLORS.gold, bold: true
  });
  const features2 = [
    { title: 'AI Case Summaries', desc: 'Get the full picture on any worker in seconds - no reading required' },
    { title: 'RTW Progress Tracking', desc: 'See exactly where each worker is in their return-to-work journey' },
    { title: 'Risk Alerts', desc: 'We flag problems early so you can address them before they escalate' },
    { title: 'Communication History', desc: 'Every email, note, and update - searchable and timestamped' }
  ];
  features2.forEach((item, i) => {
    const y = 1.0 + (i * 0.85);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: COLORS.bgMedium } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: COLORS.gold } });
    slide.addText(item.title, { x: 0.8, y: y + 0.08, w: 8.5, h: 0.35, fontSize: 16, color: COLORS.white, bold: true });
    slide.addText(item.desc, { x: 0.8, y: y + 0.4, w: 8.5, h: 0.3, fontSize: 12, color: COLORS.lightGray });
  });

  // SLIDE 7: ROI
  console.log('Creating Slide 7: ROI...');
  slide = addDarkSlide();
  slide.addText('The Math Is Simple', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28, color: COLORS.white, bold: true
  });
  slide.addText('50-Employee Company with 8 Active Cases', {
    x: 0.5, y: 0.85, w: 9, h: 0.3,
    fontSize: 14, color: COLORS.lightGray
  });
  const roi = [
    { label: 'Time saved on admin (8hrs/wk x $50)', amount: '$20,800', color: COLORS.green },
    { label: 'Faster RTW = lower premium impact', amount: '$12,000', color: COLORS.green },
    { label: 'Avoided compliance penalties', amount: '$9,800', color: COLORS.green },
    { label: 'ANNUAL SAVINGS', amount: '$42,600', color: COLORS.gold, bold: true, topLine: true },
    { label: 'Preventli Investment', amount: '-$6,400', color: COLORS.red },
    { label: 'NET BENEFIT', amount: '$36,200', color: COLORS.gold, bold: true, topLine: true }
  ];
  roi.forEach((row, i) => {
    const y = 1.25 + (i * 0.5);
    if (row.topLine) slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: y - 0.05, w: 5.5, h: 0.02, fill: { color: COLORS.gold } });
    slide.addText(row.label, { x: 0.5, y, w: 4.5, h: 0.4, fontSize: 14, color: row.bold ? COLORS.gold : COLORS.lightGray, bold: row.bold });
    slide.addText(row.amount, { x: 5, y, w: 1.5, h: 0.4, fontSize: 14, color: row.color, bold: true, align: 'right' });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 7, y: 1.5, w: 2.5, h: 2.3, fill: { color: '0D2818' }, line: { color: COLORS.green, width: 2 } });
  slide.addText('666%', { x: 7, y: 1.8, w: 2.5, h: 1, fontSize: 52, color: COLORS.green, bold: true, align: 'center' });
  slide.addText('ROI', { x: 7, y: 2.85, w: 2.5, h: 0.4, fontSize: 18, color: COLORS.white, align: 'center' });
  slide.addText('$533/mo gets\nyou $3,550/mo', { x: 7, y: 3.3, w: 2.5, h: 0.5, fontSize: 11, color: COLORS.lightGray, align: 'center' });

  // SLIDE 8: How It Works
  console.log('Creating Slide 8: How It Works...');
  slide = addDarkSlide();
  slide.addText('How It Works (It\'s Simple)', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 28, color: COLORS.gold, bold: true
  });
  const how = [
    { num: '1', title: 'We Connect', desc: 'Link to your email and insurer portal - takes 30 minutes' },
    { num: '2', title: 'We Organize', desc: 'All your cases, certificates, and history - imported and organized' },
    { num: '3', title: 'We Alert', desc: 'Get notified before anything is due - never miss a deadline' },
    { num: '4', title: 'We Summarize', desc: 'AI gives you the full picture instantly - no reading required' }
  ];
  how.forEach((step, i) => {
    const y = 1.2 + (i * 0.8);
    slide.addShape(pptx.shapes.OVAL, { x: 0.5, y, w: 0.5, h: 0.5, fill: { color: COLORS.gold } });
    slide.addText(step.num, { x: 0.5, y: y + 0.05, w: 0.5, h: 0.4, fontSize: 18, color: COLORS.bgDark, bold: true, align: 'center' });
    slide.addText(step.title, { x: 1.2, y, w: 8, h: 0.35, fontSize: 18, color: COLORS.white, bold: true });
    slide.addText(step.desc, { x: 1.2, y: y + 0.35, w: 8, h: 0.3, fontSize: 13, color: COLORS.lightGray });
  });

  // SLIDE 9: What Others Say
  console.log('Creating Slide 9: Social Proof...');
  slide = addDarkSlide();
  slide.addText('Built for Employers Like You', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 28, color: COLORS.white, bold: true
  });
  const proofs = [
    { stat: '174+', label: 'Cases Being Managed' },
    { stat: '8 hrs', label: 'Saved Per Week on Admin' },
    { stat: '99%+', label: 'Platform Uptime' },
    { stat: '$0', label: 'Compliance Penalties' }
  ];
  proofs.forEach((p, i) => {
    const x = 0.5 + (i % 2) * 4.5;
    const y = 1.2 + Math.floor(i / 2) * 1.5;
    slide.addShape(pptx.shapes.RECTANGLE, { x, y, w: 4, h: 1.2, fill: { color: COLORS.bgMedium } });
    slide.addText(p.stat, { x, y: y + 0.15, w: 4, h: 0.55, fontSize: 38, color: COLORS.gold, bold: true, align: 'center' });
    slide.addText(p.label, { x, y: y + 0.75, w: 4, h: 0.35, fontSize: 13, color: COLORS.lightGray, align: 'center' });
  });
  slide.addText('"Finally, WorkCover management that doesn\'t require a degree"', {
    x: 0.5, y: 4.4, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.green, italic: true, align: 'center'
  });

  // SLIDE 10: Risk Reversal
  console.log('Creating Slide 10: Risk Reversal...');
  slide = addDarkSlide();
  slide.addText('Try It Risk-Free', {
    x: 0.5, y: 0.6, w: 9, h: 0.8,
    fontSize: 38, color: COLORS.green, bold: true, align: 'center'
  });
  const guarantees = ['30-day free trial with your real cases', 'Full onboarding support included', 'Cancel anytime - no lock-in contracts'];
  guarantees.forEach((g, i) => {
    slide.addText([
      { text: '✓  ', options: { color: COLORS.green, fontSize: 22 } },
      { text: g, options: { color: COLORS.white, fontSize: 18 } }
    ], { x: 2.3, y: 1.7 + (i * 0.6), w: 5.5, h: 0.5 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 1.5, y: 3.5, w: 7, h: 0.9, fill: { color: '0D2818' }, line: { color: COLORS.green, width: 2 } });
  slide.addText([
    { text: 'If you\'re not saving time in ', options: { color: COLORS.white } },
    { text: '30 days', options: { color: COLORS.green, bold: true } },
    { text: ', you pay nothing.', options: { color: COLORS.white } }
  ], { x: 1.7, y: 3.7, w: 6.6, h: 0.5, fontSize: 18, align: 'center' });

  // SLIDE 11: Pricing
  console.log('Creating Slide 11: Pricing...');
  slide = addDarkSlide();
  slide.addText('Simple Pricing. No Surprises.', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28, color: COLORS.white, bold: true
  });
  const tiers = [
    { name: 'STARTER', price: '$299', period: '/month', cases: 'Up to 10 cases', for: 'Small employers' },
    { name: 'GROWTH', price: '$499', period: '/month', cases: 'Up to 25 cases', for: 'Growing businesses', featured: true },
    { name: 'PROFESSIONAL', price: '$799', period: '/month', cases: 'Up to 50 cases', for: 'Mid-size employers' }
  ];
  tiers.forEach((tier, i) => {
    const x = 1 + (i * 3);
    slide.addShape(pptx.shapes.RECTANGLE, {
      x, y: 1.0, w: 2.7, h: 3.2,
      fill: { color: COLORS.bgMedium },
      line: tier.featured ? { color: COLORS.gold, width: 2 } : null
    });
    if (tier.featured) {
      slide.addShape(pptx.shapes.RECTANGLE, { x: x + 0.35, y: 1.1, w: 2, h: 0.35, fill: { color: COLORS.gold } });
      slide.addText('MOST POPULAR', { x: x + 0.35, y: 1.12, w: 2, h: 0.3, fontSize: 10, color: COLORS.bgDark, bold: true, align: 'center' });
    }
    const offset = tier.featured ? 0.2 : 0;
    slide.addText(tier.name, { x, y: 1.5 + offset, w: 2.7, h: 0.4, fontSize: 14, color: COLORS.gold, align: 'center', charSpacing: 2 });
    slide.addText(tier.price, { x, y: 1.95 + offset, w: 2.7, h: 0.7, fontSize: 36, color: COLORS.white, bold: true, align: 'center' });
    slide.addText(tier.period, { x, y: 2.55 + offset, w: 2.7, h: 0.35, fontSize: 12, color: COLORS.lightGray, align: 'center' });
    slide.addText(tier.cases, { x, y: 2.95 + offset, w: 2.7, h: 0.35, fontSize: 12, color: COLORS.green, align: 'center' });
    slide.addText(tier.for, { x, y: 3.3 + offset, w: 2.7, h: 0.3, fontSize: 11, color: COLORS.lightGray, align: 'center' });
  });
  slide.addText('All plans include: Dashboard | Alerts | AI Summaries | Support', {
    x: 0.5, y: 4.4, w: 9, h: 0.4,
    fontSize: 12, color: COLORS.lightGray, align: 'center'
  });

  // SLIDE 12: Urgency
  console.log('Creating Slide 12: Urgency...');
  slide = addDarkSlide();
  slide.addText('Why Start Today?', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 30, color: COLORS.accent, bold: true
  });
  const urgency = [
    { text: 'Every week = ', highlight: '$800+ in lost admin time' },
    { text: 'Every missed deadline = ', highlight: 'potential penalty' },
    { text: 'Longer claims = ', highlight: 'higher premiums for 3 years' },
    { text: 'Your workers deserve ', highlight: 'better support' }
  ];
  urgency.forEach((p, i) => {
    slide.addText([
      { text: '▶  ', options: { color: COLORS.accent } },
      { text: p.text, options: { color: COLORS.white } },
      { text: p.highlight, options: { color: COLORS.gold, bold: true } }
    ], { x: 0.8, y: 1.3 + (i * 0.65), w: 8.5, h: 0.5, fontSize: 17 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 4, w: 9, h: 0.9, fill: { color: COLORS.bgMedium } });
  slide.addText('The best time to get organized was before your last claim. The second best time is now.', {
    x: 0.7, y: 4.25, w: 8.6, h: 0.4, fontSize: 15, color: COLORS.white, align: 'center'
  });

  // SLIDE 13: CTA
  console.log('Creating Slide 13: CTA...');
  slide = addDarkSlide();
  slide.addText('Ready to Stop the Chaos?', {
    x: 0.5, y: 1.0, w: 9, h: 0.8,
    fontSize: 42, color: COLORS.gold, bold: true, align: 'center'
  });
  slide.addText('Start your 30-day free trial', {
    x: 0.5, y: 1.9, w: 9, h: 0.4,
    fontSize: 20, color: COLORS.white, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2.5, y: 2.5, w: 5, h: 0.8, fill: { color: COLORS.gold } });
  slide.addText('GET STARTED FREE', { x: 2.5, y: 2.65, w: 5, h: 0.5, fontSize: 22, color: COLORS.bgDark, bold: true, align: 'center' });
  slide.addText('employers@preventli.com.au', {
    x: 0.5, y: 3.6, w: 9, h: 0.4,
    fontSize: 18, color: COLORS.gold, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2, y: 4.2, w: 6, h: 0.7, fill: { color: COLORS.bgMedium } });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2, y: 4.2, w: 0.08, h: 0.7, fill: { color: COLORS.green } });
  slide.addText('No credit card required. Setup takes 30 minutes.', {
    x: 2.2, y: 4.35, w: 5.6, h: 0.4, fontSize: 14, color: COLORS.lightGray
  });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 5.0, w: 9, h: 0.4,
    fontSize: 20, color: COLORS.gold, bold: true, align: 'center', charSpacing: 4
  });

  // Save presentation
  const outputPath = path.join(__dirname, 'Preventli-Employers.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\n✓ Presentation saved: ${outputPath}`);
  console.log('  13 slides created in Alex Hormozi style');
}

createPresentation().catch(console.error);
