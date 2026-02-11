/**
 * Demo Scenario Runner
 *
 * Sends realistic WorkCover email sequences through the inbound email endpoint,
 * creating full case lifecycles with timeline entries, medical certificates, and status updates.
 *
 * Usage:
 *   npx tsx scripts/demo-scenarios.ts --scenario broken-arm
 *   npx tsx scripts/demo-scenarios.ts --scenario all
 *   npx tsx scripts/demo-scenarios.ts --scenario complex-back --speed slow
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET || "demo-secret-change-me";

// ============================================================================
// Types
// ============================================================================

interface DemoEmail {
  day: number;
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    sizeBytes: number;
    base64Data: string;
  }>;
  /** Internal: used for threading */
  _isFirstEmail?: boolean;
}

interface Scenario {
  id: string;
  name: string;
  worker: string;
  company: string;
  durationWeeks: number;
  emails: DemoEmail[];
}

// ============================================================================
// Fake medical certificate PDF (minimal valid PDF with text)
// ============================================================================

function makeFakeCertPdf(workerName: string, capacity: string, weeks: number, doctor: string): string {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 280 >>
stream
BT
/F1 16 Tf
50 700 Td
(MEDICAL CERTIFICATE) Tj
/F1 12 Tf
50 670 Td
(Patient: ${workerName}) Tj
50 650 Td
(Work Capacity: ${capacity}) Tj
50 630 Td
(Duration: ${weeks} weeks) Tj
50 610 Td
(Issuing Practitioner: ${doctor}) Tj
50 590 Td
(Date: ${new Date().toISOString().split("T")[0]}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000600 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
680
%%EOF`;
  return Buffer.from(content).toString("base64");
}

// ============================================================================
// Scenario 1: Simple Injury - Broken Arm
// ============================================================================

const brokenArmScenario: Scenario = {
  id: "broken-arm",
  name: "Simple Injury - Broken Arm",
  worker: "Sarah Mitchell",
  company: "Symmetry HR",
  durationWeeks: 6,
  emails: [
    {
      day: 0,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "Injury Report: Sarah Mitchell - Broken Arm at Warehouse",
      bodyText: `Hi GPNet Team,

I'm writing to report a workplace injury for one of our workers.

Worker: Sarah Mitchell
Position: Warehouse Operations
Date of Injury: ${new Date().toISOString().split("T")[0]}
Location: Symmetry Distribution Centre, Dandenong

Description of Injury:
Sarah was lifting a box from a high shelf when she lost her balance and fell from a step ladder (approx 1.2m height). She landed on her right arm and was taken to Dandenong Hospital ED. X-rays confirmed a fracture to the right radius (forearm).

Current Status: Sarah has been sent home and is currently off work. She has an appointment with her GP tomorrow for follow-up and a medical certificate.

Immediate Actions Taken:
- First aid administered on site
- Ambulance called (worker transported to Dandenong Hospital)
- Incident report completed
- Step ladder removed from service for inspection
- WorkSafe incident notification lodged

Please set up a case file for Sarah. I'll send through the medical certificate once we receive it.

Kind regards,
Amanda Clarke
HR Manager
Symmetry HR
Ph: 03 9555 1234`,
      _isFirstEmail: true,
    },
    {
      day: 1,
      fromEmail: "dr.wilson@clinic.local",
      fromName: "Dr. James Wilson",
      subject: "Medical Certificate - Sarah Mitchell",
      bodyText: `Dear Case Manager,

Please find attached the medical certificate for Sarah Mitchell (DOB: 15/03/1992).

Diagnosis: Fracture of right radius (closed, non-displaced)
Work Capacity: UNFIT for all work
Duration: 2 weeks from today
Review Date: ${new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]}

Treatment Plan:
- Right arm immobilised in plaster cast
- Pain management with prescribed analgesics
- Follow-up appointment in 2 weeks for X-ray review
- Physiotherapy referral once cast is removed

Restrictions:
- No use of right arm/hand
- No lifting, carrying, or manual handling
- No driving

The patient is otherwise in good health and I expect a full recovery within 6-8 weeks.

Regards,
Dr. James Wilson
Bridge Street Medical Clinic
AHPRA: MED0001234567`,
      attachments: [{
        filename: "medical-certificate-sarah-mitchell.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf("Sarah Mitchell", "UNFIT - Right arm fracture", 2, "Dr. James Wilson"),
      }],
    },
    {
      day: 7,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Sarah Mitchell - Weekly Update (Week 1)",
      bodyText: `Hi Team,

Quick update on Sarah Mitchell:

- Spoke with Sarah on Wednesday. She's in good spirits and the pain is manageable.
- Cast is still on, she's attending her GP appointments as scheduled.
- We've completed the incident investigation - step ladder has been replaced with a compliant mobile platform.
- Sarah mentioned she's keen to return to work as soon as possible, even in a modified capacity.

We're thinking about some admin/data entry duties she could do one-handed when she's ready. Thoughts on starting light duties in her second week?

Thanks,
Amanda`,
    },
    {
      day: 14,
      fromEmail: "dr.wilson@clinic.local",
      fromName: "Dr. James Wilson",
      subject: "Updated Certificate - Sarah Mitchell (Partial Capacity)",
      bodyText: `Dear Case Manager,

Updated medical certificate for Sarah Mitchell following her 2-week review.

X-ray shows good healing progress. The cast has been replaced with a removable splint.

Work Capacity: PARTIAL CAPACITY
- Light duties only
- Left hand dominant tasks acceptable
- Seated work only (4-6 hours per day)
- No lifting over 1kg with right hand
- No repetitive right-hand movements

Duration: 2 weeks (review in 2 weeks)
Next Review: ${new Date(Date.now() + 28 * 86400000).toISOString().split("T")[0]}

I'm satisfied Sarah can safely return to modified duties provided the above restrictions are followed.

Regards,
Dr. James Wilson
Bridge Street Medical Clinic`,
      attachments: [{
        filename: "certificate-update-sarah-mitchell.pdf",
        contentType: "application/pdf",
        sizeBytes: 14500,
        base64Data: makeFakeCertPdf("Sarah Mitchell", "PARTIAL - Light duties, seated work", 2, "Dr. James Wilson"),
      }],
    },
    {
      day: 21,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Sarah Mitchell - RTW Progress (Week 3)",
      bodyText: `Hi Team,

Great news - Sarah started light admin duties on Monday!

RTW Progress:
- Working 4 hours/day, Mon-Thu in the office
- Doing data entry, phone calls, and filing (all left-handed tasks)
- She's managing well with the splint and pain is minimal
- Team has been very supportive

She mentioned her physio is happy with her progress and she hopes to start using the right hand for light tasks next week.

Will keep you posted on the next medical review.

Cheers,
Amanda`,
    },
    {
      day: 28,
      fromEmail: "dr.wilson@clinic.local",
      fromName: "Dr. James Wilson",
      subject: "Final Certificate - Sarah Mitchell (Fit for Full Duties)",
      bodyText: `Dear Case Manager,

Final medical certificate for Sarah Mitchell.

Following 4-week review, X-ray confirms complete healing of the right radius fracture. Splint has been removed. Physiotherapy is ongoing but Sarah has regained full range of motion and grip strength.

Work Capacity: FIT FOR FULL DUTIES
- No restrictions
- Cleared for all pre-injury duties including manual handling
- Recommend graduated return to full hours over 1 week

Sarah has made an excellent recovery. No further certificates required.

I recommend:
- 1 week graduated return: 6 hours/day for first 3 days, then full hours
- Continue physiotherapy 1x/week for 2 more weeks
- Ergonomic assessment of her workstation upon full return

Regards,
Dr. James Wilson
Bridge Street Medical Clinic`,
      attachments: [{
        filename: "final-certificate-sarah-mitchell.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf("Sarah Mitchell", "FIT FOR FULL DUTIES", 0, "Dr. James Wilson"),
      }],
    },
    {
      day: 35,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Sarah Mitchell - Case Closure Request",
      bodyText: `Hi Team,

Pleased to confirm Sarah Mitchell has fully returned to her pre-injury role as of this week.

Summary:
- Sarah is back to full hours and full duties in warehouse operations
- Physiotherapy completed - discharged by physio last Thursday
- No ongoing restrictions or accommodations needed
- Sarah is happy and performing well

Workplace improvements made as a result of this incident:
- All step ladders replaced with mobile platforms with safety rails
- Updated manual handling training for all warehouse staff
- Monthly equipment inspection schedule implemented

Can we please close this case? All documentation has been filed.

Thank you for your support throughout this case.

Kind regards,
Amanda Clarke
HR Manager
Symmetry HR`,
    },
  ],
};

// ============================================================================
// Scenario 2: Stress/Mental Health Claim
// ============================================================================

const stressClaimScenario: Scenario = {
  id: "stress-claim",
  name: "Stress/Mental Health Claim",
  worker: "David Chen",
  company: "Symmetry HR",
  durationWeeks: 12,
  emails: [
    {
      day: 0,
      fromEmail: "david.chen@worker.local",
      fromName: "David Chen",
      subject: "Stress Claim - David Chen, Symmetry HR Account Manager",
      bodyText: `To whom it may concern,

My name is David Chen and I'm an Account Manager at Symmetry HR. I've been employed with the company for 4 years.

I'm writing to lodge a stress claim due to workplace conditions that have significantly impacted my mental health over the past 3 months.

Key issues:
- Unrealistic KPIs imposed after restructure in October
- Consistent overtime of 55-60 hours per week to meet targets
- Bullying behaviour from new team leader (verbal abuse in team meetings)
- Two formal complaints lodged with HR in November - no action taken
- Sleep disruption, anxiety attacks, and inability to concentrate

I saw my GP last week and have been diagnosed with adjustment disorder with mixed anxiety and depressed mood. My GP has recommended I take time off work.

I will forward my medical certificate separately.

I want to return to work when I'm able to, but the workplace issues need to be addressed.

Regards,
David Chen
0412 555 678`,
      _isFirstEmail: true,
    },
    {
      day: 2,
      fromEmail: "dr.patel@clinic.local",
      fromName: "Dr. Anita Patel",
      subject: "Medical Certificate - David Chen (Psychological)",
      bodyText: `Dear Case Manager,

Medical certificate for David Chen (DOB: 22/08/1988).

Diagnosis: Adjustment disorder with mixed anxiety and depressed mood (F43.23)
Related to: Reported workplace stress and bullying

Work Capacity: UNFIT for all work
Duration: 4 weeks
Review Date: ${new Date(Date.now() + 28 * 86400000).toISOString().split("T")[0]}

Current Presentation:
- Significant anxiety symptoms (GAD-7 score: 18 - severe)
- Low mood (PHQ-9 score: 16 - moderately severe)
- Sleep disturbance (averaging 3-4 hours per night)
- Concentration difficulties
- Avoidance of work-related triggers

Treatment Plan:
- Prescribed sertraline 50mg daily
- Referred to psychologist for CBT (Dr. Sarah Tang, MindWell Psychology)
- Weekly GP reviews
- Encouraged exercise and sleep hygiene

David is not fit for any work at this time. I will review in 4 weeks.

Regards,
Dr. Anita Patel
Hawthorn Medical Centre
AHPRA: MED0009876543`,
      attachments: [{
        filename: "medical-certificate-david-chen.pdf",
        contentType: "application/pdf",
        sizeBytes: 16000,
        base64Data: makeFakeCertPdf("David Chen", "UNFIT - Adjustment disorder", 4, "Dr. Anita Patel"),
      }],
    },
    {
      day: 7,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: David Chen - EAP Referral & Workplace Review",
      bodyText: `Hi Team,

Update on David Chen's stress claim:

Actions taken:
1. EAP referral made - David has been given contact details for our Employee Assistance Program (Converge International). 3 free sessions available.
2. Workplace investigation initiated into the bullying allegations. External investigator (Worklogic) engaged.
3. David's team leader has been spoken to and reminded of expected conduct standards.
4. David's KPIs are being reviewed as part of a broader team workload audit.

David's direct manager (not the team leader in question) has been briefed and will be the primary contact going forward.

We take these allegations seriously and want to ensure David has a safe environment to return to.

Will keep you updated on the investigation progress.

Amanda Clarke
HR Manager`,
    },
    {
      day: 14,
      fromEmail: "psych@mindwell.local",
      fromName: "Dr. Sarah Tang (MindWell Psychology)",
      subject: "Assessment Report - David Chen (Initial Psychology Assessment)",
      bodyText: `Dear Case Manager,

Initial psychological assessment report for David Chen.

Assessment Date: ${new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]}
Sessions Completed: 2

