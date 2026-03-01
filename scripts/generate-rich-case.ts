/**
 * Generate a rich, realistic test case:
 * - 10 weeks post-injury
 * - 3 medical certificates showing progression
 * - Recovery timeline
 * - RTW plan
 * - Employer compliance gaps
 */

const FRESHDESK_DOMAIN = process.env.FRESHDESK_DOMAIN || 'gpnet';
const FRESHDESK_API_KEY = process.env.FRESHDESK_API_KEY;

if (!FRESHDESK_API_KEY) {
  console.error('FRESHDESK_API_KEY required');
  process.exit(1);
}

const BASE_URL = `https://${FRESHDESK_DOMAIN}.freshdesk.com/api/v2`;
const AUTH_HEADER = `Basic ${Buffer.from(`${FRESHDESK_API_KEY}:X`).toString('base64')}`;

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

// Calculate dates relative to today
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function formatDateAU(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  GENERATING RICH 10-WEEK TEST CASE');
  console.log('  Worker: Marcus Chen | Employer: Coastal Logistics');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const injuryDate = daysAgo(70); // 10 weeks ago
  
  // =====================================================
  // TICKET 1: Initial Injury Report (Day 0)
  // =====================================================
  console.log('Creating initial injury report...');
  
  const ticket1 = await freshdeskRequest('/tickets', 'POST', {
    subject: '[RICH-001] INJURY: Marcus Chen - Coastal Logistics - Back Injury - Warehouse',
    description: `
**INJURY NOTIFICATION**

Worker: Marcus Chen
Employer: Coastal Logistics Pty Ltd
Position: Warehouse Team Leader
Date of Injury: ${formatDateAU(injuryDate)}
Location: Main Distribution Centre, Dock 4

**Incident Description:**
Worker was lifting a heavy pallet (approx 35kg) when he felt immediate sharp pain in lower back. 
Worker reported the incident immediately to supervisor (John Peters).
First aid administered on site. Worker sent home.

**Initial Assessment:**
- Pain level reported: 8/10
- Unable to stand for extended periods
- Difficulty bending or lifting

**Employer Contact:**
HR Manager: Sandra Williams
Email: sandra.williams@coastallogistics.com.au
Phone: 0412 345 678

**Worker Contact:**
Email: marcus.chen.personal@gmail.com
Phone: 0423 456 789

Status: AWAITING MEDICAL CERTIFICATE
`,
    email: 'marcus.chen.test@testworker.com.au',
    priority: 3,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['injury', 'back', 'high-risk', 'warehouse', 'manual-handling'],
    custom_fields: {
      cf_worker_first_name: 'Marcus',
      cf_workers_name: 'Chen',
    },
  });
  
  console.log(`  ✓ Initial ticket: FD-${ticket1.id}`);

  // =====================================================
  // TICKET 2: Certificate 1 - Initial (Day 2)
  // =====================================================
  console.log('\nCreating Certificate 1 (initial - unfit for work)...');
  
  const cert1Date = daysAgo(68);
  const cert1End = daysAgo(54); // 2 weeks duration
  
  const ticket2 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] Medical Certificate - Marcus Chen - Initial`,
    description: `
**MEDICAL CERTIFICATE RECEIVED**

Worker: Marcus Chen
Treating Doctor: Dr. Sarah Thompson
Clinic: Northside Medical Centre
Date of Certificate: ${formatDateAU(cert1Date)}

**Certificate Details:**
- Period: ${formatDateAU(cert1Date)} to ${formatDateAU(cert1End)}
- Duration: 14 days
- Capacity: UNFIT FOR ALL WORK

**Diagnosis:**
Acute lumbar strain with muscle spasm (M54.5)

**Restrictions:**
- Complete rest recommended
- No lifting
- No prolonged standing or sitting
- Referral to physiotherapy

**GP Notes:**
"Patient presents with significant lower back pain following workplace injury. 
Recommend complete rest for 2 weeks followed by review. 
Physiotherapy referral provided."

