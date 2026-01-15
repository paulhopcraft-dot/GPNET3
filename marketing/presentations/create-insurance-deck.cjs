const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// Hormozi color palette - dark and bold
const COLORS = {
  bgDark: '0D0D0D',
  bgMedium: '1A1A1A',
  gold: 'D4AF37',
  white: 'FFFFFF',
  lightGray: 'CCCCCC',
  darkGray: '666666',
  red: 'E74C3C',
  green: '2ECC71',
  accent: 'F39C12'
};

async function createPresentation() {
  console.log('Creating Insurance Company Presentation (Hormozi Style)...\n');

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Preventli - Insurance Partner Program';
  pptx.author = 'Preventli';
  pptx.subject = 'AI-Powered Claims Intelligence Platform';
  pptx.company = 'Preventli';

  // Helper function to add slide with dark background
  function addDarkSlide() {
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.bgDark };
    return slide;
  }

  // SLIDE 1: Title
  console.log('Creating Slide 1: Title...');
  let slide = addDarkSlide();
  slide.addText('How Insurance Partners Are Generating\n$1.5M+ in New Annual Revenue\nWhile Cutting Claims Costs by 15%', {
    x: 0.5, y: 1.5, w: 9, h: 2,
    fontSize: 32, color: COLORS.gold, bold: true, align: 'center', valign: 'middle',
    lineSpacing: 42
  });
  slide.addText('The AI-Powered Claims Platform That Pays For Itself 10x Over', {
    x: 0.5, y: 3.8, w: 9, h: 0.5,
    fontSize: 18, color: COLORS.white, align: 'center'
  });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 4.8, w: 9, h: 0.5,
    fontSize: 28, color: COLORS.gold, bold: true, align: 'center', charSpacing: 6
  });

  // SLIDE 2: Problem Agitation
  console.log('Creating Slide 2: Problem...');
  slide = addDarkSlide();
  slide.addText('Your Claims Portfolio Is Bleeding Money', {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 32, color: COLORS.red, bold: true
  });
  const problems = [
    { stat: '$61 BILLION', text: ' lost annually to workplace injuries in Australia' },
    { stat: '70%', text: ' of case manager time wasted on admin (not helping workers)' },
    { stat: '47 weeks', text: ' average claim duration (should be 23)' },
    { stat: '1 in 4', text: ' claims escalate to disputes ($50K+ each)' }
  ];
  problems.forEach((p, i) => {
    slide.addText([
      { text: p.stat, options: { color: COLORS.gold, bold: true, fontSize: 20 } },
      { text: p.text, options: { color: COLORS.white, fontSize: 18 } }
    ], { x: 0.8, y: 1.4 + (i * 0.7), w: 8.5, h: 0.6 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.5, y: 4.3, w: 9, h: 0.9,
    fill: { color: COLORS.bgMedium },
    line: { color: COLORS.red, width: 0, dashType: 'solid' }
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.5, y: 4.3, w: 0.08, h: 0.9,
    fill: { color: COLORS.red }
  });
  slide.addText([
    { text: 'Every day you wait costs you ', options: { color: COLORS.white } },
    { text: '$1,880', options: { color: COLORS.gold, bold: true } },
    { text: ' per 1,000 cases', options: { color: COLORS.white } }
  ], { x: 0.8, y: 4.45, w: 8.5, h: 0.6, fontSize: 16 });

  // SLIDE 3: Hidden Costs Table
  console.log('Creating Slide 3: Hidden Costs...');
  slide = addDarkSlide();
  slide.addText('What Bad Case Management Actually Costs You', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 28, color: COLORS.white, bold: true
  });
  slide.addText('Per 1,000 active cases annually', {
    x: 0.5, y: 1.0, w: 9, h: 0.4,
    fontSize: 14, color: COLORS.lightGray
  });
  const tableData = [
    [{ text: 'Cost Category', options: { fill: { color: COLORS.gold }, color: COLORS.bgDark, bold: true } },
     { text: 'Annual Cost', options: { fill: { color: COLORS.gold }, color: COLORS.bgDark, bold: true } }],
    ['Extended claim duration', '$225,000'],
    ['Compliance breaches', '$96,000'],
    ['Dispute escalations', '$112,000'],
    ['Administrative overhead', '$255,000'],
    [{ text: 'TOTAL PREVENTABLE LOSSES', options: { fill: { color: COLORS.red }, color: COLORS.white, bold: true } },
     { text: '$688,000/year', options: { fill: { color: COLORS.red }, color: COLORS.white, bold: true } }]
  ];
  slide.addTable(tableData, {
    x: 1, y: 1.5, w: 8, h: 3,
    border: { pt: 1, color: '333333' },
    fill: { color: COLORS.bgMedium },
    color: COLORS.white,
    fontSize: 16,
    align: 'left',
    valign: 'middle',
    colW: [5.5, 2.5]
  });

  // SLIDE 4: Why Traditional Fails
  console.log('Creating Slide 4: Why Traditional Fails...');
  slide = addDarkSlide();
  slide.addText('Spreadsheets and Legacy Systems Won\'t Save You', {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 28, color: COLORS.white, bold: true
  });
  const failures = [
    'Generic case management = generic outcomes',
    'No WorkSafe Victoria specialization',
    'Reactive, not predictive',
    'Zero AI intelligence',
    'Manual compliance tracking = human error'
  ];
  failures.forEach((f, i) => {
    slide.addText([
      { text: 'X  ', options: { color: COLORS.red, bold: true, fontSize: 20 } },
      { text: f, options: { color: COLORS.white, fontSize: 18 } }
    ], { x: 0.8, y: 1.4 + (i * 0.65), w: 8.5, h: 0.6 });
  });

  // SLIDE 5: Solution Intro
  console.log('Creating Slide 5: Solution Intro...');
  slide = addDarkSlide();
  slide.addText('INTRODUCING', {
    x: 0.5, y: 1.3, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.lightGray, align: 'center', charSpacing: 5
  });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 56, color: COLORS.gold, bold: true, align: 'center', charSpacing: 8
  });
  slide.addText('AI-Powered Claims Intelligence Built for WorkSafe Victoria', {
    x: 0.5, y: 2.9, w: 9, h: 0.5,
    fontSize: 20, color: COLORS.white, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 2.5, y: 3.7, w: 5, h: 0.8,
    fill: { color: COLORS.bgMedium },
    line: { color: COLORS.gold, width: 2 }
  });
  slide.addText('No Worker Lost in the System', {
    x: 2.5, y: 3.85, w: 5, h: 0.5,
    fontSize: 18, color: COLORS.gold, bold: true, align: 'center'
  });

  // SLIDE 6: Value Stack 1
  console.log('Creating Slide 6: Value Stack 1...');
  slide = addDarkSlide();
  slide.addText('The Complete Claims Intelligence Platform', {
    x: 0.5, y: 0.3, w: 7, h: 0.6,
    fontSize: 24, color: COLORS.gold, bold: true
  });
  slide.addText('Value: $150,000/year', {
    x: 7, y: 0.35, w: 2.5, h: 0.5,
    fontSize: 18, color: COLORS.green, bold: true, align: 'right'
  });
  const stack1 = [
    { title: 'AI Case Summaries', desc: 'Saves 2+ hours per case review with intelligent synthesis' },
    { title: 'Automated Compliance Engine', desc: '73+ WorkSafe rules monitored 24/7 automatically' },
    { title: 'Predictive Risk Detection', desc: 'Catch problems before they explode into costly disputes' },
    { title: 'Evidence-Ready Documentation', desc: 'Dispute-proof audit trails generated automatically' }
  ];
  stack1.forEach((item, i) => {
    const y = 1.0 + (i * 0.85);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: COLORS.bgMedium } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: COLORS.gold } });
    slide.addText(item.title, { x: 0.8, y: y + 0.08, w: 8.5, h: 0.35, fontSize: 16, color: COLORS.white, bold: true });
    slide.addText(item.desc, { x: 0.8, y: y + 0.4, w: 8.5, h: 0.3, fontSize: 12, color: COLORS.lightGray });
  });

  // SLIDE 7: Value Stack 2
  console.log('Creating Slide 7: Value Stack 2...');
  slide = addDarkSlide();
  slide.addText('Plus Everything Your Team Needs', {
    x: 0.5, y: 0.3, w: 7, h: 0.6,
    fontSize: 24, color: COLORS.gold, bold: true
  });
  slide.addText('Value: $100,000/year', {
    x: 7, y: 0.35, w: 2.5, h: 0.5,
    fontSize: 18, color: COLORS.green, bold: true, align: 'right'
  });
  const stack2 = [
    { title: 'Intelligent Action Queue', desc: 'Prioritized daily tasks - never miss a critical deadline' },
    { title: 'Medical Certificate Automation', desc: 'Auto-parse, auto-track, auto-alert on expiry' },
    { title: 'RTW Planning Engine', desc: 'Evidence-based return-to-work plans that actually work' },
    { title: 'Multi-Stakeholder Dashboards', desc: 'Employer, case manager, and supervisor views' }
  ];
  stack2.forEach((item, i) => {
    const y = 1.0 + (i * 0.85);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: COLORS.bgMedium } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: COLORS.gold } });
    slide.addText(item.title, { x: 0.8, y: y + 0.08, w: 8.5, h: 0.35, fontSize: 16, color: COLORS.white, bold: true });
    slide.addText(item.desc, { x: 0.8, y: y + 0.4, w: 8.5, h: 0.3, fontSize: 12, color: COLORS.lightGray });
  });

  // SLIDE 8: Value Stack 3 - Revenue
  console.log('Creating Slide 8: Revenue Generator...');
  slide = addDarkSlide();
  slide.addText('And The Revenue Generator', {
    x: 0.5, y: 0.3, w: 7, h: 0.6,
    fontSize: 24, color: COLORS.gold, bold: true
  });
  slide.addText('Value: $200,000/year', {
    x: 7, y: 0.35, w: 2.5, h: 0.5,
    fontSize: 18, color: COLORS.green, bold: true, align: 'right'
  });
  const stack3 = [
    { title: 'White-Label Employer Licensing', desc: 'Your brand, your pricing, your revenue stream' },
    { title: 'Per-Case SaaS Revenue', desc: '$50/case to employers - you keep the margin' },
    { title: 'Partner Analytics Portal', desc: 'Portfolio-wide insights and performance metrics' },
    { title: 'Dedicated Success Manager', desc: 'Your strategic partner in maximizing ROI' }
  ];
  stack3.forEach((item, i) => {
    const y = 1.0 + (i * 0.85);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: '0D2818' } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: COLORS.green } });
    slide.addText(item.title, { x: 0.8, y: y + 0.08, w: 8.5, h: 0.35, fontSize: 16, color: COLORS.white, bold: true });
    slide.addText(item.desc, { x: 0.8, y: y + 0.4, w: 8.5, h: 0.3, fontSize: 12, color: COLORS.lightGray });
  });

  // SLIDE 9: Total Value
  console.log('Creating Slide 9: Total Value...');
  slide = addDarkSlide();
  slide.addText('TOTAL VALUE', {
    x: 0.5, y: 1.2, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.lightGray, align: 'center', charSpacing: 4
  });
  slide.addText('$450,000', {
    x: 0.5, y: 1.6, w: 9, h: 1.2,
    fontSize: 72, color: COLORS.gold, bold: true, align: 'center'
  });
  slide.addText('per year in platform value', {
    x: 0.5, y: 2.8, w: 9, h: 0.5,
    fontSize: 20, color: COLORS.white, align: 'center'
  });
  // Value stack boxes
  const valueBoxes = [
    { label: 'Claims Intelligence', val: '$150K' },
    { label: 'Team Tools', val: '$100K' },
    { label: 'Revenue Engine', val: '$200K' }
  ];
  valueBoxes.forEach((box, i) => {
    const x = 1.5 + (i * 2.5);
    slide.addShape(pptx.shapes.RECTANGLE, { x, y: 3.5, w: 2.2, h: 0.9, fill: { color: COLORS.bgMedium } });
    slide.addText(box.label, { x, y: 3.55, w: 2.2, h: 0.4, fontSize: 11, color: COLORS.lightGray, align: 'center' });
    slide.addText(box.val, { x, y: 3.9, w: 2.2, h: 0.45, fontSize: 18, color: COLORS.green, bold: true, align: 'center' });
  });

  // SLIDE 10: ROI Calculator
  console.log('Creating Slide 10: ROI Calculator...');
  slide = addDarkSlide();
  slide.addText('The Math That Makes This Obvious', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 26, color: COLORS.white, bold: true
  });
  slide.addText('1,000 Active Cases Scenario', {
    x: 0.5, y: 0.85, w: 9, h: 0.3,
    fontSize: 14, color: COLORS.lightGray
  });
  const roiRows = [
    { label: 'Claims duration reduction (15%)', amount: '$225,000', color: COLORS.green },
    { label: 'Admin efficiency gains (30%)', amount: '$255,000', color: COLORS.green },
    { label: 'Compliance breach reduction (80%)', amount: '$96,000', color: COLORS.green },
    { label: 'Dispute reduction (40%)', amount: '$112,000', color: COLORS.green },
    { label: 'TOTAL ANNUAL SAVINGS', amount: '$688,000', color: COLORS.gold, bold: true, topLine: true },
    { label: 'Your Investment', amount: '-$180,000', color: COLORS.red },
    { label: 'NET BENEFIT', amount: '$508,000', color: COLORS.gold, bold: true, topLine: true }
  ];
  roiRows.forEach((row, i) => {
    const y = 1.25 + (i * 0.45);
    if (row.topLine) {
      slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: y - 0.05, w: 6, h: 0.02, fill: { color: COLORS.gold } });
    }
    slide.addText(row.label, { x: 0.5, y, w: 4.5, h: 0.4, fontSize: 14, color: row.bold ? COLORS.gold : COLORS.lightGray, bold: row.bold });
    slide.addText(row.amount, { x: 5, y, w: 1.5, h: 0.4, fontSize: 14, color: row.color, bold: true, align: 'right' });
  });
  // ROI Box
  slide.addShape(pptx.shapes.RECTANGLE, { x: 7, y: 1.8, w: 2.5, h: 2, fill: { color: '0D2818' }, line: { color: COLORS.green, width: 2 } });
  slide.addText('282%', { x: 7, y: 2.1, w: 2.5, h: 1, fontSize: 48, color: COLORS.green, bold: true, align: 'center' });
  slide.addText('Return on Investment', { x: 7, y: 3.1, w: 2.5, h: 0.4, fontSize: 14, color: COLORS.white, align: 'center' });

  // SLIDE 11: Revenue Opportunity
  console.log('Creating Slide 11: Revenue Opportunity...');
  slide = addDarkSlide();
  slide.addText('Turn Cost Center Into Profit Center', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 28, color: COLORS.green, bold: true
  });
  // Formula boxes
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 1.3, w: 9, h: 1, fill: { color: COLORS.bgMedium } });
  slide.addText('1,000 employer clients x $50/case x 5 cases avg =', { x: 0.7, y: 1.4, w: 8.5, h: 0.4, fontSize: 16, color: COLORS.white });
  slide.addText('$250,000 new annual revenue', { x: 0.7, y: 1.8, w: 8.5, h: 0.4, fontSize: 22, color: COLORS.green, bold: true });

  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 2.5, w: 9, h: 1, fill: { color: COLORS.bgMedium } });
  slide.addText('5,000 employer clients x $50/case x 5 cases avg =', { x: 0.7, y: 2.6, w: 8.5, h: 0.4, fontSize: 16, color: COLORS.white });
  slide.addText('$1.25M new annual revenue', { x: 0.7, y: 3.0, w: 8.5, h: 0.4, fontSize: 22, color: COLORS.green, bold: true });

  slide.addText([
    { text: 'Margin after licensing: ', options: { color: COLORS.lightGray, fontSize: 16 } },
    { text: '50-60%', options: { color: COLORS.gold, fontSize: 32, bold: true } }
  ], { x: 0.5, y: 3.7, w: 9, h: 0.6 });

  slide.addText('"Your competitors are already doing this"', {
    x: 0.5, y: 4.5, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.accent, italic: true
  });

  // SLIDE 12: Social Proof
  console.log('Creating Slide 12: Social Proof...');
  slide = addDarkSlide();
  slide.addText('Results From Early Partners', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 28, color: COLORS.white, bold: true
  });
  const stats = [
    { num: '174+', label: 'Active Cases Managed' },
    { num: '150+', label: 'AI Summaries Generated' },
    { num: '99%+', label: 'Platform Uptime' },
    { num: '7/7', label: 'Dashboard Features Passing' }
  ];
  stats.forEach((stat, i) => {
    const x = 0.5 + (i % 2) * 4.5;
    const y = 1.3 + Math.floor(i / 2) * 1.5;
    slide.addShape(pptx.shapes.RECTANGLE, { x, y, w: 4, h: 1.2, fill: { color: COLORS.bgMedium } });
    slide.addText(stat.num, { x, y: y + 0.15, w: 4, h: 0.6, fontSize: 40, color: COLORS.gold, bold: true, align: 'center' });
    slide.addText(stat.label, { x, y: y + 0.75, w: 4, h: 0.35, fontSize: 13, color: COLORS.lightGray, align: 'center' });
  });
  slide.addText('"Built and validated with real Australian claims data"', {
    x: 0.5, y: 4.5, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.green, italic: true, align: 'center'
  });

  // SLIDE 13: Risk Reversal
  console.log('Creating Slide 13: Risk Reversal...');
  slide = addDarkSlide();
  slide.addText('Zero Risk. Guaranteed.', {
    x: 0.5, y: 0.6, w: 9, h: 0.8,
    fontSize: 36, color: COLORS.green, bold: true, align: 'center'
  });
  const guarantees = ['90-day pilot program', 'Full data migration support', 'Dedicated implementation team'];
  guarantees.forEach((g, i) => {
    slide.addText([
      { text: '✓  ', options: { color: COLORS.green, fontSize: 22 } },
      { text: g, options: { color: COLORS.white, fontSize: 18 } }
    ], { x: 2.5, y: 1.6 + (i * 0.6), w: 5, h: 0.5 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 1.5, y: 3.3, w: 7, h: 1, fill: { color: '0D2818' }, line: { color: COLORS.green, width: 2 } });
  slide.addText([
    { text: 'If you don\'t see ', options: { color: COLORS.white } },
    { text: '20% improvement', options: { color: COLORS.green, bold: true } },
    { text: ' in case outcomes,\nwe\'ll refund your pilot fees. ', options: { color: COLORS.white } },
    { text: '100%.', options: { color: COLORS.green, bold: true } }
  ], { x: 1.7, y: 3.45, w: 6.6, h: 0.8, fontSize: 16, align: 'center' });
  slide.addText('"We win when you win"', {
    x: 0.5, y: 4.5, w: 9, h: 0.4,
    fontSize: 18, color: COLORS.gold, italic: true, align: 'center'
  });

  // SLIDE 14: Pricing
  console.log('Creating Slide 14: Pricing...');
  slide = addDarkSlide();
  slide.addText('Investment Options', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28, color: COLORS.white, bold: true
  });
  const tiers = [
    { name: 'STARTER', price: '$2,500', period: '/month', cases: '50 cases included', featured: false },
    { name: 'PROFESSIONAL', price: '$7,500', period: '/month', cases: '200 cases included', featured: true },
    { name: 'ENTERPRISE', price: '$15,000', period: '/month', cases: '500 cases included', featured: false },
    { name: 'UNLIMITED', price: 'Custom', period: 'pricing', cases: 'Unlimited cases', featured: false }
  ];
  tiers.forEach((tier, i) => {
    const x = 0.3 + (i * 2.4);
    slide.addShape(pptx.shapes.RECTANGLE, {
      x, y: 1.1, w: 2.2, h: 3,
      fill: { color: COLORS.bgMedium },
      line: tier.featured ? { color: COLORS.gold, width: 2 } : null
    });
    if (tier.featured) {
      slide.addShape(pptx.shapes.RECTANGLE, { x: x + 0.3, y: 1.2, w: 1.6, h: 0.35, fill: { color: COLORS.gold } });
      slide.addText('MOST POPULAR', { x: x + 0.3, y: 1.22, w: 1.6, h: 0.3, fontSize: 9, color: COLORS.bgDark, bold: true, align: 'center' });
    }
    slide.addText(tier.name, { x, y: tier.featured ? 1.65 : 1.4, w: 2.2, h: 0.4, fontSize: 12, color: COLORS.gold, align: 'center', charSpacing: 2 });
    slide.addText(tier.price, { x, y: tier.featured ? 2.1 : 1.85, w: 2.2, h: 0.6, fontSize: 28, color: COLORS.white, bold: true, align: 'center' });
    slide.addText(tier.period, { x, y: tier.featured ? 2.65 : 2.4, w: 2.2, h: 0.35, fontSize: 12, color: COLORS.lightGray, align: 'center' });
    slide.addText(tier.cases, { x, y: tier.featured ? 3.1 : 2.85, w: 2.2, h: 0.35, fontSize: 11, color: COLORS.green, align: 'center' });
  });
  slide.addText('"Most partners start Professional and upgrade within 6 months"', {
    x: 0.5, y: 4.4, w: 9, h: 0.4,
    fontSize: 14, color: COLORS.lightGray, italic: true, align: 'center'
  });

  // SLIDE 15: Urgency
  console.log('Creating Slide 15: Urgency...');
  slide = addDarkSlide();
  slide.addText('Why Now?', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32, color: COLORS.accent, bold: true
  });
  const urgencyPoints = [
    { text: 'WorkSafe Victoria enforcement ', highlight: 'increasing' },
    { text: 'AI adoption accelerating - ', highlight: 'first-mover advantage' },
    { text: 'Only accepting ', highlight: '5 new insurance partners', suffix: ' this quarter' },
    { text: 'Your competitors are evaluating this ', highlight: 'right now' }
  ];
  urgencyPoints.forEach((p, i) => {
    const textParts = [
      { text: '▶  ', options: { color: COLORS.accent } },
      { text: p.text, options: { color: COLORS.white } },
      { text: p.highlight, options: { color: COLORS.gold, bold: true } }
    ];
    if (p.suffix) textParts.push({ text: p.suffix, options: { color: COLORS.white } });
    slide.addText(textParts, { x: 0.8, y: 1.3 + (i * 0.65), w: 8.5, h: 0.5, fontSize: 17 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 4, w: 9, h: 0.9, fill: { color: COLORS.bgMedium } });
  slide.addText([
    { text: 'The question isn\'t IF you\'ll adopt AI claims management - it\'s whether you\'ll ', options: { color: COLORS.white } },
    { text: 'lead or follow', options: { color: COLORS.gold, bold: true } }
  ], { x: 0.7, y: 4.2, w: 8.6, h: 0.5, fontSize: 15, align: 'center' });

  // SLIDE 16: Next Steps
  console.log('Creating Slide 16: Next Steps...');
  slide = addDarkSlide();
  slide.addText('Your Path Forward', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 30, color: COLORS.gold, bold: true
  });
  const steps = [
    { num: '1', title: '30-Minute Discovery Call', desc: 'This week - understand your portfolio challenges' },
    { num: '2', title: 'Custom ROI Analysis', desc: 'Tailored projections for your specific portfolio' },
    { num: '3', title: '90-Day Pilot Program', desc: 'Start with 100 cases - see results before committing' },
    { num: '4', title: 'Full Rollout', desc: 'Scale with dedicated success team support' }
  ];
  steps.forEach((step, i) => {
    const y = 1.0 + (i * 0.8);
    slide.addShape(pptx.shapes.OVAL, { x: 0.5, y, w: 0.5, h: 0.5, fill: { color: COLORS.gold } });
    slide.addText(step.num, { x: 0.5, y: y + 0.05, w: 0.5, h: 0.4, fontSize: 18, color: COLORS.bgDark, bold: true, align: 'center' });
    slide.addText(step.title, { x: 1.2, y, w: 8, h: 0.35, fontSize: 18, color: COLORS.white, bold: true });
    slide.addText(step.desc, { x: 1.2, y: y + 0.35, w: 8, h: 0.3, fontSize: 13, color: COLORS.lightGray });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 1.5, y: 4.3, w: 7, h: 0.7, fill: { color: COLORS.gold } });
  slide.addText('Book Your Discovery Call Today', { x: 1.5, y: 4.4, w: 7, h: 0.5, fontSize: 20, color: COLORS.bgDark, bold: true, align: 'center' });

  // SLIDE 17: Contact
  console.log('Creating Slide 17: Contact...');
  slide = addDarkSlide();
  slide.addText('Let\'s Talk', {
    x: 0.5, y: 1.2, w: 9, h: 0.8,
    fontSize: 52, color: COLORS.gold, bold: true, align: 'center'
  });
  slide.addText('Schedule a call or reach out directly', {
    x: 0.5, y: 2.1, w: 9, h: 0.4,
    fontSize: 18, color: COLORS.white, align: 'center'
  });
  slide.addText('partners@preventli.com.au', {
    x: 0.5, y: 2.6, w: 9, h: 0.5,
    fontSize: 22, color: COLORS.gold, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2, y: 3.3, w: 6, h: 0.8, fill: { color: COLORS.bgMedium } });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2, y: 3.3, w: 0.08, h: 0.8, fill: { color: COLORS.red } });
  slide.addText([
    { text: 'Every week you wait = ', options: { color: COLORS.white } },
    { text: '$13,000+', options: { color: COLORS.red, bold: true } },
    { text: ' in preventable losses', options: { color: COLORS.white } }
  ], { x: 2.2, y: 3.5, w: 5.6, h: 0.4, fontSize: 15 });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 4.4, w: 9, h: 0.5,
    fontSize: 24, color: COLORS.gold, bold: true, align: 'center', charSpacing: 5
  });

  // Save presentation
  const outputPath = path.join(__dirname, 'Preventli-Insurance-Partners.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\n✓ Presentation saved: ${outputPath}`);
  console.log('  17 slides created in Alex Hormozi style');
}

createPresentation().catch(console.error);