Clinical Presentation:
- David presents with moderate-severe anxiety and depression consistent with adjustment disorder
- Primary stressors: workplace bullying, excessive workload, perceived lack of support
- Sleep has improved slightly since starting medication (now 5-6 hours)
- No suicidal ideation
- Good insight and motivation for recovery

Treatment Plan:
- 12-session CBT program recommended
- Focus areas: anxiety management, assertiveness training, cognitive restructuring
- Weekly sessions for first 6 weeks, then fortnightly
- Coordinating with Dr. Patel regarding medication management

RTW Considerations:
- Currently not ready for return to work
- When ready, recommend graduated return starting at 3 days/week
- Workplace modifications needed: changed reporting line, revised KPIs
- Workplace mediation may be beneficial before return

Next Review: 4 weeks

Regards,
Dr. Sarah Tang
Clinical Psychologist
MindWell Psychology
AHPRA: PSY0001234567`,
    },
    {
      day: 28,
      fromEmail: "dr.patel@clinic.local",
      fromName: "Dr. Anita Patel",
      subject: "Updated Certificate - David Chen (Partial Capacity)",
      bodyText: `Dear Case Manager,

Updated certificate for David Chen following 4-week review.

Progress:
- GAD-7 score improved to 12 (moderate, down from 18)
- PHQ-9 score improved to 11 (moderate, down from 16)
- Sleep improved to 6-7 hours nightly
- Responding well to sertraline and psychology sessions

