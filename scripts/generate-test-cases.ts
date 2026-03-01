/**
 * Generate realistic test cases for Preventli/GPNet3
 * Injects directly into Freshdesk with cases at various workflow stages
 */

const FRESHDESK_DOMAIN = process.env.FRESHDESK_DOMAIN || 'gpnet';
const FRESHDESK_API_KEY = process.env.FRESHDESK_API_KEY;

if (!FRESHDESK_API_KEY) {
  console.error('FRESHDESK_API_KEY required');
  process.exit(1);
}

const BASE_URL = `https://${FRESHDESK_DOMAIN}.freshdesk.com/api/v2`;
const AUTH_HEADER = `Basic ${Buffer.from(`${FRESHDESK_API_KEY}:X`).toString('base64')}`;

// Australian names for realism
const FIRST_NAMES = ['James', 'Sarah', 'Michael', 'Emma', 'Daniel', 'Jessica', 'David', 'Emily', 'Luke', 'Olivia', 'Ryan', 'Sophie', 'Nathan', 'Chloe', 'Chris', 'Hannah', 'Matt', 'Grace', 'Tom', 'Mia'];
const LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson', 'Thompson', 'Walker', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Young', 'King', 'Wright', 'Hall'];

// Test employers
const EMPLOYERS = [
  { name: 'Symmetry HR', domain: 'symmetryhr.com.au', industry: 'HR Services' },
  { name: 'BuildRight Construction', domain: 'buildright.com.au', industry: 'Construction' },
  { name: 'Fresh Foods Distribution', domain: 'freshfoods.com.au', industry: 'Warehousing' },
  { name: 'Metro Transport Services', domain: 'metrotransport.com.au', industry: 'Transport' },
  { name: 'Coastal Care Aged Services', domain: 'coastalcare.com.au', industry: 'Healthcare' },
];

// Injury types with realistic scenarios
const INJURY_SCENARIOS = [
  { type: 'Back strain', cause: 'lifting heavy boxes in warehouse', restrictions: 'No lifting over 5kg, sit/stand as needed' },
  { type: 'Shoulder injury', cause: 'repetitive overhead work', restrictions: 'No overhead reaching, limit arm use' },
  { type: 'Knee injury', cause: 'slip on wet floor', restrictions: 'No prolonged standing, use seated duties' },
  { type: 'Hand laceration', cause: 'cut while using box cutter', restrictions: 'Light duties only, no manual handling' },
  { type: 'Ankle sprain', cause: 'stepped off loading dock', restrictions: 'Seated duties only, no walking distances' },
  { type: 'Wrist strain', cause: 'repetitive data entry', restrictions: 'Limited keyboard use, regular breaks' },
  { type: 'Neck pain', cause: 'poor workstation ergonomics', restrictions: 'Ergonomic assessment required, limit screen time' },
  { type: 'Hearing damage', cause: 'prolonged noise exposure', restrictions: 'Mandatory hearing protection, audiometry review' },
];

// Workflow stages with expected state
const WORKFLOW_STAGES = {
  INTAKE: { week: 0, status: 2, priority: 3, description: 'Initial intake - awaiting documentation' },
  ASSESSMENT: { week: 1, status: 2, priority: 3, description: 'Worker assessment in progress' },
  MEDICAL_REVIEW: { week: 2, status: 3, priority: 2, description: 'Awaiting GP certificate review' },
  RTW_PLANNING: { week: 4, status: 2, priority: 2, description: 'Return-to-work plan being developed' },
  EARLY_RTW: { week: 6, status: 2, priority: 2, description: 'Modified duties commenced' },
  MID_RECOVERY: { week: 12, status: 2, priority: 1, description: 'Progress review checkpoint' },
  EXTENDED: { week: 18, status: 2, priority: 3, description: 'Extended case - escalation review' },
  COMPLEX: { week: 26, status: 3, priority: 4, description: 'Complex case - specialist review' },
  CLOSED_RESOLVED: { week: 8, status: 5, priority: 1, description: 'Full duties resumed' },
  CLOSED_SETTLED: { week: 30, status: 5, priority: 1, description: 'Claim finalized' },
};

type CaseType = 'injury' | 'new_starter' | 'exit' | 'preventative' | 'mental_health';

interface ConversationNote {
  body: string;
  incoming: boolean;
  createdAt: Date;
}