**Next Review:** ${formatDateAU(cert1End)}
`,
    email: 'marcus.chen.test@testworker.com.au',
    priority: 2,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['medical-certificate', 'unfit', 'initial'],
  });
  
  console.log(`  ✓ Certificate 1: FD-${ticket2.id}`);

  // =====================================================
  // TICKET 3: Physio Assessment (Day 7)
  // =====================================================
  console.log('\nCreating Physio Assessment...');
  
  const physioDate = daysAgo(63);
  
  const ticket3 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] Physiotherapy Initial Assessment - Marcus Chen`,
    description: `
**PHYSIOTHERAPY ASSESSMENT REPORT**

Worker: Marcus Chen
Physiotherapist: James Wong
Clinic: Active Recovery Physio
Date: ${formatDateAU(physioDate)}

**Assessment Findings:**
- Restricted lumbar flexion (40% of normal range)
- Muscle guarding present in paraspinal muscles
- Tenderness at L4-L5 level
- No neurological deficits noted
- SLR test negative bilaterally

**Treatment Plan:**
1. Manual therapy - 2x per week for 4 weeks
2. Core strengthening exercises
3. Graduated activity program
4. Heat therapy as needed

**Functional Capacity Estimate:**
Week 2-4: Light duties possible (seated work, no lifting >5kg)
Week 4-6: Moderate duties (standing work, lifting up to 10kg)
Week 6-8: Graduated return to full duties

**Prognosis:**
Good - expect full recovery within 8-10 weeks with compliance to treatment plan.

**RTW Recommendation:**
Modified duties from Week 3 if employer can accommodate restrictions.
`,
    email: 'marcus.chen.test@testworker.com.au',
    priority: 2,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['physio', 'assessment', 'functional-capacity'],
  });
  
  console.log(`  ✓ Physio Assessment: FD-${ticket3.id}`);

  // =====================================================
  // TICKET 4: Certificate 2 - Modified Duties (Day 14)
  // =====================================================
  console.log('\nCreating Certificate 2 (modified duties)...');
  
  const cert2Date = daysAgo(56);
  const cert2End = daysAgo(28); // 4 weeks duration
  
  const ticket4 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] Medical Certificate - Marcus Chen - Modified Duties`,
    description: `
**MEDICAL CERTIFICATE RECEIVED**

Worker: Marcus Chen
Treating Doctor: Dr. Sarah Thompson
Clinic: Northside Medical Centre
Date of Certificate: ${formatDateAU(cert2Date)}

**Certificate Details:**
- Period: ${formatDateAU(cert2Date)} to ${formatDateAU(cert2End)}
- Duration: 28 days
- Capacity: FIT FOR MODIFIED DUTIES

**Restrictions:**
- Maximum 6 hours per day
- No lifting over 5kg
- Alternate sitting/standing every 30 minutes
- No bending or twisting
- Access to rest breaks as needed

**GP Notes:**
"Good progress noted. Patient can commence modified duties as per restrictions.
Continue physiotherapy. Review in 4 weeks."

**Functional Capacity:**
- Seated administrative work: YES
- Light supervision duties: YES
- Forklift operation: NO
- Manual handling: NO
- Warehouse floor duties: NO

**Next Review:** ${formatDateAU(cert2End)}
`,
    email: 'marcus.chen.test@testworker.com.au',
    priority: 2,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['medical-certificate', 'modified-duties'],
  });
  
  console.log(`  ✓ Certificate 2: FD-${ticket4.id}`);

  // =====================================================
  // TICKET 5: EMPLOYER ISSUE - No Suitable Duties (Day 18)
  // =====================================================
  console.log('\nCreating Employer Response - No Suitable Duties...');
  
  const employerResponseDate = daysAgo(52);
  
  const ticket5 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] Employer Response - Unable to Provide Modified Duties`,
    description: `
**EMPLOYER COMMUNICATION**

From: Sandra Williams (HR Manager, Coastal Logistics)
Date: ${formatDateAU(employerResponseDate)}

---

Hi,

Thank you for sending through Marcus's medical certificate.

Unfortunately, we are unable to provide suitable modified duties at this time.
Our warehouse operation doesn't have administrative positions, and all roles
require some level of manual handling.

We've considered:
❌ Dispatch paperwork - requires standing at counter for extended periods
❌ Stock counting - requires walking the floor and bending
❌ Forklift training - not suitable given restrictions
❌ Office admin - we don't have spare desks or admin work available

We're a small operation with 15 staff and limited options for light duties.

Can you advise what our obligations are? Do we need to create a position
for Marcus or can he remain on WorkCover until he's fit for normal duties?

Please advise.

Regards,
Sandra Williams
HR Manager
Coastal Logistics Pty Ltd

---

**COMPLIANCE FLAG:** ⚠️ Employer unable/unwilling to provide suitable duties.
This requires case manager intervention and potential escalation.
`,
    email: 'sandra.williams@coastallogistics.test.au',
    priority: 3,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['employer-response', 'no-suitable-duties', 'compliance-issue'],
  });
  
  console.log(`  ✓ Employer Issue: FD-${ticket5.id}`);

  // =====================================================
  // TICKET 6: Case Manager Follow-up (Day 21)
  // =====================================================
  console.log('\nCreating Case Manager Follow-up...');
  
  const followUpDate = daysAgo(49);
  
  const ticket6 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] CLC Follow-up - Suitable Duties Discussion`,
    description: `