Work Capacity: PARTIAL CAPACITY
- 3 days per week maximum
- 6 hours per day
- No client-facing work initially
- Reduced complexity tasks for first 2 weeks
- Regular breaks (15 min every 2 hours)
- Changed reporting line required (not team leader in question)

Duration: 4 weeks
Review: ${new Date(Date.now() + 56 * 86400000).toISOString().split("T")[0]}

Regards,
Dr. Anita Patel`,
      attachments: [{
        filename: "updated-cert-david-chen.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf("David Chen", "PARTIAL - 3 days/week", 4, "Dr. Anita Patel"),
      }],
    },
    {
      day: 42,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: David Chen - Workplace Modifications & RTW Progress",
      bodyText: `Hi Team,

David started his graduated return last Monday. Here's the update:

Workplace Changes Implemented:
- David now reports to Sarah Williams (Senior Account Manager) instead of the former team leader
- KPIs have been revised to align with reduced hours and industry benchmarks
- Private workspace allocated (quiet office area, away from open plan)
- Flexible start time approved (can start between 9-10am)

RTW Progress (Week 1):
- Working Mon/Wed/Fri, 10am-4pm
- Managing well with admin and internal project work
- No client meetings yet (as per medical advice)
- David reports feeling positive about the workplace changes
- One difficult moment on Wednesday (anxiety spike before team meeting) - he used coping strategies from his psychologist

Investigation Update:
- External investigation completed
- Formal findings made regarding inappropriate conduct
- Team leader has received formal warning and mandatory training

Overall tracking well. David seems relieved about the investigation outcome.

Amanda`,
    },
    {
      day: 56,
      fromEmail: "psych@mindwell.local",
      fromName: "Dr. Sarah Tang (MindWell Psychology)",
      subject: "Progress Report - David Chen (Session 8)",
      bodyText: `Dear Case Manager,

Progress report for David Chen - Session 8 of 12.

Clinical Progress:
- Significant improvement in anxiety and mood symptoms
- GAD-7: 8 (mild, down from initial 18)
- PHQ-9: 7 (mild, down from initial 16)
- Sleep normalised (7-8 hours consistently)
- Successfully using CBT techniques for anxiety management
- Good engagement with graduated RTW

Recommendation:
- Increase work to 4 days per week
- Can begin limited client contact (phone calls, not face-to-face initially)
- Continue fortnightly psychology sessions (4 remaining)
- Workplace mediation not required given investigation outcomes and David's satisfaction with changes