interface TestCase {
  type: CaseType;
  stage: keyof typeof WORKFLOW_STAGES;
  worker: { firstName: string; lastName: string; email: string };
  employer: typeof EMPLOYERS[0];
  scenario?: typeof INJURY_SCENARIOS[0];
  injuryDate?: Date;
  conversations: ConversationNote[];
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateWorker() {
  const firstName = randomFrom(FIRST_NAMES);
  const lastName = randomFrom(LAST_NAMES);
  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@testworker.com.au`,
  };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function generateConversationsForStage(
  stage: keyof typeof WORKFLOW_STAGES,
  worker: TestCase['worker'],
  employer: typeof EMPLOYERS[0],
  scenario: typeof INJURY_SCENARIOS[0] | undefined,
  injuryDate: Date
): ConversationNote[] {
  const notes: ConversationNote[] = [];
  const stageInfo = WORKFLOW_STAGES[stage];
  const weeksIn = stageInfo.week;

  notes.push({
    body: `New injury report for ${worker.firstName} ${worker.lastName} at ${employer.name}.\n\nInjury: ${scenario?.type || 'Workplace injury'}\nCause: ${scenario?.cause || 'Work-related incident'}\nDate of injury: ${injuryDate.toLocaleDateString('en-AU')}\n\nPlease advise on next steps.`,
    incoming: true,
    createdAt: injuryDate,
  });

  notes.push({
    body: `Thank you for reporting this injury. We have created case reference for ${worker.firstName} ${worker.lastName}.\n\nNext steps:\n1. Please provide GP certificate\n2. Complete injury notification form\n3. We will contact the worker to arrange assessment`,
    incoming: false,
    createdAt: daysAgo(Math.max(0, weeksIn * 7 - 1)),
  });

  if (weeksIn >= 1) {
    notes.push({
      body: `Assessment completed for ${worker.firstName}.\n\nCurrent restrictions: ${scenario?.restrictions || 'To be determined'}\n\nGP certificate received - valid for 2 weeks.\nWorker is motivated to return to work.`,
      incoming: false,
      createdAt: daysAgo(Math.max(0, weeksIn * 7 - 7)),
    });
  }

  if (weeksIn >= 2) {
    notes.push({
      body: `Hi team,\n\nJust following up on ${worker.firstName}'s case. When can we expect the RTW plan?\n\nThanks,\n${employer.name} HR`,
      incoming: true,
      createdAt: daysAgo(Math.max(0, weeksIn * 7 - 10)),
    });

    notes.push({
      body: `RTW plan is being drafted. We're coordinating with the treating GP to ensure restrictions are appropriate for available duties.\n\nWill send draft by end of week.`,
      incoming: false,
      createdAt: daysAgo(Math.max(0, weeksIn * 7 - 11)),
    });
  }

  if (weeksIn >= 4) {
    notes.push({
      body: `RTW Plan approved for ${worker.firstName} ${worker.lastName}.\n\nStart date: ${daysAgo(Math.max(0, weeksIn * 7 - 28)).toLocaleDateString('en-AU')}\nHours: 4 hours/day, 3 days/week\nDuties: ${scenario?.restrictions || 'Modified duties as per GP'}\n\nFirst review scheduled in 2 weeks.`,
      incoming: false,
      createdAt: daysAgo(Math.max(0, weeksIn * 7 - 25)),
    });
  }

  if (weeksIn >= 6) {
    notes.push({
      body: `Week 6 progress update:\n\n${worker.firstName} is progressing well on modified duties. Increased to 6 hours/day.\n\nNo pain reported. GP review scheduled next week to assess upgrade to full duties.`,
      incoming: false,
      createdAt: daysAgo(Math.max(0, weeksIn * 7 - 42)),
    });
  }

  if (weeksIn >= 12) {
    notes.push({
      body: `12-week review completed.\n\n${worker.firstName} has been on modified duties for 12 weeks. Progress has plateaued.\n\nRecommendation: Specialist referral for further assessment.\n\nAwaiting employer approval for specialist appointment.`,
      incoming: false,
      createdAt: daysAgo(Math.max(0, weeksIn * 7 - 84)),
    });
  }

  if (weeksIn >= 18) {
    notes.push({
      body: `ESCALATION: ${worker.firstName} ${worker.lastName} - Week 18\n\nCase has exceeded standard recovery timeframe. Specialist assessment indicates potential permanent restrictions.\n\nOptions being discussed:\n1. Permanent modified role\n2. Redeployment to alternative position\n3. WorkCover claim finalization\n\nMeeting scheduled with employer and insurer.`,
      incoming: false,
      createdAt: daysAgo(Math.max(0, weeksIn * 7 - 126)),
    });
  }

  if (stage === 'CLOSED_RESOLVED') {
    notes.push({
      body: `CASE CLOSED - Full Recovery\n\n${worker.firstName} ${worker.lastName} has returned to full duties as of ${daysAgo(7).toLocaleDateString('en-AU')}.\n\nNo ongoing restrictions. GP has provided clearance.\n\nCase duration: ${weeksIn} weeks\nOutcome: Successful return to work`,
      incoming: false,
      createdAt: daysAgo(3),
    });
  }

  if (stage === 'CLOSED_SETTLED') {
    notes.push({
      body: `CASE CLOSED - Settlement\n\n${worker.firstName} ${worker.lastName} case has been finalized.\n\nOutcome: Lump sum settlement agreed\nPermanent restrictions: ${scenario?.restrictions || 'As per IME report'}\n\nAll documentation archived. No further action required.`,
      incoming: false,
      createdAt: daysAgo(3),
    });
  }

  return notes;
}

function generateTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  // Injury cases at each workflow stage (15 cases)
  const injuryStages: (keyof typeof WORKFLOW_STAGES)[] = [
    'INTAKE', 'INTAKE',
    'ASSESSMENT', 'ASSESSMENT',
    'MEDICAL_REVIEW',
    'RTW_PLANNING', 'RTW_PLANNING',
    'EARLY_RTW', 'EARLY_RTW', 'EARLY_RTW',
    'MID_RECOVERY', 'MID_RECOVERY',
    'EXTENDED',
    'COMPLEX',
    'CLOSED_RESOLVED',
  ];

  for (const stage of injuryStages) {
    const worker = generateWorker();
    const employer = randomFrom(EMPLOYERS);
    const scenario = randomFrom(INJURY_SCENARIOS);
    const weeksAgo = WORKFLOW_STAGES[stage].week;
    
    cases.push({
      type: 'injury',
      stage,
      worker,
      employer,
      scenario,
      injuryDate: daysAgo(weeksAgo * 7),
      conversations: generateConversationsForStage(stage, worker, employer, scenario, daysAgo(weeksAgo * 7)),
    });
  }

  // New starter cases (12 cases)
  for (let i = 0; i < 12; i++) {
    const worker = generateWorker();
    const employer = randomFrom(EMPLOYERS);
    const stage = i < 4 ? 'INTAKE' : i < 8 ? 'ASSESSMENT' : 'CLOSED_RESOLVED';
    const positions = ['Warehouse Operator', 'Driver', 'Office Admin', 'Site Supervisor'];
    
    cases.push({
      type: 'new_starter',
      stage: stage as keyof typeof WORKFLOW_STAGES,
      worker,
      employer,
      conversations: [{
        body: `Pre-employment health check request for ${worker.firstName} ${worker.lastName}.\n\nPosition: ${positions[i % 4]}\nStart date: ${daysAgo(-14 + i).toLocaleDateString('en-AU')}\n\nPlease arrange assessment.`,
        incoming: true,
        createdAt: daysAgo(7 + i),
      }],
    });
  }

  // Exit health checks (8 cases)
  for (let i = 0; i < 8; i++) {
    const worker = generateWorker();
    const employer = randomFrom(EMPLOYERS);
    const roles = ['Operator', 'Driver', 'Technician', 'Supervisor'];
    
    cases.push({
      type: 'exit',
      stage: i < 3 ? 'INTAKE' : 'CLOSED_RESOLVED',
      worker,
      employer,
      conversations: [{
        body: `Exit health check required for ${worker.firstName} ${worker.lastName}.\n\nLast day: ${daysAgo(-7 + i).toLocaleDateString('en-AU')}\nYears of service: ${2 + i}\nRole: ${roles[i % 4]}\n\nPlease arrange clearance assessment.`,
        incoming: true,
        createdAt: daysAgo(14 - i),
      }],
    });
  }

  // Preventative checks (10 cases)
  for (let i = 0; i < 10; i++) {
    const worker = generateWorker();
    const employer = randomFrom(EMPLOYERS);
    const checkTypes = ['Annual Medical', 'Hearing Test', 'Skin Check', 'Drug & Alcohol', 'Fitness for Duty'];
    const checkType = checkTypes[i % 5];
    
    cases.push({
      type: 'preventative',
      stage: i < 4 ? 'INTAKE' : i < 7 ? 'ASSESSMENT' : 'CLOSED_RESOLVED',
      worker,
      employer,
      conversations: [{
        body: `${checkType} required for ${worker.firstName} ${worker.lastName}.\n\nDue date: ${daysAgo(-21 + i * 3).toLocaleDateString('en-AU')}\nLast check: ${daysAgo(365 + i * 10).toLocaleDateString('en-AU')}\n\nPlease schedule appointment.`,
        incoming: true,
        createdAt: daysAgo(10 - i),
      }],
    });
  }

  // Mental health cases (5 cases)
  const mentalHealthScenarios = [
    'Workplace stress claim - high workload reported',
    'Anxiety following workplace incident',
    'Depression - referred by EAP',
    'Bullying complaint - psychological impact',
    'PTSD - witnessed workplace accident',
  ];

  for (let i = 0; i < 5; i++) {
    const worker = generateWorker();
    const employer = randomFrom(EMPLOYERS);
    
    cases.push({
      type: 'mental_health',
      stage: i === 0 ? 'INTAKE' : i < 3 ? 'ASSESSMENT' : 'EXTENDED',
      worker,
      employer,
      conversations: [{
        body: `Mental health case referral for ${worker.firstName} ${worker.lastName}.\n\nConcern: ${mentalHealthScenarios[i]}\n\nGP has provided certificate. EAP sessions commenced.\n\nPlease advise on WorkCover process.`,
        incoming: true,
        createdAt: daysAgo(14 + i * 7),
      }],
    });
  }

  return cases;
}