**CASE MANAGER NOTES**

Case Manager: Rebecca Martinez
Date: ${formatDateAU(followUpDate)}
Type: Phone call with Employer

**Summary:**
Called Sandra Williams at Coastal Logistics to discuss suitable duties options.

**Discussion Points:**
1. Explained employer obligations under WIRC Act
2. Discussed that "no suitable duties" is rarely acceptable
3. Suggested alternative duties:
   - Safety observation/reporting
   - Quality control inspections (non-physical)
   - Training material development
   - Inventory data entry (work from home option)

**Employer Response:**
Sandra agreed to explore work-from-home data entry option.
Will discuss with operations manager and revert by end of week.

**Actions:**
- [ ] Employer to confirm WFH arrangement by ${formatDateAU(daysAgo(45))}
- [ ] If no suitable duties, escalate to Injury Management Consultant
- [ ] Worker check-in scheduled for ${formatDateAU(daysAgo(42))}

**Worker Status:**
Worker frustrated with lack of RTW progress.
Experiencing some financial stress due to reduced payments.
Physio attendance: 100% compliance.

**Risk Level:** MEDIUM → HIGH (escalated due to employer barriers)
`,
    email: 'clc@preventli.test.au',
    priority: 3,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['clc-notes', 'follow-up', 'employer-barriers'],
  });
  
  console.log(`  ✓ Case Manager Follow-up: FD-${ticket6.id}`);

  // =====================================================
  // TICKET 7: RTW Plan Created (Day 28)
  // =====================================================
  console.log('\nCreating RTW Plan...');
  
  const rtwPlanDate = daysAgo(42);
  
  const ticket7 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] RTW Plan - Marcus Chen - Graduated Return`,
    description: `
**RETURN TO WORK PLAN**

Worker: Marcus Chen
Employer: Coastal Logistics Pty Ltd
Plan Type: Graduated Return to Work
Plan Created: ${formatDateAU(rtwPlanDate)}
Plan Duration: 6 weeks

**AGREED DUTIES:**

Work From Home - Data Entry (Weeks 1-2):
✅ Inventory spreadsheet updates
✅ Purchase order data entry
✅ Stock level reconciliation
Equipment: Laptop provided by employer

On-Site Modified Duties (Weeks 3-4):
✅ Safety documentation review
✅ Team briefing coordination
✅ Quality control checklist reviews
❌ No physical warehouse duties
❌ No lifting

Graduated Full Duties (Weeks 5-6):
✅ Supervision of team (non-physical)
✅ Light administrative tasks
⚠️ Gradual reintroduction of physical duties per medical clearance

**SCHEDULE:**

| Week | Hours/Day | Days/Week | Location |
|------|-----------|-----------|----------|
| 1 | 4 | 3 | Home |
| 2 | 5 | 4 | Home |
| 3 | 6 | 4 | On-site |
| 4 | 6 | 5 | On-site |
| 5 | 7 | 5 | On-site |
| 6 | 8 | 5 | On-site |

**RESTRICTIONS (per Certificate ${formatDateAU(cert2Date)}):**
- No lifting >5kg until medical clearance
- Alternate sitting/standing every 30 minutes
- Rest breaks as needed

**PARTIES SIGNED:**
☑️ Worker: Marcus Chen - Agreed ${formatDateAU(rtwPlanDate)}
☑️ Employer: Sandra Williams - Agreed ${formatDateAU(rtwPlanDate)}
☑️ Case Manager: Rebecca Martinez - Created ${formatDateAU(rtwPlanDate)}
☐ Treating Doctor: Pending acknowledgment

**NEXT REVIEW:** ${formatDateAU(daysAgo(14))}
`,
    email: 'clc@preventli.test.au',
    priority: 2,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['rtw-plan', 'graduated-return', 'approved'],
  });
  
  console.log(`  ✓ RTW Plan: FD-${ticket7.id}`);

  // =====================================================
  // TICKET 8: Certificate 3 - Current (Day 42)
  // =====================================================
  console.log('\nCreating Certificate 3 (current - progressing)...');
  
  const cert3Date = daysAgo(28);
  const cert3End = daysAgo(-14); // Expires in 2 weeks (future)
  
  const ticket8 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] Medical Certificate - Marcus Chen - Progressing`,
    description: `