Expected Full RTW: Within 4-6 weeks at current trajectory

Dr. Sarah Tang
Clinical Psychologist`,
    },
    {
      day: 70,
      fromEmail: "dr.patel@clinic.local",
      fromName: "Dr. Anita Patel",
      subject: "Final Certificate - David Chen (Fit with Ongoing Support)",
      bodyText: `Dear Case Manager,

Final certificate for David Chen.

Excellent progress. David reports feeling well and confident about full return.

Work Capacity: FIT FOR PRE-INJURY DUTIES
- Full hours (5 days/week)
- Full duties including client-facing work
- Recommend maintaining current reporting line (not original team leader)
- Continue fortnightly psychology sessions for 2 more months (can attend outside work hours)

Ongoing Support Recommendations:
- Monthly check-in with HR for 3 months
- Access to EAP if needed
- Maintain revised KPIs for 6 months then review
- Any recurrence of symptoms to prompt immediate GP review

David has made a strong recovery. I attribute this to the combination of appropriate medication, effective psychological intervention, and the employer's positive workplace changes.

No further medical certificates required.

Regards,
Dr. Anita Patel`,
      attachments: [{
        filename: "final-certificate-david-chen.pdf",
        contentType: "application/pdf",
        sizeBytes: 14500,
        base64Data: makeFakeCertPdf("David Chen", "FIT with ongoing support", 0, "Dr. Anita Patel"),
      }],
    },
    {
      day: 84,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: David Chen - Fully Returned, Case Closure",
      bodyText: `Hi Team,

David Chen has been back full time for 2 weeks now and everything is going well.

Summary:
- Full hours, full duties since ${new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0]}
- Client meetings resumed without issues
- Monthly HR check-ins scheduled for next 3 months
- Fortnightly psychology continuing (David's choice, outside work hours)
- No workplace incidents or concerns

David wanted me to pass on his thanks for the support throughout this process. He said the workplace changes have made a significant difference not just for him but for the whole team.

Lessons learned:
- Early intervention on bullying complaints is critical
- External investigation added credibility and fairness
- Graduated RTW with genuine workplace modifications works
- EAP + clinical psychology combination was effective

Please close this case. All documentation filed.

Amanda Clarke
HR Manager
Symmetry HR`,
    },
  ],
};

// ============================================================================
// Scenario 3: Complex WorkCover - Back Injury
// ============================================================================

const complexBackScenario: Scenario = {
  id: "complex-back",
  name: "Complex WorkCover - Back Injury",
  worker: "James Kovacs",
  company: "Symmetry HR",
  durationWeeks: 20,
  emails: [
    {
      day: 0,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "URGENT: James Kovacs - Back Injury, Ambulance Called",
      bodyText: `URGENT - Workplace Injury Notification

Worker: James Kovacs
Position: Forklift Operator / General Warehouse
Date/Time: Today, 2:15 PM
Location: Symmetry Logistics Hub, Laverton

Incident Description:
James was operating a forklift when a pallet shifted during unloading. He attempted to stabilise the load manually and experienced immediate severe lower back pain. He collapsed and was unable to stand.

Ambulance was called at 2:20 PM. Paramedics administered pain relief (Methoxyflurane) and transported James to Werribee Mercy Hospital ED.

Preliminary assessment by paramedics: suspected disc injury, lower lumbar region.

James is 45 years old, has been with us for 8 years, no previous injuries.

Emergency Contact: Maria Kovacs (wife) - 0423 555 789 - has been notified.

I will follow up with the hospital and send through more information as it comes to hand.

This is a high-priority case given the severity and mechanism of injury.

Amanda Clarke
HR Manager
Symmetry HR`,
      _isFirstEmail: true,
    },
    {
      day: 1,
      fromEmail: "ed@hospital.local",
      fromName: "Dr. Rebecca Torres (Werribee Mercy ED)",
      subject: "ED Report - James Kovacs, L4/L5 Disc Herniation",
      bodyText: `Emergency Department Report

Patient: James Kovacs (DOB: 12/06/1981)
Presentation: ${new Date().toISOString().split("T")[0]}, 2:45 PM
Discharge: ${new Date(Date.now() + 86400000).toISOString().split("T")[0]}, 10:30 AM

Presenting Complaint:
Acute severe lower back pain following workplace incident (manual handling while operating forklift).

Examination Findings:
- Severe lumbar spasm, unable to flex or extend
- Pain radiating to left leg (L5 dermatome)
- Positive straight leg raise test at 30 degrees (left)
- Neurological deficit: reduced sensation left lateral foot
- Power 4/5 left ankle dorsiflexion

Imaging:
- CT lumbar spine: Large L4/L5 disc herniation (left posterolateral)
- Moderate foraminal narrowing at L4/L5
- No fracture identified

Diagnosis: L4/L5 disc herniation with left L5 radiculopathy

Treatment Provided:
- IV Morphine 10mg, Paracetamol 1g, Diclofenac 75mg
- Lumbar support brace fitted
- Discharged with: Oxycodone 5mg PRN, Diclofenac 50mg TDS, Diazepam 5mg nocte

Work Capacity: UNFIT for all work - 6 weeks minimum
Referral: Urgent MRI, Neurosurgical review if no improvement in 4 weeks

Follow-up: GP review within 1 week

Dr. Rebecca Torres
Emergency Medicine Registrar
Werribee Mercy Hospital`,
      attachments: [{
        filename: "ed-certificate-james-kovacs.pdf",
        contentType: "application/pdf",
        sizeBytes: 18000,
        base64Data: makeFakeCertPdf("James Kovacs", "UNFIT - L4/L5 disc herniation", 6, "Dr. Rebecca Torres"),
      }],
    },
    {
      day: 3,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: James Kovacs - WorkCover Claim Lodged #08260050789",
      bodyText: `Hi Team,

WorkCover claim has been lodged for James Kovacs.

Claim Details:
- WorkCover Claim Number: 08260050789
- Insurer: DXC (Allianz)
- Agent Contact: Marlee Batten, DXC
- Email: marlee.batten@dxc.com
- Phone: 1800 222 345 (Ref: 08260050789)

Employer Actions Completed:
- Employer Injury Report submitted to WorkSafe
- Photos of incident scene taken and filed
- Witness statements obtained (2 witnesses)
- Forklift inspection completed - no mechanical fault found
- Pallet loading procedure under review

James is at home resting. His wife Maria is the primary contact.
I spoke with James yesterday - he's in significant pain but managing with the medication.

MRI has been booked for next week.

This will be a complex case given the severity. Please advise on any compliance requirements.

Amanda Clarke
HR Manager`,
    },
    {
      day: 14,
      fromEmail: "marlee.batten@dxc.com",
      fromName: "Marlee Batten (DXC/Allianz)",
      subject: "James Kovacs, Primary Claim - 08260050789 - Initial Assessment",
      bodyText: `Dear Claims Manager,

RE: James Kovacs - Claim #08260050789
Employer: Symmetry HR

I've been assigned as the claims agent for this matter.

Liability has been accepted for this claim. Weekly payments have been approved from the date of incapacity.

I've reviewed the ED report and note the L4/L5 disc herniation with radiculopathy. This is a significant injury that will require careful management.

Requesting the following within 14 days:
1. Current medical certificate from treating GP
2. MRI results when available
3. Employer's return-to-work plan (when medically appropriate)
4. Worker's pre-injury duties document (job description, physical demands)

I'd like to schedule an initial case conference with the employer and treating practitioners once we have the MRI results.

Please ensure the worker is aware of their obligations under the WIRC Act, including:
- Attending medical appointments
- Cooperating with rehabilitation
- Making reasonable efforts to return to work

I'll be in touch to arrange the case conference.

Kind regards,
Marlee Batten
Claims Consultant
DXC Technology (Allianz Workers Compensation)
Ph: 1800 222 345
Ref: 08260050789`,
    },
    {
      day: 28,
      fromEmail: "specialist@spinecare.local",
      fromName: "Dr. Michael Okonkwo (SpineCare Specialists)",
      subject: "MRI Report & Specialist Review - James Kovacs",
      bodyText: `MRI Report and Specialist Consultation

Patient: James Kovacs
Date of MRI: ${new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0]}
Consultation Date: ${new Date(Date.now() + 28 * 86400000).toISOString().split("T")[0]}

