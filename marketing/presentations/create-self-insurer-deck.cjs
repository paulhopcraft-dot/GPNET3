const pptxgen = require('pptxgenjs');
const path = require('path');

// Hormozi color palette - dark and bold
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
  console.log('Creating Self-Insurer Presentation (Hormozi Style)...\n');

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Preventli - Self-Insurer Program';
  pptx.author = 'Preventli';
  pptx.subject = 'AI-Powered Claims Intelligence for Self-Insurers';
  pptx.company = 'Preventli';

  function addDarkSlide() {
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.bgDark };
    return slide;
  }

  // SLIDE 1: Title
  console.log('Creating Slide 1: Title...');
  let slide = addDarkSlide();
  slide.addText('How Self-Insurers Are Cutting\nClaims Costs by 22% While\nEliminating Compliance Risk', {
    x: 0.5, y: 1.3, w: 9, h: 2,
    fontSize: 34, color: COLORS.gold, bold: true, align: 'center', valign: 'middle', lineSpacing: 46
  });
  slide.addText('The AI-Powered Claims Platform Built for Self-Insured Organizations', {
    x: 0.5, y: 3.6, w: 9, h: 0.5,
    fontSize: 18, color: COLORS.white, align: 'center'
  });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 4.6, w: 9, h: 0.5,
    fontSize: 28, color: COLORS.gold, bold: true, align: 'center', charSpacing: 6
  });

  // SLIDE 2: Problem - Self-Insurer Specific
  console.log('Creating Slide 2: Problem...');
  slide = addDarkSlide();
  slide.addText('Self-Insurance Means Self-Responsibility', {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 30, color: COLORS.red, bold: true
  });
  const problems = [
    { stat: '100%', text: ' of compliance risk sits on YOUR shoulders' },
    { stat: '$18K-$1.8M', text: ' WorkSafe penalties per breach' },
    { stat: 'Every', text: ' missed certificate, late review, or documentation gap = liability' },
    { stat: 'Your', text: ' reputation and license on the line' }
  ];
  problems.forEach((p, i) => {
    slide.addText([
      { text: p.stat, options: { color: COLORS.gold, bold: true, fontSize: 20 } },
      { text: p.text, options: { color: COLORS.white, fontSize: 18 } }
    ], { x: 0.8, y: 1.4 + (i * 0.7), w: 8.5, h: 0.6 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 4.3, w: 9, h: 0.9, fill: { color: COLORS.bgMedium } });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 4.3, w: 0.08, h: 0.9, fill: { color: COLORS.red } });
  slide.addText([
    { text: 'Without proper systems, you\'re ', options: { color: COLORS.white } },
    { text: 'one audit away', options: { color: COLORS.red, bold: true } },
    { text: ' from serious consequences', options: { color: COLORS.white } }
  ], { x: 0.8, y: 4.45, w: 8.5, h: 0.6, fontSize: 16 });

  // SLIDE 3: Self-Insurer Specific Challenges
  console.log('Creating Slide 3: Challenges...');
  slide = addDarkSlide();
  slide.addText('The Self-Insurer\'s Unique Burden', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 28, color: COLORS.white, bold: true
  });
  const challenges = [
    { title: 'No Insurer Safety Net', desc: 'You ARE the claims team - no backup, no excuses' },
    { title: 'License Renewal Scrutiny', desc: 'WorkSafe audits your processes, not just outcomes' },
    { title: 'Complex Multi-Site Operations', desc: 'Workers across locations, inconsistent processes' },
    { title: 'Board & Exec Visibility', desc: 'Leadership demands real-time risk reporting' }
  ];
  challenges.forEach((c, i) => {
    const y = 1.2 + (i * 0.8);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.7, fill: { color: COLORS.bgMedium } });
    slide.addText(c.title, { x: 0.8, y: y + 0.1, w: 8.5, h: 0.3, fontSize: 16, color: COLORS.gold, bold: true });
    slide.addText(c.desc, { x: 0.8, y: y + 0.38, w: 8.5, h: 0.25, fontSize: 13, color: COLORS.lightGray });
  });

  // SLIDE 4: Why Spreadsheets Fail
  console.log('Creating Slide 4: Why Spreadsheets Fail...');
  slide = addDarkSlide();
  slide.addText('Your Current "System" Is a Ticking Time Bomb', {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 26, color: COLORS.white, bold: true
  });
  const failures = [
    'Spreadsheets don\'t send compliance alerts',
    'Email threads don\'t create audit trails',
    'Manual tracking = human error = penalties',
    'No predictive risk - you\'re always reacting',
    'WorkSafe won\'t accept "we forgot" as an excuse'
  ];
  failures.forEach((f, i) => {
    slide.addText([
      { text: 'X  ', options: { color: COLORS.red, bold: true, fontSize: 20 } },
      { text: f, options: { color: COLORS.white, fontSize: 17 } }
    ], { x: 0.8, y: 1.35 + (i * 0.6), w: 8.5, h: 0.55 });
  });

  // SLIDE 5: Solution Intro
  console.log('Creating Slide 5: Solution...');
  slide = addDarkSlide();
  slide.addText('INTRODUCING', {
    x: 0.5, y: 1.3, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.lightGray, align: 'center', charSpacing: 5
  });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 56, color: COLORS.gold, bold: true, align: 'center', charSpacing: 8
  });
  slide.addText('AI-Powered Claims Intelligence Built for Self-Insurers', {
    x: 0.5, y: 2.9, w: 9, h: 0.5,
    fontSize: 20, color: COLORS.white, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2.5, y: 3.7, w: 5, h: 0.8, fill: { color: COLORS.bgMedium }, line: { color: COLORS.gold, width: 2 } });
  slide.addText('Compliance Confidence. Cost Control. Complete Visibility.', {
    x: 2.5, y: 3.85, w: 5, h: 0.5,
    fontSize: 14, color: COLORS.gold, bold: true, align: 'center'
  });

  // SLIDE 6: Compliance Engine
  console.log('Creating Slide 6: Compliance Engine...');
  slide = addDarkSlide();
  slide.addText('Automated Compliance That Never Sleeps', {
    x: 0.5, y: 0.3, w: 7, h: 0.6,
    fontSize: 24, color: COLORS.gold, bold: true
  });
  slide.addText('License Protection', {
    x: 7, y: 0.35, w: 2.5, h: 0.5,
    fontSize: 16, color: COLORS.green, bold: true, align: 'right'
  });
  const compliance = [
    { title: '73+ WorkSafe Rules Monitored', desc: 'Every obligation tracked automatically - certificates, reviews, plans' },
    { title: 'Real-Time Compliance Dashboard', desc: 'See exactly where you stand across all cases, all sites' },
    { title: 'Predictive Alerts', desc: 'Know about issues BEFORE they become breaches' },
    { title: 'Audit-Ready Documentation', desc: 'Every action timestamped, attributed, and exportable' }
  ];
  compliance.forEach((item, i) => {
    const y = 1.0 + (i * 0.85);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: COLORS.bgMedium } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: COLORS.green } });
    slide.addText(item.title, { x: 0.8, y: y + 0.08, w: 8.5, h: 0.35, fontSize: 16, color: COLORS.white, bold: true });
    slide.addText(item.desc, { x: 0.8, y: y + 0.4, w: 8.5, h: 0.3, fontSize: 12, color: COLORS.lightGray });
  });

  // SLIDE 7: AI Intelligence
  console.log('Creating Slide 7: AI Intelligence...');
  slide = addDarkSlide();
  slide.addText('AI That Works as Hard as Your Team', {
    x: 0.5, y: 0.3, w: 7, h: 0.6,
    fontSize: 24, color: COLORS.gold, bold: true
  });
  slide.addText('70% Time Savings', {
    x: 7, y: 0.35, w: 2.5, h: 0.5,
    fontSize: 16, color: COLORS.green, bold: true, align: 'right'
  });
  const ai = [
    { title: 'Instant Case Summaries', desc: 'AI reads everything - certificates, notes, communications - synthesizes in seconds' },
    { title: 'Risk Detection', desc: 'Identifies deterioration, unsafe progressions, non-compliance before you do' },
    { title: 'RTW Plan Generation', desc: 'Evidence-based return-to-work plans tailored to each worker' },
    { title: 'Action Prioritization', desc: 'Know exactly what needs attention today, tomorrow, this week' }
  ];
  ai.forEach((item, i) => {
    const y = 1.0 + (i * 0.85);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: COLORS.bgMedium } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: COLORS.gold } });
    slide.addText(item.title, { x: 0.8, y: y + 0.08, w: 8.5, h: 0.35, fontSize: 16, color: COLORS.white, bold: true });
    slide.addText(item.desc, { x: 0.8, y: y + 0.4, w: 8.5, h: 0.3, fontSize: 12, color: COLORS.lightGray });
  });

  // SLIDE 8: Executive Visibility
  console.log('Creating Slide 8: Executive Visibility...');
  slide = addDarkSlide();
  slide.addText('Board-Ready Reporting in Real-Time', {
    x: 0.5, y: 0.3, w: 7, h: 0.6,
    fontSize: 24, color: COLORS.gold, bold: true
  });
  slide.addText('Governance Ready', {
    x: 7, y: 0.35, w: 2.5, h: 0.5,
    fontSize: 16, color: COLORS.blue, bold: true, align: 'right'
  });
  const reporting = [
    { title: 'Portfolio Health Dashboard', desc: 'Total cases, compliance status, risk levels - one glance' },
    { title: 'Trend Analysis', desc: 'Track claim duration, RTW rates, cost drivers over time' },
    { title: 'Site-by-Site Comparison', desc: 'Identify which locations need attention' },
    { title: 'Exportable Reports', desc: 'Board papers, audit submissions, management reviews' }
  ];
  reporting.forEach((item, i) => {
    const y = 1.0 + (i * 0.85);
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: COLORS.bgMedium } });
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: COLORS.blue } });
    slide.addText(item.title, { x: 0.8, y: y + 0.08, w: 8.5, h: 0.35, fontSize: 16, color: COLORS.white, bold: true });
    slide.addText(item.desc, { x: 0.8, y: y + 0.4, w: 8.5, h: 0.3, fontSize: 12, color: COLORS.lightGray });
  });

  // SLIDE 9: ROI Calculator
  console.log('Creating Slide 9: ROI...');
  slide = addDarkSlide();
  slide.addText('The Numbers Self-Insurers Care About', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 26, color: COLORS.white, bold: true
  });
  slide.addText('500 Active Claims Scenario', {
    x: 0.5, y: 0.85, w: 9, h: 0.3,
    fontSize: 14, color: COLORS.lightGray
  });
  const roi = [
    { label: 'Claims cost reduction (22%)', amount: '$396,000', color: COLORS.green },
    { label: 'Case manager efficiency (70%)', amount: '$175,000', color: COLORS.green },
    { label: 'Compliance breach prevention', amount: '$96,000', color: COLORS.green },
    { label: 'Dispute avoidance', amount: '$75,000', color: COLORS.green },
    { label: 'TOTAL ANNUAL BENEFIT', amount: '$742,000', color: COLORS.gold, bold: true, topLine: true },
    { label: 'Your Investment', amount: '-$90,000', color: COLORS.red },
    { label: 'NET SAVINGS', amount: '$652,000', color: COLORS.gold, bold: true, topLine: true }
  ];
  roi.forEach((row, i) => {
    const y = 1.2 + (i * 0.45);
    if (row.topLine) slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: y - 0.05, w: 6, h: 0.02, fill: { color: COLORS.gold } });
    slide.addText(row.label, { x: 0.5, y, w: 4.5, h: 0.4, fontSize: 14, color: row.bold ? COLORS.gold : COLORS.lightGray, bold: row.bold });
    slide.addText(row.amount, { x: 5, y, w: 1.5, h: 0.4, fontSize: 14, color: row.color, bold: true, align: 'right' });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 7, y: 1.8, w: 2.5, h: 2, fill: { color: '0D2818' }, line: { color: COLORS.green, width: 2 } });
  slide.addText('724%', { x: 7, y: 2.1, w: 2.5, h: 1, fontSize: 48, color: COLORS.green, bold: true, align: 'center' });
  slide.addText('Return on Investment', { x: 7, y: 3.1, w: 2.5, h: 0.4, fontSize: 14, color: COLORS.white, align: 'center' });

  // SLIDE 10: License Protection
  console.log('Creating Slide 10: License Protection...');
  slide = addDarkSlide();
  slide.addText('Protect What Matters Most: Your License', {
    x: 0.5, y: 0.5, w: 9, h: 0.7,
    fontSize: 28, color: COLORS.green, bold: true, align: 'center'
  });
  const license = [
    { stat: '100%', label: 'Compliance visibility across all obligations' },
    { stat: '7-Day', label: 'Advance warning on certificate expiries' },
    { stat: 'Zero', label: 'Missed deadlines with automated tracking' },
    { stat: 'Full', label: 'Audit trail for every decision and action' }
  ];
  license.forEach((item, i) => {
    const x = 0.5 + (i % 2) * 4.5;
    const y = 1.5 + Math.floor(i / 2) * 1.4;
    slide.addShape(pptx.shapes.RECTANGLE, { x, y, w: 4, h: 1.1, fill: { color: COLORS.bgMedium } });
    slide.addText(item.stat, { x, y: y + 0.15, w: 4, h: 0.5, fontSize: 36, color: COLORS.gold, bold: true, align: 'center' });
    slide.addText(item.label, { x, y: y + 0.7, w: 4, h: 0.35, fontSize: 12, color: COLORS.lightGray, align: 'center' });
  });
  slide.addText('Sleep better knowing your self-insurance license is protected', {
    x: 0.5, y: 4.5, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.white, italic: true, align: 'center'
  });

  // SLIDE 11: Social Proof
  console.log('Creating Slide 11: Social Proof...');
  slide = addDarkSlide();
  slide.addText('Built for Organizations Like Yours', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 28, color: COLORS.white, bold: true
  });
  const stats = [
    { num: '174+', label: 'Active Cases Managed' },
    { num: '99%+', label: 'Platform Uptime' },
    { num: '73+', label: 'Compliance Rules Automated' },
    { num: '150+', label: 'AI Summaries Generated' }
  ];
  stats.forEach((stat, i) => {
    const x = 0.5 + (i % 2) * 4.5;
    const y = 1.3 + Math.floor(i / 2) * 1.5;
    slide.addShape(pptx.shapes.RECTANGLE, { x, y, w: 4, h: 1.2, fill: { color: COLORS.bgMedium } });
    slide.addText(stat.num, { x, y: y + 0.15, w: 4, h: 0.6, fontSize: 40, color: COLORS.gold, bold: true, align: 'center' });
    slide.addText(stat.label, { x, y: y + 0.75, w: 4, h: 0.35, fontSize: 13, color: COLORS.lightGray, align: 'center' });
  });
  slide.addText('"Purpose-built for WorkSafe Victoria requirements"', {
    x: 0.5, y: 4.5, w: 9, h: 0.4,
    fontSize: 16, color: COLORS.green, italic: true, align: 'center'
  });

  // SLIDE 12: Risk Reversal
  console.log('Creating Slide 12: Risk Reversal...');
  slide = addDarkSlide();
  slide.addText('Zero Risk Implementation', {
    x: 0.5, y: 0.6, w: 9, h: 0.8,
    fontSize: 36, color: COLORS.green, bold: true, align: 'center'
  });
  const guarantees = ['Dedicated implementation team', 'Full data migration support', '90-day pilot with your real cases'];
  guarantees.forEach((g, i) => {
    slide.addText([
      { text: '✓  ', options: { color: COLORS.green, fontSize: 22 } },
      { text: g, options: { color: COLORS.white, fontSize: 18 } }
    ], { x: 2.5, y: 1.6 + (i * 0.6), w: 5, h: 0.5 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 1.5, y: 3.3, w: 7, h: 1, fill: { color: '0D2818' }, line: { color: COLORS.green, width: 2 } });
  slide.addText([
    { text: 'If you don\'t see ', options: { color: COLORS.white } },
    { text: 'measurable improvement', options: { color: COLORS.green, bold: true } },
    { text: ' in compliance and efficiency,\nwe\'ll refund your pilot investment. ', options: { color: COLORS.white } },
    { text: 'Simple.', options: { color: COLORS.green, bold: true } }
  ], { x: 1.7, y: 3.45, w: 6.6, h: 0.8, fontSize: 16, align: 'center' });

  // SLIDE 13: Pricing
  console.log('Creating Slide 13: Pricing...');
  slide = addDarkSlide();
  slide.addText('Investment Options for Self-Insurers', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28, color: COLORS.white, bold: true
  });
  const tiers = [
    { name: 'FOUNDATION', price: '$5,000', period: '/month', cases: '100 cases', featured: false },
    { name: 'GROWTH', price: '$10,000', period: '/month', cases: '300 cases', featured: true },
    { name: 'ENTERPRISE', price: '$18,000', period: '/month', cases: '600 cases', featured: false }
  ];
  tiers.forEach((tier, i) => {
    const x = 1 + (i * 3);
    slide.addShape(pptx.shapes.RECTANGLE, {
      x, y: 1.1, w: 2.7, h: 3,
      fill: { color: COLORS.bgMedium },
      line: tier.featured ? { color: COLORS.gold, width: 2 } : null
    });
    if (tier.featured) {
      slide.addShape(pptx.shapes.RECTANGLE, { x: x + 0.35, y: 1.2, w: 2, h: 0.35, fill: { color: COLORS.gold } });
      slide.addText('RECOMMENDED', { x: x + 0.35, y: 1.22, w: 2, h: 0.3, fontSize: 10, color: COLORS.bgDark, bold: true, align: 'center' });
    }
    slide.addText(tier.name, { x, y: tier.featured ? 1.7 : 1.5, w: 2.7, h: 0.4, fontSize: 14, color: COLORS.gold, align: 'center', charSpacing: 2 });
    slide.addText(tier.price, { x, y: tier.featured ? 2.2 : 2, w: 2.7, h: 0.6, fontSize: 32, color: COLORS.white, bold: true, align: 'center' });
    slide.addText(tier.period, { x, y: tier.featured ? 2.75 : 2.55, w: 2.7, h: 0.35, fontSize: 12, color: COLORS.lightGray, align: 'center' });
    slide.addText(tier.cases, { x, y: tier.featured ? 3.2 : 3, w: 2.7, h: 0.35, fontSize: 13, color: COLORS.green, align: 'center' });
  });
  slide.addText('All plans include: Implementation support | Training | Dedicated success manager', {
    x: 0.5, y: 4.4, w: 9, h: 0.4,
    fontSize: 12, color: COLORS.lightGray, align: 'center'
  });

  // SLIDE 14: Urgency
  console.log('Creating Slide 14: Urgency...');
  slide = addDarkSlide();
  slide.addText('Why Self-Insurers Are Moving Now', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 30, color: COLORS.accent, bold: true
  });
  const urgency = [
    { text: 'WorkSafe audits are ', highlight: 'increasing in frequency and rigor' },
    { text: 'License renewals require ', highlight: 'demonstrable compliance systems' },
    { text: 'Your competitors are ', highlight: 'already implementing AI solutions' },
    { text: 'Every day without proper tracking = ', highlight: 'accumulated risk' }
  ];
  urgency.forEach((p, i) => {
    slide.addText([
      { text: '▶  ', options: { color: COLORS.accent } },
      { text: p.text, options: { color: COLORS.white } },
      { text: p.highlight, options: { color: COLORS.gold, bold: true } }
    ], { x: 0.8, y: 1.3 + (i * 0.65), w: 8.5, h: 0.5, fontSize: 16 });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 4, w: 9, h: 0.9, fill: { color: COLORS.bgMedium } });
  slide.addText('Your self-insurance license is too valuable to risk with spreadsheets', {
    x: 0.7, y: 4.25, w: 8.6, h: 0.4, fontSize: 16, color: COLORS.white, align: 'center'
  });

  // SLIDE 15: Next Steps
  console.log('Creating Slide 15: Next Steps...');
  slide = addDarkSlide();
  slide.addText('Your Path to Compliance Confidence', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 30, color: COLORS.gold, bold: true
  });
  const steps = [
    { num: '1', title: 'Compliance Audit Call', desc: 'We\'ll assess your current gaps and risks (30 min)' },
    { num: '2', title: 'Custom Implementation Plan', desc: 'Tailored to your organization and case volume' },
    { num: '3', title: '90-Day Pilot', desc: 'Prove the value with your real cases and team' },
    { num: '4', title: 'Full Deployment', desc: 'Roll out across all sites with ongoing support' }
  ];
  steps.forEach((step, i) => {
    const y = 1.0 + (i * 0.8);
    slide.addShape(pptx.shapes.OVAL, { x: 0.5, y, w: 0.5, h: 0.5, fill: { color: COLORS.gold } });
    slide.addText(step.num, { x: 0.5, y: y + 0.05, w: 0.5, h: 0.4, fontSize: 18, color: COLORS.bgDark, bold: true, align: 'center' });
    slide.addText(step.title, { x: 1.2, y, w: 8, h: 0.35, fontSize: 18, color: COLORS.white, bold: true });
    slide.addText(step.desc, { x: 1.2, y: y + 0.35, w: 8, h: 0.3, fontSize: 13, color: COLORS.lightGray });
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 1.5, y: 4.3, w: 7, h: 0.7, fill: { color: COLORS.gold } });
  slide.addText('Book Your Compliance Audit Today', { x: 1.5, y: 4.4, w: 7, h: 0.5, fontSize: 20, color: COLORS.bgDark, bold: true, align: 'center' });

  // SLIDE 16: Contact
  console.log('Creating Slide 16: Contact...');
  slide = addDarkSlide();
  slide.addText('Let\'s Protect Your License', {
    x: 0.5, y: 1.2, w: 9, h: 0.8,
    fontSize: 48, color: COLORS.gold, bold: true, align: 'center'
  });
  slide.addText('Schedule your compliance audit call', {
    x: 0.5, y: 2.1, w: 9, h: 0.4,
    fontSize: 18, color: COLORS.white, align: 'center'
  });
  slide.addText('selfinsure@preventli.com.au', {
    x: 0.5, y: 2.6, w: 9, h: 0.5,
    fontSize: 22, color: COLORS.gold, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2, y: 3.3, w: 6, h: 0.8, fill: { color: COLORS.bgMedium } });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 2, y: 3.3, w: 0.08, h: 0.8, fill: { color: COLORS.red } });
  slide.addText([
    { text: 'Every compliance gap = ', options: { color: COLORS.white } },
    { text: '$18,000 - $1.8M', options: { color: COLORS.red, bold: true } },
    { text: ' potential penalty', options: { color: COLORS.white } }
  ], { x: 2.2, y: 3.5, w: 5.6, h: 0.4, fontSize: 15 });
  slide.addText('PREVENTLI', {
    x: 0.5, y: 4.4, w: 9, h: 0.5,
    fontSize: 24, color: COLORS.gold, bold: true, align: 'center', charSpacing: 5
  });

  // Save presentation
  const outputPath = path.join(__dirname, 'Preventli-Self-Insurers.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\n✓ Presentation saved: ${outputPath}`);
  console.log('  16 slides created in Alex Hormozi style');
}

createPresentation().catch(console.error);
