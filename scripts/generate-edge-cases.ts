/**
 * Generate edge case test scenarios for Preventli/GPNet3
 * Includes document handling, compliance issues, and error scenarios
 */

const FRESHDESK_DOMAIN = process.env.FRESHDESK_DOMAIN || 'gpnet';
const FRESHDESK_API_KEY = process.env.FRESHDESK_API_KEY;

if (!FRESHDESK_API_KEY) {
  console.error('FRESHDESK_API_KEY required');
  process.exit(1);
}

const BASE_URL = `https://${FRESHDESK_DOMAIN}.freshdesk.com/api/v2`;
const AUTH_HEADER = `Basic ${Buffer.from(`${FRESHDESK_API_KEY}:X`).toString('base64')}`;

// Edge case scenarios
const EDGE_CASES = [
  // Medical Certificate Issues
  {
    category: 'MEDCERT_UNREADABLE',
    subject: '[EDGE-001] Medical Certificate - Illegible scan',
    description: `Worker: Alex Murphy
Employer: TestCorp Industries
Injury Date: 15/02/2026

ATTACHED: Medical certificate scan (low quality, handwriting illegible)

Notes:
- GP handwriting cannot be read
- Dates appear to be present but unclear
- Cannot determine work restrictions
- Cannot identify treating doctor name

ACTION REQUIRED: Contact GP clinic for typed version.`,
    expectedBehavior: 'System should flag as "certificate unreadable" and prompt for re-upload or GP contact',
    tags: ['edge-case', 'medcert', 'unreadable'],
  },
  {
    category: 'MEDCERT_EXPIRED',
    subject: '[EDGE-002] Medical Certificate - Expired certificate submitted',
    description: `Worker: Jamie Chen
Employer: Metro Logistics
Injury Date: 01/12/2025

Certificate attached but EXPIRED:
- Certificate valid: 01/12/2025 to 15/12/2025
- Current date: 28/02/2026
- No updated certificate received

Worker claims still unfit for work but no current documentation.

ACTION REQUIRED: Request current certificate from worker/GP.`,
    expectedBehavior: 'System should detect expired cert dates and flag for follow-up, calculate days without valid certificate',
    tags: ['edge-case', 'medcert', 'expired'],
  },
  {
    category: 'MEDCERT_CONFLICTING',
    subject: '[EDGE-003] Medical Certificate - Conflicting restrictions',
    description: `Worker: Sam Williams
Employer: BuildQuick Construction
Injury Date: 10/01/2026

TWO certificates received with conflicting information:

Certificate 1 (Dr. Smith, 10/02/2026):
- Unfit for all work
- Review in 4 weeks

Certificate 2 (Dr. Jones, 12/02/2026):
- Fit for modified duties
- No lifting over 5kg
- 4 hours/day maximum

Which certificate takes precedence? Worker is confused.

ACTION REQUIRED: Clarify with both treating doctors or arrange IME.`,
    expectedBehavior: 'System should flag conflicting documents and require manual resolution, log both certificates',
    tags: ['edge-case', 'medcert', 'conflicting'],
  },
  {
    category: 'MEDCERT_FUTURE_DATE',
    subject: '[EDGE-004] Medical Certificate - Future dated certificate',
    description: `Worker: Taylor Brown
Employer: FreshMart Retail
Injury Date: 20/02/2026

Certificate received with FUTURE dates:
- Date issued: 15/03/2026 (THIS IS IN THE FUTURE)
- Valid from: 15/03/2026
- Valid to: 15/04/2026

This appears to be a data entry error by the GP clinic.

Current date is 28/02/2026.

ACTION REQUIRED: Contact GP to correct certificate dates.`,
    expectedBehavior: 'System should reject future-dated certificates and flag for correction',
    tags: ['edge-case', 'medcert', 'future-date'],
  },
  
  // Compliance Issues
  {
    category: 'COMPLIANCE_LODGEMENT_OVERDUE',
    subject: '[EDGE-005] Compliance - WorkCover lodgement overdue',
    description: `Worker: Morgan Lee
Employer: Coastal Services
Injury Date: 01/02/2026

COMPLIANCE ALERT:
- Injury reported to employer: 01/02/2026
- WorkCover claim lodgement deadline: 10 business days
- Today: 28/02/2026
- Status: NOT LODGED

Employer has not submitted WorkCover claim form.
This is a compliance breach.

RISK: Late lodgement penalties, coverage issues.

ACTION REQUIRED: Escalate to employer immediately.`,
    expectedBehavior: 'System should calculate days since injury, flag overdue lodgements, show compliance status as CRITICAL',
    tags: ['edge-case', 'compliance', 'overdue'],
  },
  {
    category: 'COMPLIANCE_MISSING_DOCUMENTS',
    subject: '[EDGE-006] Compliance - Missing mandatory documents',
    description: `Worker: Jordan Smith
Employer: Industrial Solutions
Injury Date: 05/02/2026

MISSING DOCUMENTS:
❌ Initial medical certificate
❌ Incident report form
❌ WorkCover claim form
✅ Employer notification received

Cannot proceed without mandatory documentation.
Multiple requests sent, no response.

Days since injury: 23
Document requests sent: 3
Last request: 20/02/2026

ACTION REQUIRED: Final notice to employer, consider escalation.`,
    expectedBehavior: 'System should track required documents per case type, calculate compliance percentage, auto-generate follow-up reminders',
    tags: ['edge-case', 'compliance', 'missing-docs'],
  },
  {
    category: 'COMPLIANCE_INCORRECT_JURISDICTION',
    subject: '[EDGE-007] Compliance - Wrong state jurisdiction',
    description: `Worker: Casey Roberts
Employer: National Freight (VIC office)
Injury Date: 18/02/2026

JURISDICTION ISSUE:
- Worker based in: NSW
- Employer registered in: VIC
- Injury occurred in: QLD (during work trip)
- Claim lodged with: WorkSafe VIC

This may be incorrect jurisdiction.
QLD or NSW WorkCover may be appropriate.

Need to determine:
1. Worker's usual state of employment
2. Where injury actually occurred
3. Employer's principal place of business

ACTION REQUIRED: Legal/compliance review of jurisdiction.`,
    expectedBehavior: 'System should flag multi-state situations and prompt for jurisdiction review',
    tags: ['edge-case', 'compliance', 'jurisdiction'],
  },

  // Matching/Identification Issues
  {
    category: 'MATCH_DUPLICATE_WORKER',
    subject: '[EDGE-008] Matching - Duplicate worker records',
    description: `New injury report received:

Worker: John Smith
DOB: 15/03/1985
Employer: ABC Company

ISSUE: Multiple existing records found:
1. John Smith (FD-44100) - ABC Company - Back injury 2024
2. John Smith (FD-45200) - ABC Company - Shoulder injury 2025
3. John A Smith (FD-46300) - ABC Corp - Knee injury 2025

Are these the same person? Different injuries for same worker?
Or different workers with same name?

Cannot auto-link without confirmation.

ACTION REQUIRED: Manual verification of worker identity.`,
    expectedBehavior: 'System should detect potential duplicates, present options to merge or keep separate, never auto-merge',
    tags: ['edge-case', 'matching', 'duplicate'],
  },
  {
    category: 'MATCH_NO_EMPLOYER',
    subject: '[EDGE-009] Matching - Cannot identify employer',
    description: `Incoming email from: injuredworker99@gmail.com
Subject: Need help with my injury claim

Body:
"Hi I hurt my back at work last week and my boss won't help me. 
I work at a warehouse. Can you help me with workcover?
My name is Dave."

MISSING INFORMATION:
- Full worker name: Unknown (only "Dave")
- Employer name: Unknown ("warehouse")
- Injury date: "Last week" (vague)
- Injury type: Back injury
- No phone number
- No employee ID

Cannot create case without employer identification.

ACTION REQUIRED: Reply requesting employer details.`,
    expectedBehavior: 'System should flag incomplete cases, generate templated response requesting missing info',
    tags: ['edge-case', 'matching', 'incomplete'],
  },
  {
    category: 'MATCH_WRONG_THREAD',
    subject: '[EDGE-010] Matching - Email reply to wrong case',
    description: `Email received in case FD-47135 (Daniel Young - Back Injury)

But email content mentions:
"Please find the hearing test results for Sarah Mitchell as requested."

This appears to be a MISDIRECTED EMAIL.
- Current case: Daniel Young
- Email refers to: Sarah Mitchell
- Content type: Hearing test (not related to back injury)

Sarah Mitchell exists in system: FD-47128

ACTION REQUIRED: Move email to correct case thread.`,
    expectedBehavior: 'System should detect content mismatch with case context, suggest re-routing',
    tags: ['edge-case', 'matching', 'misdirected'],
  },

  // Document Processing Issues
  {
    category: 'DOC_PASSWORD_PROTECTED',
    subject: '[EDGE-011] Document - Password protected PDF',
    description: `Worker: Riley Thompson
Employer: SecureTech Systems

Attachment received: medical_certificate.pdf

ERROR: Cannot open document - PASSWORD PROTECTED

Employer may have sent encrypted file.
Cannot extract certificate details.

ACTION REQUIRED: Request unprotected version or password.`,
    expectedBehavior: 'System should detect encrypted/password files and flag for manual handling',
    tags: ['edge-case', 'document', 'encrypted'],
  },
  {
    category: 'DOC_CORRUPT_FILE',
    subject: '[EDGE-012] Document - Corrupt file attachment',
    description: `Worker: Quinn Anderson
Employer: DataFlow Corp

Attachment received: injury_report.docx (245KB)

ERROR: File appears to be corrupt or truncated.
Cannot open in any application.

Original email shows attachment was 1.2MB.
Possible transmission error.

ACTION REQUIRED: Request file to be resent.`,
    expectedBehavior: 'System should validate file integrity, detect corrupt uploads, request re-upload',
    tags: ['edge-case', 'document', 'corrupt'],
  },
  {
    category: 'DOC_WRONG_FORMAT',
    subject: '[EDGE-013] Document - Unsupported file format',
    description: `Worker: Avery Wilson
Employer: DesignHub Creative

Attachment received: xray_scan.heic (iPhone image format)

System cannot process .heic files.
Need conversion to standard format (PDF/JPG/PNG).

Contents appear to be diagnostic imaging.

ACTION REQUIRED: Request standard format version.`,
    expectedBehavior: 'System should list supported formats, reject unsupported with clear message',
    tags: ['edge-case', 'document', 'format'],
  },

  // Date/Time Issues
  {
    category: 'DATE_INCONSISTENT',
    subject: '[EDGE-014] Dates - Inconsistent injury dates',
    description: `Worker: Blake Johnson
Employer: Metro Services

CONFLICTING DATES REPORTED:
- Employer notification: Injury on 15/02/2026
- Worker statement: Injury on 12/02/2026
- GP certificate: Injury on 18/02/2026
- Incident report: Injury on 14/02/2026

Four different dates from four sources.
Cannot determine actual injury date.

This affects:
- Time-off calculations
- Claim validity
- Compliance deadlines

ACTION REQUIRED: Investigate and confirm actual date.`,
    expectedBehavior: 'System should flag date conflicts across documents, highlight discrepancies in dashboard',
    tags: ['edge-case', 'dates', 'inconsistent'],
  },
  {
    category: 'DATE_AMBIGUOUS_FORMAT',
    subject: '[EDGE-015] Dates - Ambiguous date format',
    description: `Worker: Drew Martinez
Employer: Pacific Trading

Certificate states injury date: 01/02/26

Is this:
- 1st February 2026 (Australian DD/MM/YY)
- 2nd January 2026 (American MM/DD/YY)
- 26th February 2001 (unlikely but possible)

GP clinic has US-trained doctors, unclear which format used.

ACTION REQUIRED: Confirm date format with clinic.`,
    expectedBehavior: 'System should flag ambiguous dates, default to AU format but allow override',
    tags: ['edge-case', 'dates', 'ambiguous'],
  },

  // Status/Workflow Issues
  {
    category: 'STATUS_CONFLICTING_INFO',
    subject: '[EDGE-016] Status - Conflicting work status',
    description: `Worker: Finley Davis
Employer: Construction Plus
Injury Date: 01/02/2026

CONFLICTING STATUS:
- Latest certificate: "Fit for modified duties"
- Worker phone call: "I'm still off work completely"
- Employer email: "Worker hasn't returned at all"

System shows: Modified duties
Actual status: Appears to be off work

Unable to reconcile different sources.

ACTION REQUIRED: Case conference with all parties.`,
    expectedBehavior: 'System should allow multiple status inputs, flag conflicts, support case notes',
    tags: ['edge-case', 'status', 'conflicting'],
  },
  {
    category: 'STATUS_RTW_FAILED',
    subject: '[EDGE-017] Status - RTW attempt failed',
    description: `Worker: Hayden Clark
Employer: Logistics Express
Injury Date: 15/12/2025

RTW ATTEMPT FAILED:

Worker commenced modified duties: 01/02/2026
Duties: Office admin, 4 hours/day

Day 3: Worker reported increased pain
Day 5: Worker unable to continue
Day 7: Worker off work completely again

New certificate: Unfit for any work, review 4 weeks

RTW Plan needs revision.
Consider occupational health assessment.

ACTION REQUIRED: Update plan, arrange OT/physio assessment.`,
    expectedBehavior: 'System should track RTW attempts, record failures, trigger plan revision workflow',
    tags: ['edge-case', 'status', 'rtw-failed'],
  },

  // Communication Issues
  {
    category: 'COMM_UNRESPONSIVE_WORKER',
    subject: '[EDGE-018] Communication - Worker unresponsive',
    description: `Worker: Jamie Patterson
Employer: RetailMax Stores
Injury Date: 20/01/2026

NO CONTACT WITH WORKER:
- Phone calls: No answer (5 attempts)
- Emails: No response (3 sent)
- SMS: Undelivered
- Last contact: 25/01/2026

Employer also unable to reach worker.
Address on file may be outdated.

Claim cannot progress without worker participation.
Certificate expired 2 weeks ago.

ACTION REQUIRED: Final attempt via registered mail, then escalate.`,
    expectedBehavior: 'System should track contact attempts, flag unresponsive cases, suggest escalation paths',
    tags: ['edge-case', 'communication', 'unresponsive'],
  },
  {
    category: 'COMM_LANGUAGE_BARRIER',
    subject: '[EDGE-019] Communication - Interpreter required',
    description: `Worker: Thanh Nguyen
Employer: Food Processing Co
Injury Date: 10/02/2026

LANGUAGE BARRIER:
- Worker's primary language: Vietnamese
- English proficiency: Limited
- Current interpreter: None assigned

Worker unable to understand:
- Medical terminology
- WorkCover process
- Return to work requirements

GP notes are in English.
Worker may not fully understand restrictions.

ACTION REQUIRED: Arrange TIS interpreter for all calls, translate key documents.`,
    expectedBehavior: 'System should flag language requirements, integrate interpreter booking, track translated documents',
    tags: ['edge-case', 'communication', 'interpreter'],
  },

  // Edge Case - System Error
  {
    category: 'SYSTEM_SYNC_FAILED',
    subject: '[EDGE-020] System - Partial sync failure',
    description: `SYSTEM ALERT:

Case: FD-47XXX
Worker: System Test User
Employer: Test Corp

Freshdesk ticket exists but GPNet sync failed.
Ticket visible in Freshdesk but NOT in GPNet dashboard.

Error log:
"Database constraint violation: duplicate key"

Data may be partially written.
Manual intervention required.

ACTION REQUIRED: DevOps to investigate and reconcile.`,
    expectedBehavior: 'System should have idempotent sync, handle partial failures gracefully, alert on sync errors',
    tags: ['edge-case', 'system', 'sync-error'],
  },
];

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