MRI Findings (Lumbar Spine):
- Large left posterolateral disc herniation at L4/L5 (9mm)
- Compressing the left L5 nerve root
- Mild disc bulge at L3/L4 (likely pre-existing, asymptomatic)
- No spinal canal stenosis
- No other significant pathology

Clinical Assessment:
- Pain has reduced from 9/10 to 6/10 with medication
- Left leg radiculopathy persists
- Neurological deficit unchanged (reduced left foot sensation)
- Able to walk short distances with walking stick

My Opinion:
1. The disc herniation is significant but surgery is NOT indicated at this stage
2. Recommend conservative management with physiotherapy
3. Expected recovery: 3-4 months for significant improvement
4. If no improvement in 8 weeks, consider CT-guided epidural injection
5. Surgery (microdiscectomy) only if conservative measures fail after 3-4 months

Recommendations:
- Physiotherapy program focused on core stability and McKenzie method
- Gradual activity increase as tolerated
- Medication wean over next 4 weeks (reduce oxycodone first)
- Avoid heavy lifting, prolonged sitting, and bending for minimum 12 weeks

Next Review: 8 weeks

Dr. Michael Okonkwo
Spine Surgeon
SpineCare Specialists
AHPRA: MED0005678901`,
    },
    {
      day: 35,
      fromEmail: "physio@rehab.local",
      fromName: "Jake Thompson (Symmetry Physiotherapy)",
      subject: "Rehab Program Started - James Kovacs",
      bodyText: `Dear Case Manager,

Physiotherapy rehabilitation program commenced for James Kovacs.

Initial Assessment:
- Lower back pain 6/10 at rest, 8/10 with movement
- Left leg radiculopathy: intermittent shooting pain and numbness
- Limited lumbar ROM: flexion 20%, extension 10%
- Core muscle activation: poor (2/5 on modified Sahrmann)
- Unable to sit > 15 minutes
- Walking limited to 10 minutes with stick

Treatment Plan (12-week program):
Weeks 1-4: Pain management phase
- Hydrotherapy 2x/week
- Gentle McKenzie exercises
- Soft tissue massage
- Education on pain management and posture

Weeks 5-8: Strengthening phase
- Core stability program
- Graduated walking program
- Pool-based exercises
- Reduce walking stick dependency

Weeks 9-12: Functional rehabilitation
- Work-specific task training
- Lifting technique retraining (progressive)
- Seated tolerance building
- Pre-RTW workplace assessment

Frequency: 3x per week (reducing to 2x from week 5)
Goals: Return to modified duties by week 8-10, full duties by week 14-16

Progress reports will be provided fortnightly.