async function freshdeskRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Freshdesk API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function createTicket(testCase: TestCase, index: number): Promise<number> {
  const stageInfo = WORKFLOW_STAGES[testCase.stage];
  const caseTypeLabel = testCase.type.replace('_', ' ').toUpperCase();
  
  const subject = `[TEST-${String(index).padStart(3, '0')}] ${caseTypeLabel}: ${testCase.worker.firstName} ${testCase.worker.lastName} - ${testCase.employer.name}`;
  
  const description = testCase.conversations[0]?.body || `Test case for ${testCase.worker.firstName} ${testCase.worker.lastName}`;

  const ticketData = {
    subject,
    description,
    email: testCase.worker.email,
    priority: stageInfo.priority,
    status: stageInfo.status,
    tags: ['test-data', testCase.type, testCase.stage.toLowerCase()],
    custom_fields: {
      cf_worker_first_name: testCase.worker.firstName,
      cf_workers_name: testCase.worker.lastName,
    },
  };

  const ticket = await freshdeskRequest('/tickets', 'POST', ticketData);
  console.log(`✓ Created ticket ${index}: ${subject.substring(0, 60)}... (ID: ${ticket.id})`);

  // Add conversation notes (skip first as it's the description)
  for (let i = 1; i < testCase.conversations.length; i++) {
    const note = testCase.conversations[i];
    try {
      await freshdeskRequest(`/tickets/${ticket.id}/notes`, 'POST', {
        body: note.body,
        incoming: note.incoming,
        private: false,
      });
      console.log(`  + Note ${i} added`);
    } catch (err: any) {
      console.error(`  ✗ Failed to add note ${i}: ${err.message}`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 150));
  }

  return ticket.id;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PREVENTLI TEST DATA GENERATOR');
  console.log('  Injecting realistic cases into Freshdesk');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const testCases = generateTestCases();
  
  console.log(`Generated ${testCases.length} test cases:\n`);
  console.log(`  📋 Injury cases:    ${testCases.filter(c => c.type === 'injury').length}`);
  console.log(`  🆕 New starters:    ${testCases.filter(c => c.type === 'new_starter').length}`);
  console.log(`  🚪 Exit checks:     ${testCases.filter(c => c.type === 'exit').length}`);
  console.log(`  🩺 Preventative:    ${testCases.filter(c => c.type === 'preventative').length}`);
  console.log(`  🧠 Mental health:   ${testCases.filter(c => c.type === 'mental_health').length}`);
  console.log('');

  console.log('By workflow stage:');
  const stageCounts: Record<string, number> = {};
  for (const tc of testCases) {
    stageCounts[tc.stage] = (stageCounts[tc.stage] || 0) + 1;
  }
  for (const [stage, count] of Object.entries(stageCounts).sort()) {
    const stageInfo = WORKFLOW_STAGES[stage as keyof typeof WORKFLOW_STAGES];
    const statusLabel = stageInfo.status === 5 ? '(closed)' : stageInfo.status === 3 ? '(pending)' : '(open)';
    console.log(`  Week ${String(stageInfo.week).padStart(2)}: ${stage.padEnd(16)} ${count} cases ${statusLabel}`);
  }
  console.log('');

  console.log('Injecting into Freshdesk...\n');

  const createdIds: number[] = [];
  let errors = 0;

  for (let i = 0; i < testCases.length; i++) {
    try {
      const id = await createTicket(testCases[i], i + 1);
      createdIds.push(id);
      // Rate limit - Freshdesk allows ~40 requests/minute on free tier
      await new Promise(r => setTimeout(r, 250));
    } catch (err: any) {
      console.error(`✗ Error creating case ${i + 1}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  COMPLETE: ${createdIds.length} tickets created, ${errors} errors`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nNext: Run Freshdesk sync to pull into GPNet3');
  console.log('  npm run sync:freshdesk');
}

main().catch(console.error);