async function createEdgeCaseTicket(edgeCase: typeof EDGE_CASES[0], index: number): Promise<number> {
  const ticketData = {
    subject: edgeCase.subject,
    description: edgeCase.description + `\n\n---\nEXPECTED SYSTEM BEHAVIOR:\n${edgeCase.expectedBehavior}`,
    email: `edge-test-${index}@testworker.com.au`,
    priority: 3,
    status: 2,
    tags: edgeCase.tags,
    custom_fields: {
      cf_worker_first_name: 'Edge',
      cf_workers_name: `Test-${String(index).padStart(3, '0')}`,
    },
  };

  const ticket = await freshdeskRequest('/tickets', 'POST', ticketData);
  console.log(`✓ Created edge case ${index}: ${edgeCase.category}`);
  return ticket.id;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  EDGE CASE TEST DATA GENERATOR');
  console.log('  Creating challenging scenarios for system testing');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`Generating ${EDGE_CASES.length} edge case scenarios:\n`);
  
  // Group by category
  const categories = new Set(EDGE_CASES.map(e => e.category.split('_')[0]));
  for (const cat of categories) {
    const count = EDGE_CASES.filter(e => e.category.startsWith(cat)).length;
    console.log(`  ${cat}: ${count} scenarios`);
  }
  console.log('');

  console.log('Injecting into Freshdesk...\n');

  const createdIds: number[] = [];
  let errors = 0;

  for (let i = 0; i < EDGE_CASES.length; i++) {
    try {
      const id = await createEdgeCaseTicket(EDGE_CASES[i], i + 1);
      createdIds.push(id);
      await new Promise(r => setTimeout(r, 300));
    } catch (err: any) {
      console.error(`✗ Error creating edge case ${i + 1}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  COMPLETE: ${createdIds.length} edge cases created, ${errors} errors`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