Jake Thompson
Senior Physiotherapist
Symmetry Physiotherapy & Rehabilitation
AHPRA: PHY0001234567`,
    },
    {
      day: 42,
      fromEmail: "dr.wilson@clinic.local",
      fromName: "Dr. James Wilson",
      subject: "Certificate Renewal - James Kovacs (Still Unfit)",
      bodyText: `Dear Case Manager,

Renewed medical certificate for James Kovacs.

Review Notes:
- Pain reduced to 5/10 (was 6/10)
- Started physiotherapy - reports some benefit from hydrotherapy
- Medication being weaned (reduced oxycodone from 4x daily to 2x daily)
- Still cannot sit for more than 20 minutes
- Unable to drive

Work Capacity: UNFIT for all work
Duration: 4 weeks
Next Review: ${new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0]}

Progress is slower than hoped but consistent with the severity of the disc herniation. I remain optimistic about a return to modified duties in 4-6 weeks.

Dr. James Wilson
Bridge Street Medical Clinic`,
      attachments: [{
        filename: "cert-renewal-james-kovacs.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf("James Kovacs", "UNFIT - L4/L5 ongoing", 4, "Dr. James Wilson"),
      }],
    },
    {
      day: 56,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: James Kovacs - No Light Duties Available (RTW Barrier)",
      bodyText: `Hi Team,

I need to flag an issue with James Kovacs' return to work.

Problem: We don't have suitable light duties available at the Laverton warehouse for James in his current condition. The site is all manual/forklift work. The restrictions from his doctor (no sitting >20 min, no lifting, no bending) make it very difficult.

Options we've considered:
1. Admin role at Head Office (Hawthorn) - 45 min commute for James, and he can't drive
2. Training/mentoring role - possible but limited hours and requires sitting
3. Alternative employer program via WorkCover - need DXC approval

We want to do the right thing but we're genuinely stuck. James lives in Werribee and relies on driving to get to work.

Can you advise on:
- Is there a transport assistance program through WorkCover?
- Should we apply for the Alternative Duties/Host Employer program?
- Any other options we're not seeing?

James is getting frustrated at home and we don't want to lose him. He's one of our best operators.

Amanda Clarke
HR Manager`,
    },
    {
      day: 70,
      fromEmail: "dr.wilson@clinic.local",
      fromName: "Dr. James Wilson",
      subject: "Updated Certificate - James Kovacs (Partial Capacity)",
      bodyText: `Dear Case Manager,

Good progress for James Kovacs at 10-week review.

Current Status:
- Pain 3/10 (significantly improved)
- Can sit for 1.5-2 hours with breaks
- Walking 30 minutes without aid (no stick needed)
- Left leg symptoms much improved (occasional tingling only)
- Off oxycodone completely, using paracetamol only
- Physio reporting strong core improvement

Work Capacity: PARTIAL CAPACITY
- Seated work: 4 hours per day
- No lifting over 5kg
- Regular position changes (every 30 min)
- No forklift operation
- No bending/twisting
- Can drive short distances (<30 min)

Duration: 4 weeks
Review: ${new Date(Date.now() + 98 * 86400000).toISOString().split("T")[0]}

This is a significant improvement. James is motivated and compliant with his rehab program.

Dr. James Wilson`,
      attachments: [{
        filename: "updated-cert-james-kovacs-partial.pdf",
        contentType: "application/pdf",
        sizeBytes: 15500,
        base64Data: makeFakeCertPdf("James Kovacs", "PARTIAL - Seated 4hrs, no lifting >5kg", 4, "Dr. James Wilson"),
      }],
    },
    {
      day: 77,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: James Kovacs - Admin Role Arranged, RTW Plan Active",
      bodyText: `Great news!

We've arranged a temporary admin/training role for James at our Laverton site:

RTW Plan Details:
- Role: Warehouse Administration & New Operator Training Coordinator
- Hours: Mon-Thu, 9am-1pm (4 hours/day as per medical cert)
- Duties: Inventory data entry, safety documentation, new operator orientation
- Workstation: Dedicated standing desk with adjustable stool
- Break schedule: 15-min break every 30 min for position changes

Transport: James can now drive the 15-min commute from Werribee to Laverton.

James started today and was very happy to be back at the site. The team gave him a warm welcome. He's doing orientation paperwork and inventory reconciliation.

His colleagues are already asking him to help train the new casual forklift operators - James is very experienced and a natural teacher.

Amanda`,
    },
    {
      day: 84,
      fromEmail: "marlee.batten@dxc.com",
      fromName: "Marlee Batten (DXC/Allianz)",
      subject: "RE: James Kovacs - Progress Report Request, Claim 08260050789",
      bodyText: `Dear Claims Manager,

RE: James Kovacs - Claim #08260050789

Thank you for the regular updates on this claim.

I'm pleased to see James has commenced a graduated return to work. This aligns well with our expectations for this type of injury.

Compliance Review:
- Medical certificates: Current ✓
- Specialist review completed: ✓
- Physiotherapy engaged: ✓
- RTW plan in place: ✓
- Worker cooperating with rehabilitation: ✓

I note the claim is now at 12 weeks. Under our case management framework, I need the following by end of next week:

1. Updated physiotherapy progress report
2. GP prognosis for full RTW timeline
3. Employer confirmation of sustainable duties post-recovery
4. Updated medical certificate when current one expires

Weekly payment adjustment: As James is now working part-time, his weekly payments will be adjusted to reflect the make-up pay differential.

Please ensure James is aware of the adjustment.

Next case conference: I'd like to schedule a teleconference in 2 weeks with GP, physio, employer, and worker to align on the full RTW timeline.