**MEDICAL CERTIFICATE RECEIVED**

Worker: Marcus Chen
Treating Doctor: Dr. Sarah Thompson
Clinic: Northside Medical Centre
Date of Certificate: ${formatDateAU(cert3Date)}

**Certificate Details:**
- Period: ${formatDateAU(cert3Date)} to ${formatDateAU(cert3End)}
- Duration: 42 days
- Capacity: FIT FOR MODIFIED DUTIES (PROGRESSING)

**Updated Restrictions:**
- Maximum 7 hours per day (increased from 6)
- Lifting up to 10kg permitted (increased from 5kg)
- Still no repetitive bending or twisting
- Continue alternating positions

**GP Notes:**
"Excellent progress. Patient responding well to physiotherapy.
Now tolerating 10kg lifting with good technique.
Expect full clearance within 4-6 weeks if progress continues.
May require final FCE before return to full duties."

**Functional Capacity:**
- Seated administrative work: YES
- Light supervision duties: YES
- Light manual handling (<10kg): YES
- Forklift operation: PENDING (requires medical clearance)
- Full warehouse duties: NOT YET

**Pain Level:** Reduced to 3/10 (down from 8/10 at injury)

**Next Review:** ${formatDateAU(cert3End)}
`,
    email: 'marcus.chen.test@testworker.com.au',
    priority: 2,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['medical-certificate', 'modified-duties', 'progressing'],
  });
  
  console.log(`  ✓ Certificate 3 (current): FD-${ticket8.id}`);

  // =====================================================
  // TICKET 9: Physio Progress Note (Day 56)
  // =====================================================
  console.log('\nCreating Physio Progress Note...');
  
  const physio2Date = daysAgo(14);
  
  const ticket9 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] Physiotherapy Progress Report - Marcus Chen`,
    description: `
**PHYSIOTHERAPY PROGRESS REPORT**

Worker: Marcus Chen
Physiotherapist: James Wong
Clinic: Active Recovery Physio
Date: ${formatDateAU(physio2Date)}
Session Number: 14 of 16

**Progress Summary:**
- Lumbar flexion: 85% of normal (up from 40%)
- Pain at rest: 1/10 (down from 5/10)
- Pain with activity: 3/10 (down from 8/10)
- Core strength: Significantly improved
- Functional capacity: 75% of pre-injury level

**Treatment This Session:**
- Manual therapy - lumbar mobilisation
- Core stability exercises - level 3 progressions
- Functional lifting technique training
- Work simulation exercises (lifting 10kg boxes)

**RTW Progress:**
Worker reports good tolerance of modified duties.
No flare-ups during WFH data entry phase.
On-site duties going well - managing 6-hour days.

**Recommendations:**
1. Continue treatment 1x per week for remaining 2 sessions
2. Progress to 10-15kg lifting in controlled manner
3. Gradual increase in standing/walking tolerance
4. FCE recommended before full duties clearance

**Prognosis Update:**
On track for full recovery. Expect full duties clearance in 3-4 weeks.
`,
    email: 'marcus.chen.test@testworker.com.au',
    priority: 2,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['physio', 'progress', 'positive-outcome'],
  });
  
  console.log(`  ✓ Physio Progress: FD-${ticket9.id}`);

  // =====================================================
  // TICKET 10: Current Status Note (Day 68 - 2 days ago)
  // =====================================================
  console.log('\nCreating Current Status Note...');
  
  const currentDate = daysAgo(2);
  
  const ticket10 = await freshdeskRequest('/tickets', 'POST', {
    subject: `Re: [RICH-001] Weekly Check-in - Marcus Chen - Week 10`,
    description: `
**WEEKLY CHECK-IN NOTES**

Worker: Marcus Chen
Case Manager: Rebecca Martinez
Date: ${formatDateAU(currentDate)}
Week: 10 of estimated 12

**Current Status:**
✅ RTW Plan: Week 5 of 6 - On track
✅ Work Status: On-site modified duties (7 hrs/day, 5 days/week)
✅ Certificate: Valid until ${formatDateAU(cert3End)}
⚠️ FCE: Not yet scheduled (required before full duties)

**Worker Feedback:**
"Feeling much better. Back is about 80% now. Ready to try some light
lifting on the floor but waiting for medical clearance. Happy with
how the RTW plan has worked out - WFH phase helped a lot."

**Employer Feedback:**
"Marcus has been great with the admin work. We've actually found
value in having him do the inventory data entry - it was always 
backlogged. Once he's cleared, we'll ease him back onto the floor."

**Outstanding Actions:**
1. 📅 FCE to be scheduled (target: next week)
2. 📋 Certificate renewal due ${formatDateAU(cert3End)}
3. 📝 Final physio sessions (2 remaining)
4. ✅ Full duties medical clearance (target: Week 12)

**Risk Level:** LOW (was HIGH at Week 3)

**Recovery Graph Data:**
| Week | Capacity % | Pain (1-10) | Hours/Day |
|------|------------|-------------|-----------|
| 1 | 0% | 8 | 0 |
| 2 | 0% | 6 | 0 |
| 3 | 25% | 5 | 4 |
| 4 | 35% | 4 | 5 |
| 5 | 45% | 4 | 6 |
| 6 | 55% | 3 | 6 |
| 7 | 65% | 3 | 6 |
| 8 | 70% | 3 | 7 |
| 9 | 75% | 2 | 7 |
| 10 | 80% | 2 | 7 |

**Projected Full Recovery:** Week 12-14
`,
    email: 'clc@preventli.test.au',
    priority: 2,
    status: 2,
    custom_fields: { cf_worker_first_name: 'Marcus', cf_workers_name: 'Chen' },
    tags: ['check-in', 'progress', 'positive-outcome', 'week-10'],
  });
  
  console.log(`  ✓ Current Status: FD-${ticket10.id}`);

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RICH CASE CREATED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('CASE SUMMARY: Marcus Chen - Coastal Logistics');
  console.log('─────────────────────────────────────────────');
  console.log(`Injury Date:        ${formatDateAU(injuryDate)} (10 weeks ago)`);
  console.log(`Injury Type:        Acute lumbar strain (back injury)`);
  console.log(`Current Status:     Modified duties (Week 5 of 6 on RTW plan)`);
  console.log(`Risk Level:         LOW (was HIGH at Week 3)`);
  console.log(`Certificate Valid:  Until ${formatDateAU(cert3End)} (2 weeks)`);
  console.log('');
  console.log('TICKETS CREATED:');
  console.log(`  1. FD-${ticket1.id} - Initial Injury Report`);
  console.log(`  2. FD-${ticket2.id} - Certificate 1 (Unfit)`);
  console.log(`  3. FD-${ticket3.id} - Physio Assessment`);
  console.log(`  4. FD-${ticket4.id} - Certificate 2 (Modified Duties)`);
  console.log(`  5. FD-${ticket5.id} - Employer: No Suitable Duties`);
  console.log(`  6. FD-${ticket6.id} - Case Manager Follow-up`);
  console.log(`  7. FD-${ticket7.id} - RTW Plan Created`);
  console.log(`  8. FD-${ticket8.id} - Certificate 3 (Current)`);
  console.log(`  9. FD-${ticket9.id} - Physio Progress`);
  console.log(` 10. FD-${ticket10.id} - Current Check-in (Week 10)`);
  console.log('');
  console.log('CASE FEATURES DEMONSTRATED:');
  console.log('  ✓ 3 medical certificates showing progression');
  console.log('  ✓ Recovery timeline with capacity % and pain scores');
  console.log('  ✓ RTW plan with graduated schedule');
  console.log('  ✓ Employer compliance issue (no suitable duties)');
  console.log('  ✓ Case manager intervention');
  console.log('  ✓ Physio assessments');
  console.log('  ✓ Weekly check-ins');
  console.log('  ✓ Risk level changes over time');
  console.log('');
  console.log('Run Freshdesk sync to pull this case into GPNet3.');
}

main().catch(console.error);