Marlee Batten
Claims Consultant, DXC`,
    },
    {
      day: 98,
      fromEmail: "dr.wilson@clinic.local",
      fromName: "Dr. James Wilson",
      subject: "Updated Certificate - James Kovacs (Increased Capacity)",
      bodyText: `Dear Case Manager,

14-week review for James Kovacs. Continued strong progress.

Current Status:
- Pain 2/10 (minimal, end of day only)
- Full sitting tolerance (3+ hours)
- Can lift up to 10kg safely
- Walking 60+ minutes without issue
- Physio reports 80% pre-injury functional capacity
- Core strength 4/5 (up from 2/5)

Work Capacity: PARTIAL - INCREASED
- 6 hours per day
- 5 days per week
- Can lift up to 10kg
- No repetitive heavy lifting (>10kg)
- No forklift operation yet (pending workplace assessment)
- Ongoing position change breaks recommended

Duration: 4 weeks
Review: ${new Date(Date.now() + 126 * 86400000).toISOString().split("T")[0]}

Prognosis: Expect full duties clearance at next review if trajectory continues.

Dr. James Wilson`,
      attachments: [{
        filename: "cert-james-kovacs-6hrs.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf("James Kovacs", "PARTIAL - 6hrs/day, lift 10kg max", 4, "Dr. James Wilson"),
      }],
    },
    {
      day: 112,
      fromEmail: "physio@rehab.local",
      fromName: "Jake Thompson (Symmetry Physiotherapy)",
      subject: "Progress Report - James Kovacs (Week 16, Near Full Recovery)",
      bodyText: `Dear Case Manager,

16-week physiotherapy progress report for James Kovacs.

Objective Measures:
- Lumbar ROM: Flexion 85% (was 20%), Extension 80% (was 10%)
- Core strength: 4+/5 (was 2/5)
- Sitting tolerance: 3+ hours (was 15 min)
- Standing tolerance: 2+ hours (was 20 min)
- Walking: unlimited (was 10 min with stick)
- Lifting: Demonstrated safe 15kg lift from floor (was unable)

Functional Assessment:
- Completed work-hardening program for forklift operation
- Simulated full shift (8 hours) in clinic last week - managed well
- Forklift simulation: passed all safety criteria
- Only limitation: fatigue in last hour of full day

Recommendations:
1. James is ready for graduated return to full pre-injury duties
2. Suggest 2-week transition: first week 6hrs with forklift, second week full hours
3. Continue home exercise program (core maintenance)
4. Discharge from physio after 2 more sessions (consolidation)
5. No ongoing restrictions expected

James has made an excellent recovery. His commitment to the rehab program has been outstanding.

Jake Thompson
Senior Physiotherapist`,
    },
    {
      day: 126,
      fromEmail: "dr.wilson@clinic.local",
      fromName: "Dr. James Wilson",
      subject: "Final Certificate - James Kovacs (Fit for Full Duties)",
      bodyText: `Dear Case Manager,

FINAL medical certificate for James Kovacs.

18-week review. Complete clinical recovery.

Work Capacity: FIT FOR ALL PRE-INJURY DUTIES
- No restrictions
- Cleared for forklift operation
- Cleared for manual handling (full pre-injury capacity)
- Cleared for all shifts including overtime

Final Clinical Notes:
- Pain: 0-1/10 (nil most days, occasional mild ache after prolonged activity)
- Full range of motion restored
- No neurological deficit
- MRI at 16 weeks showed significant disc resorption (herniation reduced from 9mm to 3mm)
- Off all medication

Recommendations:
- Continue home exercise program (3x/week minimum)
- Annual health check including back screen
- Report any recurrence of symptoms immediately
- No activity restrictions

James has made a remarkable recovery from what was a significant disc herniation. I commend Symmetry HR for their excellent rehabilitation support.

No further certificates required.

Dr. James Wilson
Bridge Street Medical Clinic`,
      attachments: [{
        filename: "final-certificate-james-kovacs.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf("James Kovacs", "FIT FOR ALL DUTIES", 0, "Dr. James Wilson"),
      }],
    },
    {
      day: 133,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: James Kovacs - Fully Returned to Pre-Injury Role",
      bodyText: `Hi Team,

Delighted to confirm James Kovacs has fully returned to his pre-injury role as Forklift Operator.

Timeline Summary:
- Week 0: Injury (L4/L5 disc herniation)
- Week 1-10: Unfit, intensive physio and specialist management
- Week 10-14: Part-time admin/training role (4hrs/day)
- Week 14-18: Increased hours (6hrs/day), work hardening
- Week 18: Full duties clearance
- Week 19-20: Graduated return to forklift (full hours by week 20)

Total time off full duties: 20 weeks
Outcome: Full recovery, no restrictions

Workplace Improvements Resulting from Case:
- Pallet securing procedure updated
- New forklift training module on manual handling risks
- All forklift operators now receive annual back health screening
- James appointed as informal safety mentor for new operators

James is performing well and has expressed gratitude for the support throughout.

Please proceed with case closure.

Amanda Clarke
HR Manager
Symmetry HR`,
    },
    {
      day: 140,
      fromEmail: "marlee.batten@dxc.com",
      fromName: "Marlee Batten (DXC/Allianz)",
      subject: "RE: James Kovacs - Claim Finalized, 08260050789",
      bodyText: `Dear Claims Manager,

RE: James Kovacs - Claim #08260050789 - FINALISATION

I'm writing to confirm this claim is being finalised.

Claim Summary:
- Injury Type: L4/L5 disc herniation with L5 radiculopathy
- Claim Duration: 20 weeks
- Total Incapacity Payments: $38,460
- Medical/Treatment Costs: $12,350
- Total Claim Cost: $50,810
- Outcome: Full RTW to pre-injury duties, no restrictions

This is an excellent outcome for a claim of this nature. The average duration for similar disc herniation claims in our portfolio is 36 weeks, and the average cost is $89,000.

Key success factors:
1. Prompt ED assessment and imaging
2. Early specialist referral and opinion
3. Intensive, structured physiotherapy program
4. Employer's flexibility in creating suitable duties
5. Worker's commitment to rehabilitation
6. Good coordination between all parties

Weekly payments will cease from the date of full RTW clearance. Any outstanding medical accounts should be submitted within 30 days.

Please confirm the worker has returned to full pre-injury duties and hours so we can formally close the file.

Thank you to all parties for the excellent management of this claim.

Kind regards,
Marlee Batten
Claims Consultant
DXC Technology (Allianz Workers Compensation)
Reference: 08260050789`,
    },
  ],
};

// ============================================================================
// Scenario Runner
// ============================================================================

const ALL_SCENARIOS: Scenario[] = [brokenArmScenario, stressClaimScenario, complexBackScenario];

async function sendEmail(email: DemoEmail, scenario: Scenario, threadMessageId?: string): Promise<string> {
  const messageId = `<demo-${scenario.id}-day${email.day}-${Date.now()}@preventli.local>`;

  const payload: Record<string, any> = {
    messageId,
    fromEmail: email.fromEmail,
    fromName: email.fromName,
    toEmail: "claims@preventli.local",
    subject: email.subject,
    bodyText: email.bodyText,
    source: "demo",
  };

  // Thread tracking: replies reference the first email's message ID
  if (!email._isFirstEmail && threadMessageId) {
    payload.inReplyTo = threadMessageId;
  }

  if (email.attachments) {
    payload.attachments = email.attachments;
  }

  const response = await fetch(`${BASE_URL}/api/inbound-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`  [Day ${String(email.day).padStart(3)}] ${email.fromName}: "${email.subject}"`);
  console.log(`         → ${result.processingStatus} | Case: ${result.caseId || "pending"} | Match: ${result.matchMethod}`);
  if (result.isNewCase) {
    console.log(`         ★ NEW CASE CREATED`);
  }
  if (result.certificateDetected) {
    console.log(`         📋 Certificate detected`);
  }

  return messageId;
}

async function runScenario(scenario: Scenario, speed: "fast" | "slow"): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Scenario: ${scenario.name}`);
  console.log(`Worker: ${scenario.worker} | Company: ${scenario.company}`);
  console.log(`Duration: ${scenario.durationWeeks} weeks | Emails: ${scenario.emails.length}`);
  console.log(`${"=".repeat(70)}\n`);

  let threadMessageId: string | undefined;

  for (let i = 0; i < scenario.emails.length; i++) {
    const email = scenario.emails[i];

    // In slow mode, add a delay between emails
    if (speed === "slow" && i > 0) {
      const delayMs = Math.min(email.day * 100, 3000); // Max 3 second delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    try {
      const msgId = await sendEmail(email, scenario, threadMessageId);

      // Store the first email's message ID for threading
      if (email._isFirstEmail) {
        threadMessageId = msgId;
      }
    } catch (err) {
      console.error(`  [Day ${email.day}] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n✓ Scenario "${scenario.name}" complete (${scenario.emails.length} emails sent)\n`);
}

async function main(): Promise<void> {
  // Parse CLI args
  const args = process.argv.slice(2);
  let scenarioId = "all";
  let speed: "fast" | "slow" = "fast";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--scenario" && args[i + 1]) {
      scenarioId = args[i + 1];
      i++;
    }
    if (args[i] === "--speed" && args[i + 1]) {
      speed = args[i + 1] as "fast" | "slow";
      i++;
    }
  }

  console.log(`\n🚀 Preventli Demo Scenario Runner`);
  console.log(`   Server: ${BASE_URL}`);
  console.log(`   Speed: ${speed}`);
  console.log(`   Scenario: ${scenarioId}\n`);

  // Health check
  try {
    const healthResp = await fetch(`${BASE_URL}/api/system/health`);
    if (!healthResp.ok) throw new Error(`Server returned ${healthResp.status}`);
    console.log(`✓ Server is running\n`);
  } catch (err) {
    console.error(`✗ Cannot reach server at ${BASE_URL}`);
    console.error(`  Make sure the dev server is running: npm run dev`);
    process.exit(1);
  }

  const scenarios = scenarioId === "all"
    ? ALL_SCENARIOS
    : ALL_SCENARIOS.filter(s => s.id === scenarioId);

  if (scenarios.length === 0) {
    console.error(`Unknown scenario: "${scenarioId}"`);
    console.error(`Available: ${ALL_SCENARIOS.map(s => s.id).join(", ")}, all`);
    process.exit(1);
  }

  const startTime = Date.now();

  for (const scenario of scenarios) {
    await runScenario(scenario, speed);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalEmails = scenarios.reduce((sum, s) => sum + s.emails.length, 0);

  console.log(`${"=".repeat(70)}`);
  console.log(`✅ All done! ${totalEmails} emails sent across ${scenarios.length} scenario(s) in ${elapsed}s`);
  console.log(`\nNext steps:`);
  console.log(`  1. Login at ${BASE_URL} as admin@gpnet.local / ChangeMe123!`);
  console.log(`  2. Check the dashboard for new cases`);
  console.log(`  3. Click into each case to see timeline, certificates, and discussion notes`);
  console.log(`${"=".repeat(70)}\n`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
