/**
 * Real Case Scenario Runner
 *
 * Sends email sequences based on REAL OCR'd medical certificate data
 * for 3 actual WorkCover cases through the inbound email endpoint.
 *
 * Usage:
 *   npx tsx scripts/real-case-scenarios.ts --scenario jacob-gunn
 *   npx tsx scripts/real-case-scenarios.ts --scenario melad-hussaini
 *   npx tsx scripts/real-case-scenarios.ts --scenario andres-nieto
 *   npx tsx scripts/real-case-scenarios.ts --scenario all
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
  _isFirstEmail?: boolean;
}

interface Scenario {
  id: string;
  name: string;
  worker: string;
  company: string;
  durationWeeks: number;
  /** Base date for Day 0 of the scenario (ISO string YYYY-MM-DD) */
  baseDate: string;
  emails: DemoEmail[];
}

// ============================================================================
// Fake certificate PDF generator
// ============================================================================

function makeFakeCertPdf(
  workerName: string,
  dob: string,
  claimNumber: string,
  capacity: string,
  validFrom: string,
  validUntil: string,
  diagnosis: string,
  doctor: string,
  practice: string,
): string {
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
<< /Length 800 >>
stream
BT
/F1 14 Tf
50 740 Td
(CERTIFICATE OF CAPACITY - WorkSafe Victoria) Tj
/F1 10 Tf
50 710 Td
(Worker: ${workerName}  DOB: ${dob}) Tj
50 695 Td
(Claim: ${claimNumber}) Tj
50 670 Td
(Capacity: ${capacity}) Tj
50 655 Td
(Valid: ${validFrom} to ${validUntil}) Tj
50 630 Td
(Diagnosis: ${diagnosis}) Tj
50 605 Td
(Practitioner: ${doctor}) Tj
50 590 Td
(Practice: ${practice}) Tj
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
0000001120 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1200
%%EOF`;
  return Buffer.from(content).toString("base64");
}

// ============================================================================
// Scenario 1: Jacob Gunn - Thoracic Muscle Spasm (Real Data)
// Claim #08250029242 | DOB: 11/11/1990 | Cranbourne West VIC
// 8 COCs: UNFIT -> PARTIAL -> CLEARANCE -> SETBACK
// ============================================================================

const jacobGunnScenario: Scenario = {
  id: "jacob-gunn",
  name: "Real Case - Thoracic Muscle Spasm (Jacob Gunn)",
  worker: "Jacob Gunn",
  company: "Symmetry HR",
  durationWeeks: 26,
  baseDate: "2025-08-06",
  emails: [
    // Day 0: Employer reports injury
    {
      day: 0,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "Injury Report: Jacob Gunn - Thoracic Muscle Spasm at Workplace",
      bodyText: `Hi GPNet Team,

Reporting a workplace injury for Jacob Gunn.

Worker: Jacob Gunn
DOB: 11/11/1990
Address: Cranbourne West, VIC 3977
Position: Manual handling role
Date of Injury: Approximately early July 2025

Description of Injury:
Jacob has reported thoracic spine pain following repetitive manual handling tasks. He presented to his GP at Remount Way Medical Practice in Cranbourne West with significant upper/mid back pain. The GP has assessed thoracic muscle spasm.

Current Status: Jacob is off work and has been issued a Certificate of Capacity by his treating GP.

Please set up a case file. Certificate to follow.

Kind regards,
Amanda Clarke
HR Manager
Symmetry HR`,
      _isFirstEmail: true,
    },

    // Day 1: COC #1 - Dr Priya Fernandez - UNFIT (7/8/25 - 21/8/25)
    {
      day: 1,
      fromEmail: "reception@remountway.local",
      fromName: "Dr. Priya Fernandez (Remount Way Medical)",
      subject: "Medical Certificate - Jacob Gunn (Certificate of Capacity)",
      bodyText: `Dear Case Manager,

Please find the Certificate of Capacity for Jacob Gunn.

Patient: Jacob Gunn
DOB: 11/11/1990
Claim Number: 08250029242
Date of Examination: 7/08/2025

Diagnosis: Thoracic muscle spasm

Work Capacity: HAS NO CURRENT WORK CAPACITY (UNFIT)
Period: 7/08/2025 to 21/08/2025

Physical Function Assessment:
- Sit: CAN
- Stand/Walk: CAN
- Bend: WITH MODIFICATIONS
- Squat: CAN
- Kneel: CAN
- Reach above shoulder: WITH MODIFICATIONS
- Use injured arm/hand: WITH MODIFICATIONS
- Lift: CANNOT
- Neck movement: WITH MODIFICATIONS

Mental health: All functions NOT AFFECTED

Treatment Plan: Physiotherapy, pain management
Next Review: 21/08/2025

Regards,
Dr. Priya Fernandez
Remount Way Medical Practice
32-36 Remount Way, Cranbourne West VIC 3977
Provider: 6168192W
Ph: 03 5996 3488`,
      attachments: [{
        filename: "COC-Jacob-Gunn-07Aug2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 16000,
        base64Data: makeFakeCertPdf(
          "Jacob Gunn", "11/11/1990", "08250029242",
          "UNFIT - No current work capacity",
          "07/08/2025", "21/08/2025",
          "Thoracic muscle spasm",
          "Dr. Priya Fernandez", "32-36 Remount Way, Cranbourne West VIC 3977"
        ),
      }],
    },

    // Day 14: COC #2 - Dr Emily Chen - UNFIT WORSENED (21/8/25 - 18/9/25)
    {
      day: 14,
      fromEmail: "reception@remountway.local",
      fromName: "Dr. Emily Chen (Remount Way Medical)",
      subject: "Updated Certificate - Jacob Gunn (Condition Worsened)",
      bodyText: `Dear Case Manager,

Updated Certificate of Capacity for Jacob Gunn following review.

Claim: 08250029242
Date of Examination: 21/08/2025

IMPORTANT: Jacob's condition has WORSENED since last certificate.

Diagnosis: Thoracic muscle spasm (deteriorated)

Work Capacity: HAS NO CURRENT WORK CAPACITY (UNFIT)
Period: 21/08/2025 to 18/09/2025

Physical Function Changes (compared to previous):
- Sit: CAN (unchanged)
- Stand/Walk: CAN (unchanged)
- Bend: WITH MODIFICATIONS (unchanged)
- Squat: CAN (unchanged)
- Kneel: WITH MODIFICATIONS (NEW - was CAN)
- Reach above shoulder: CANNOT (WORSENED - was WITH MODIFICATIONS)
- Use injured arm/hand: WITH MODIFICATIONS (unchanged)
- Lift: CANNOT (unchanged)
- Neck movement: WITH MODIFICATIONS (unchanged)

Note: The kneeling limitation is new and reaching above shoulder has worsened from "with modifications" to "cannot". This suggests the thoracic spasm is not responding to initial treatment as expected.

Treatment Plan: Continue physiotherapy, consider imaging if no improvement
Next Review: 18/09/2025

Regards,
Dr. Emily Chen
Remount Way Medical Practice
32-36 Remount Way, Cranbourne West VIC 3977
Provider: 6168192W`,
      attachments: [{
        filename: "COC-Jacob-Gunn-21Aug2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 16000,
        base64Data: makeFakeCertPdf(
          "Jacob Gunn", "11/11/1990", "08250029242",
          "UNFIT - Condition WORSENED",
          "21/08/2025", "18/09/2025",
          "Thoracic muscle spasm (deteriorated)",
          "Dr. Emily Chen", "32-36 Remount Way, Cranbourne West VIC 3977"
        ),
      }],
    },

    // Day 21: Employer update
    {
      day: 21,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Jacob Gunn - Condition Worsened, Requesting Guidance",
      bodyText: `Hi Team,

Concerned about Jacob Gunn's case. His condition has worsened per the latest certificate - he can no longer reach above shoulder at all, and kneeling is now restricted.

We had hoped to start light duties by now but this setback means we need to reassess.

Questions:
1. Should we request specialist referral through WorkCover?
2. Is imaging (MRI/X-ray) warranted given the deterioration?
3. What RTW options exist for a worker who cannot lift, reach overhead, or kneel?

Jacob is frustrated and worried about his recovery timeline. He's been very compliant with physio.

Amanda Clarke
HR Manager`,
    },

    // Day 42: COC #3 - Dr Michael Tran - PARTIAL (18/9/25 - 16/10/25)
    {
      day: 42,
      fromEmail: "reception@remountway.local",
      fromName: "Dr. Michael Tran (Remount Way Medical)",
      subject: "Updated Certificate - Jacob Gunn (Partial Capacity)",
      bodyText: `Dear Case Manager,

Certificate of Capacity update for Jacob Gunn.

Claim: 08250029242
Date of Examination: 18/09/2025

IMPROVEMENT: Jacob has progressed to PARTIAL CAPACITY.

Diagnosis: Thoracic muscle spasm

Work Capacity: HAS CURRENT WORK CAPACITY - SUITABLE EMPLOYMENT
Period: 18/09/2025 to 16/10/2025

Physical Function Assessment:
- Sit: CAN
- Stand/Walk: CAN
- Bend: WITH MODIFICATIONS
- Squat: CAN
- Kneel: CAN (improved from WITH MODIFICATIONS)
- Reach above shoulder: WITH MODIFICATIONS (improved from CANNOT)
- Use injured arm/hand: WITH MODIFICATIONS
- Lift: WITH MODIFICATIONS (improved from CANNOT)
- Neck movement: WITH MODIFICATIONS

Significant improvement in kneeling (back to CAN), reaching (back to WITH MODIFICATIONS), and lifting (upgraded from CANNOT to WITH MODIFICATIONS). Jacob can now do light duties with appropriate modifications.

Treatment Plan: Continue physiotherapy, graduated RTW program
Recommended hours: Light duties, limited hours initially

Regards,
Dr. Michael Tran
Remount Way Medical Practice
32-36 Remount Way, Cranbourne West VIC 3977
Provider: 258050BY`,
      attachments: [{
        filename: "COC-Jacob-Gunn-18Sep2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 16000,
        base64Data: makeFakeCertPdf(
          "Jacob Gunn", "11/11/1990", "08250029242",
          "PARTIAL - Suitable employment",
          "18/09/2025", "16/10/2025",
          "Thoracic muscle spasm (improving)",
          "Dr. Michael Tran", "32-36 Remount Way, Cranbourne West VIC 3977"
        ),
      }],
    },

    // Day 49: Employer RTW plan
    {
      day: 49,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Jacob Gunn - RTW Plan Commenced",
      bodyText: `Hi Team,

Good news - Jacob started modified duties today.

RTW Plan:
- Light admin/training tasks
- No lifting above 5kg
- Modified reaching tasks only
- Regular position changes every 30 minutes
- Building up hours gradually

Jacob is in good spirits about being back at work. His physio is pleased with the progress.

Amanda`,
    },

    // Day 70: COC #4 - Dr Priya Fernandez - PARTIAL continued (16/10/25 - 30/10/25)
    {
      day: 70,
      fromEmail: "reception@remountway.local",
      fromName: "Dr. Priya Fernandez (Remount Way Medical)",
      subject: "Certificate Renewal - Jacob Gunn (Partial Capacity Continued)",
      bodyText: `Dear Case Manager,

Renewed Certificate of Capacity for Jacob Gunn.

Claim: 08250029242
Date of Examination: 16/10/2025

Work Capacity: HAS CURRENT WORK CAPACITY - SUITABLE EMPLOYMENT
Period: 16/10/2025 to 30/10/2025

Physical function assessment unchanged from previous - maintaining PARTIAL capacity with same modifications. Steady progress in physiotherapy.

Treatment: Continuing physio program
Next review: 30/10/2025

Regards,
Dr. Priya Fernandez
Remount Way Medical Practice`,
      attachments: [{
        filename: "COC-Jacob-Gunn-16Oct2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Jacob Gunn", "11/11/1990", "08250029242",
          "PARTIAL - Suitable employment (continued)",
          "16/10/2025", "30/10/2025",
          "Thoracic muscle spasm",
          "Dr. Priya Fernandez", "32-36 Remount Way, Cranbourne West VIC 3977"
        ),
      }],
    },

    // Day 84: COC #5 - Dr Sarah Lopez - PARTIAL (30/10/25 - 5/11/25)
    {
      day: 84,
      fromEmail: "reception@remountway.local",
      fromName: "Dr. Sarah Lopez (Remount Way Medical)",
      subject: "Updated Certificate - Jacob Gunn (Short Extension)",
      bodyText: `Dear Case Manager,

Short extension certificate for Jacob Gunn.

Claim: 08250029242
Date of Examination: 30/10/2025

Work Capacity: HAS CURRENT WORK CAPACITY - SUITABLE EMPLOYMENT
Period: 30/10/2025 to 5/11/2025

Note: Short duration (6 days) as clearance assessment is anticipated at next review. Physical function improving well.

Regards,
Dr. Sarah Lopez
Remount Way Medical Practice
Provider: 610018WT`,
      attachments: [{
        filename: "COC-Jacob-Gunn-30Oct2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Jacob Gunn", "11/11/1990", "08250029242",
          "PARTIAL - Short extension pending clearance",
          "30/10/2025", "05/11/2025",
          "Thoracic muscle spasm",
          "Dr. Sarah Lopez", "32-36 Remount Way, Cranbourne West VIC 3977"
        ),
      }],
    },

    // Day 90: COC #6 - Dr Sarah Lopez - PARTIAL improving (5/11/25 - 5/11/25)
    {
      day: 90,
      fromEmail: "reception@remountway.local",
      fromName: "Dr. Sarah Lopez (Remount Way Medical)",
      subject: "Updated Certificate - Jacob Gunn (Further Improvement, Near Clearance)",
      bodyText: `Dear Case Manager,

Certificate of Capacity for Jacob Gunn - significant functional improvement.

Claim: 08250029242
Date of Examination: 5/11/2025

Work Capacity: HAS CURRENT WORK CAPACITY - SUITABLE EMPLOYMENT
Period: 5/11/2025

Physical Function Assessment - IMPROVED:
- Sit: CAN
- Stand/Walk: CAN
- Bend: CAN (upgraded from WITH MODIFICATIONS)
- Squat: CAN
- Kneel: CAN
- Reach above shoulder: CAN (upgraded from WITH MODIFICATIONS)
- Use injured arm/hand: CAN (upgraded from WITH MODIFICATIONS)
- Lift: WITH MODIFICATIONS (still restricted, but improved)
- Neck movement: CAN (upgraded from WITH MODIFICATIONS)

Nearly all functions restored. Only lifting still requires modification. Clearance expected at next review.

Regards,
Dr. Sarah Lopez
Remount Way Medical Practice`,
      attachments: [{
        filename: "COC-Jacob-Gunn-05Nov2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Jacob Gunn", "11/11/1990", "08250029242",
          "PARTIAL - Near clearance (most functions restored)",
          "05/11/2025", "05/11/2025",
          "Thoracic muscle spasm (resolving)",
          "Dr. Sarah Lopez", "32-36 Remount Way, Cranbourne West VIC 3977"
        ),
      }],
    },

    // Day 91: COC #7 - Dr Sarah Lopez - CLEARANCE! (5/11/25)
    {
      day: 91,
      fromEmail: "reception@remountway.local",
      fromName: "Dr. Sarah Lopez (Remount Way Medical)",
      subject: "CLEARANCE Certificate - Jacob Gunn (Fit for Pre-Injury Duties)",
      bodyText: `Dear Case Manager,

CLEARANCE CERTIFICATE for Jacob Gunn.

Claim: 08250029242
Date of Examination: 5/11/2025

Work Capacity: FIT FOR PRE-INJURY EMPLOYMENT
Effective: 5/11/2025

ALL PHYSICAL FUNCTIONS RESTORED:
- Sit: CAN
- Stand/Walk: CAN
- Bend: CAN
- Squat: CAN
- Kneel: CAN
- Reach above shoulder: CAN
- Use injured arm/hand: CAN
- Lift: CAN (fully cleared)
- Neck movement: CAN

Jacob has made a full recovery from his thoracic muscle spasm. He is cleared for all pre-injury duties with no restrictions.

Total recovery time: approximately 3 months from first COC.

Recommendations:
- Continue home exercise program
- Report any recurrence immediately
- No activity restrictions

Regards,
Dr. Sarah Lopez
Remount Way Medical Practice
32-36 Remount Way, Cranbourne West VIC 3977`,
      attachments: [{
        filename: "CLEARANCE-Jacob-Gunn-05Nov2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Jacob Gunn", "11/11/1990", "08250029242",
          "FIT FOR PRE-INJURY DUTIES (CLEARANCE)",
          "05/11/2025", "N/A",
          "Thoracic muscle spasm - RESOLVED",
          "Dr. Sarah Lopez", "32-36 Remount Way, Cranbourne West VIC 3977"
        ),
      }],
    },

    // Day 98: Employer confirms RTW
    {
      day: 98,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Jacob Gunn - Full Return to Work Confirmed",
      bodyText: `Hi Team,

Jacob Gunn has been fully cleared and returned to his pre-injury role. Working full hours, no restrictions. Case closure requested.

However, please note - we want to keep monitoring as the injury took longer than initially expected (worsened before improving).

Amanda Clarke
HR Manager`,
    },

    // Day 147: COC #8 - Dr Emily Chen - SETBACK! PARTIAL again (1/12/25 - 12/1/26)
    {
      day: 147,
      fromEmail: "reception@remountway.local",
      fromName: "Dr. Emily Chen (Remount Way Medical)",
      subject: "URGENT: Updated Certificate - Jacob Gunn (Post-Clearance SETBACK)",
      bodyText: `Dear Case Manager,

IMPORTANT: Jacob Gunn has experienced a SETBACK post-clearance.

Claim: 08250029242
Date of Examination: 1/12/2025

Jacob returned to the practice reporting recurrence of thoracic pain, along with NEW mental health concerns (anxiety about re-injury, sleep disturbance, frustration with relapse).

Diagnosis: Thoracic muscle spasm (recurrence) + adjustment disorder

Work Capacity: HAS CURRENT WORK CAPACITY - SUITABLE EMPLOYMENT
Period: 1/12/2025 to 12/01/2026

Physical Function Assessment - REGRESSED:
- Sit: CAN
- Stand/Walk: CAN
- Bend: WITH MODIFICATIONS (was CAN at clearance)
- Squat: CAN
- Kneel: CAN
- Reach above shoulder: WITH MODIFICATIONS (was CAN at clearance)
- Use injured arm/hand: WITH MODIFICATIONS (was CAN at clearance)
- Lift: WITH MODIFICATIONS (was CAN at clearance)
- Neck movement: WITH MODIFICATIONS (was CAN at clearance)

Mental Health - NOW AFFECTED:
- Attention: AFFECTED
- Memory: NOT AFFECTED
- Judgement: NOT AFFECTED

This is a significant regression. Jacob had been cleared for full duties on 5/11/2025 but has relapsed approximately 4 weeks later. The addition of mental health symptoms (attention affected) is concerning and suggests psychological distress related to the physical injury recurrence.

Treatment Plan:
- Resume physiotherapy
- Mental health support referral (psychologist)
- Modified duties only
- Review in 6 weeks

Regards,
Dr. Emily Chen
Remount Way Medical Practice
32-36 Remount Way, Cranbourne West VIC 3977`,
      attachments: [{
        filename: "COC-Jacob-Gunn-01Dec2025-SETBACK.pdf",
        contentType: "application/pdf",
        sizeBytes: 17000,
        base64Data: makeFakeCertPdf(
          "Jacob Gunn", "11/11/1990", "08250029242",
          "PARTIAL - Post-clearance SETBACK + mental health",
          "01/12/2025", "12/01/2026",
          "Thoracic muscle spasm (recurrence) + adjustment disorder",
          "Dr. Emily Chen", "32-36 Remount Way, Cranbourne West VIC 3977"
        ),
      }],
    },

    // Day 154: Employer concern
    {
      day: 154,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Jacob Gunn - Setback Management Plan Needed",
      bodyText: `Hi Team,

Very disappointing news about Jacob's setback. He was only back at full duties for 4 weeks before the relapse.

New concerns:
1. The mental health component is new - he wasn't showing any psychological symptoms before clearance
2. Jacob told me he's anxious about "breaking again" every time he lifts something
3. He's sleeping poorly and having trouble concentrating at work
4. We've moved him back to light duties but he's demoralised

Requesting:
- Urgent case conference with treating GP
- Psychology referral through WorkCover if possible
- Updated RTW plan incorporating mental health support
- Guidance on managing post-clearance relapses under the Act

This case is becoming complex. We need a coordinated approach.

Amanda Clarke
HR Manager
Symmetry HR`,
    },
  ],
};

// ============================================================================
// Scenario 2: Melad Hussaini - Lumbar Disc Bulges (Real Data)
// Claim #08250027189 | DOB: 5/4/2006 | Hampton Park VIC
// 6 COCs + Centrelink: UNFIT x5 -> PARTIAL
// ============================================================================

const meladHussainiScenario: Scenario = {
  id: "melad-hussaini",
  name: "Real Case - Lumbar Disc Bulges (Melad Hussaini)",
  worker: "Melad Hussaini",
  company: "Symmetry HR",
  durationWeeks: 22,
  baseDate: "2025-09-21",
  emails: [
    // Day 0: Employer reports injury
    {
      day: 0,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "Injury Report: Melad Hussaini - Chronic Lower Back Pain",
      bodyText: `Hi GPNet Team,

Reporting a workplace injury claim for Melad Hussaini.

Worker: Melad Hussaini
DOB: 5/04/2006 (19 years old)
Address: 33 Gandin Ct, Hampton Park, VIC 3976
Date of Injury: 20/01/2025

Description of Injury:
Melad reports chronic lower back pain with bilateral leg pain that he says happened at work approximately 8 months ago. He has also reported right shoulder and neck pain. He presented to Dandenong West Medical Centre where the GP has assessed chronic lower back pain.

Note: There is a gap between the reported injury date (January 2025) and first medical certificate (September 2025) - Melad may have been self-managing initially or treated elsewhere before presenting for a WorkCover certificate.

CT scan results (dated 4/08/2025):
- Multilevel disc bulges, more marked at L4/L5 and L5/S1
- Abutment of bilateral L5 and S1 traversing nerve roots
- Recommendation for trial of CT guided steroid injection

This is concerning given Melad's young age (19 years).

Kind regards,
Amanda Clarke
HR Manager
Symmetry HR`,
      _isFirstEmail: true,
    },

    // Day 1: COC #1 - Dr Hamimi - UNFIT (22/9/25 - 6/10/25)
    {
      day: 1,
      fromEmail: "reception@dandenongwest.local",
      fromName: "Dr. Qasim M. Hamimi (Dandenong West Medical)",
      subject: "Medical Certificate - Melad Hussaini (Certificate of Capacity)",
      bodyText: `Dear Case Manager,

Certificate of Capacity for Melad H Hussaini.

Patient: Melad H Hussaini
DOB: 5/04/2006
Claim Number: Not yet known

Date of Examination: 22/09/2025

Diagnosis: Chronic lower back pain, both leg pain. CT reported multilevel disc bulge more marked at L4/L5, L5/S1. He said it happened at work 9 months ago. Right shoulder pain/neck pain.

Work Capacity: HAS NO CURRENT WORK CAPACITY (UNFIT)
Period: 22/09/2025 to 06/10/2025

Physical Function Assessment:
- Sit: CAN
- Stand/Walk: CAN (but also CANNOT marked - intermittent)
- Bend: WITH MODIFICATIONS
- Squat: CAN
- Kneel: CAN
- Reach above shoulder: WITH MODIFICATIONS
- Use injured arm/hand: CAN
- Lift: CANNOT
- Neck movement: WITH MODIFICATIONS

Mental Health: All NOT AFFECTED

Treatment Plan: Pain killer, physio

Regards,
Dr. Qasim M. Hamimi, M.D., A.M.C., F.R.A.C.G.P
Dandenong West Medical Centre
73 Hemmings Street, Dandenong VIC 3175
Provider: 233064CX
Ph: 03 9791 2377`,
      attachments: [{
        filename: "COC-Melad-Hussaini-22Sep2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 16000,
        base64Data: makeFakeCertPdf(
          "Melad H Hussaini", "05/04/2006", "?",
          "UNFIT - No current work capacity",
          "22/09/2025", "06/10/2025",
          "Chronic LBP, bilateral leg pain, L4/L5 L5/S1 disc bulges, R shoulder/neck pain",
          "Dr. Qasim M. Hamimi", "73 Hemmings St, Dandenong VIC 3175"
        ),
      }],
    },

    // Day 18: COC #2 - UNFIT (7/10/25 - 6/11/25) + Centrelink cert
    {
      day: 18,
      fromEmail: "reception@dandenongwest.local",
      fromName: "Dr. Qasim M. Hamimi (Dandenong West Medical)",
      subject: "Updated Certificate - Melad Hussaini (Continued Unfit)",
      bodyText: `Dear Case Manager,

Renewed Certificate of Capacity for Melad Hussaini.

Claim Number: Still pending ("?")
Date of Examination: 09/10/2025

Diagnosis: Unchanged - Chronic lower back pain, both leg pain. CT reported multilevel disc bulge more marked at L4/L5, L5/S1. Right shoulder pain/neck pain.

Work Capacity: HAS NO CURRENT WORK CAPACITY (UNFIT)
Period: 07/10/2025 to 06/11/2025

Physical function and treatment unchanged from previous certificate.

Note: A separate Centrelink Medical Certificate (SU415) has also been issued today covering 09/10/2025 to 09/01/2026, with functional duration listed as "more than 13 weeks and up to 24 months". This reflects the expected long-term nature of this condition.

Regards,
Dr. Qasim M. Hamimi
Dandenong West Medical Centre`,
      attachments: [{
        filename: "COC-Melad-Hussaini-09Oct2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 16000,
        base64Data: makeFakeCertPdf(
          "Melad H Hussaini", "05/04/2006", "?",
          "UNFIT - No current work capacity",
          "07/10/2025", "06/11/2025",
          "Chronic LBP, bilateral leg pain, L4/L5 L5/S1 disc bulges",
          "Dr. Qasim M. Hamimi", "73 Hemmings St, Dandenong VIC 3175"
        ),
      }],
    },

    // Day 28: Employer update on young worker
    {
      day: 28,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Melad Hussaini - Concern About Young Worker, No Progress",
      bodyText: `Hi Team,

Growing concern about Melad Hussaini's case:

1. He's only 19 years old with multilevel disc bulges - this is unusual and concerning for someone so young
2. No improvement after initial certificate period
3. Treatment plan seems limited - just "pain killer, physio"
4. CT scan showed significant pathology (L4/L5 and L5/S1 with nerve root abutment)
5. CT recommendation for steroid injection hasn't been actioned as far as we know
6. Claim number still not assigned

Questions:
- Should we request a specialist (orthopaedic or pain management) referral?
- Is the current treatment plan adequate for this level of pathology?
- Can we get the claim number expedited?
- What support services are available for young workers on long-term WorkCover?

Melad is frustrated and isolated. He doesn't have much family support.

Amanda Clarke`,
    },

    // Day 56: COC #3 - UNFIT (7/11/25 - 4/12/25) - claim number assigned
    {
      day: 56,
      fromEmail: "reception@dandenongwest.local",
      fromName: "Dr. Qasim M. Hamimi (Dandenong West Medical)",
      subject: "Certificate Renewal - Melad Hussaini (Claim Number Assigned)",
      bodyText: `Dear Case Manager,

Renewed Certificate of Capacity for Melad Hussaini.

Claim Number: 08250027189 (now assigned)
Date of Examination: 17/11/2025

Diagnosis: Unchanged - Chronic lower back pain, both leg pain. CT reported multilevel disc bulge more marked at L4/L5, L5/S1. Right shoulder pain/neck pain.

Work Capacity: HAS NO CURRENT WORK CAPACITY (UNFIT)
Period: 07/11/2025 to 04/12/2025

No change in physical function or treatment plan. Worker continues with pain management and physiotherapy.

Regards,
Dr. Qasim M. Hamimi
Dandenong West Medical Centre`,
      attachments: [{
        filename: "COC-Melad-Hussaini-17Nov2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Melad H Hussaini", "05/04/2006", "08250027189",
          "UNFIT - No current work capacity",
          "07/11/2025", "04/12/2025",
          "Chronic LBP, bilateral leg pain, L4/L5 L5/S1 disc bulges",
          "Dr. Qasim M. Hamimi", "73 Hemmings St, Dandenong VIC 3175"
        ),
      }],
    },

    // Day 74: COC #4 - UNFIT (5/12/25 - 31/12/25)
    {
      day: 74,
      fromEmail: "reception@dandenongwest.local",
      fromName: "Dr. Qasim M. Hamimi (Dandenong West Medical)",
      subject: "Certificate Renewal - Melad Hussaini (Continued Unfit)",
      bodyText: `Dear Case Manager,

Renewed Certificate of Capacity for Melad Hussaini.

Claim: 08250027189
Date of Examination: 05/12/2025

Diagnosis: Unchanged.
Work Capacity: UNFIT - No current work capacity
Period: 05/12/2025 to 31/12/2025

No change in condition or treatment plan. Fourth consecutive UNFIT certificate.

Regards,
Dr. Qasim M. Hamimi
Dandenong West Medical Centre`,
      attachments: [{
        filename: "COC-Melad-Hussaini-05Dec2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Melad H Hussaini", "05/04/2006", "08250027189",
          "UNFIT - No current work capacity (4th consecutive)",
          "05/12/2025", "31/12/2025",
          "Chronic LBP, bilateral leg pain, L4/L5 L5/S1 disc bulges",
          "Dr. Qasim M. Hamimi", "73 Hemmings St, Dandenong VIC 3175"
        ),
      }],
    },

    // Day 94: COC #5 - Dr Peter Li (new doctor) - UNFIT (1/1/26 - 28/1/26)
    {
      day: 94,
      fromEmail: "reception@dandenongwest.local",
      fromName: "Dr. Peter Li (Dandenong West Medical)",
      subject: "Certificate Renewal - Melad Hussaini (New Treating Doctor)",
      bodyText: `Dear Case Manager,

Certificate of Capacity for Melad Hussaini. Please note I am taking over as the certifying practitioner from Dr Hamimi, at the same practice.

Claim: 08250027189
Date of Examination: 24/12/2025

Diagnosis: Chronic lower back pain, both leg pain. CT reported multilevel disc bulge more marked at L4/L5, L5/S1. Right shoulder pain/neck pain.

Work Capacity: HAS NO CURRENT WORK CAPACITY (UNFIT)
Period: 01/01/2026 to 28/01/2026

Physical function and treatment plan unchanged.

Regards,
Dr. Peter Li
Dandenong West Medical Centre
73 Hemmings Street, Dandenong VIC 3175
Provider: 217071BK`,
      attachments: [{
        filename: "COC-Melad-Hussaini-24Dec2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Melad H Hussaini", "05/04/2006", "08250027189",
          "UNFIT - No current work capacity (new doctor)",
          "01/01/2026", "28/01/2026",
          "Chronic LBP, bilateral leg pain, L4/L5 L5/S1 disc bulges",
          "Dr. Peter Li", "73 Hemmings St, Dandenong VIC 3175"
        ),
      }],
    },

    // Day 114: COC #6 - Dr Peter Li - PARTIAL CAPACITY! (13/1/26 - 19/2/26)
    {
      day: 114,
      fromEmail: "reception@dandenongwest.local",
      fromName: "Dr. Peter Li (Dandenong West Medical)",
      subject: "Updated Certificate - Melad Hussaini (PARTIAL CAPACITY - Breakthrough)",
      bodyText: `Dear Case Manager,

SIGNIFICANT UPDATE: Melad Hussaini has been upgraded to PARTIAL CAPACITY.

Claim: 08250027189
Date of Examination: 13/01/2026

Diagnosis: Chronic lower back pain, both leg pain. CT reported multilevel disc bulge more marked at L4/L5, L5/S1. Right shoulder pain/neck pain.

Work Capacity: HAS CAPACITY FOR SUITABLE EMPLOYMENT (PARTIAL)
Period: 13/01/2026 to 19/02/2026

RTW Discussion: Discussed on conference - 4 to 5 hours a day, 2 days a week, light duties as per RTW program.

Recommended capacity: 8-10 hours per week (4-5 hours x 2 days)

Physical Function Assessment: Unchanged from previous certificates:
- CAN: Sit, Stand/Walk, Squat, Kneel, Use arm/hand
- WITH MODIFICATIONS: Bend, Reach above shoulder, Neck movement
- CANNOT: Lift

This is the first upgrade to partial capacity after 5 consecutive UNFIT certificates spanning approximately 4 months. This represents the beginning of a graduated RTW pathway.

Regards,
Dr. Peter Li
Dandenong West Medical Centre
73 Hemmings Street, Dandenong VIC 3175`,
      attachments: [{
        filename: "COC-Melad-Hussaini-13Jan2026-PARTIAL.pdf",
        contentType: "application/pdf",
        sizeBytes: 16000,
        base64Data: makeFakeCertPdf(
          "Melad H Hussaini", "05/04/2006", "08250027189",
          "PARTIAL - 4-5hrs/day, 2 days/week, light duties",
          "13/01/2026", "19/02/2026",
          "Chronic LBP, bilateral leg pain, L4/L5 L5/S1 disc bulges",
          "Dr. Peter Li", "73 Hemmings St, Dandenong VIC 3175"
        ),
      }],
    },

    // Day 121: Employer RTW plan for Melad
    {
      day: 121,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Melad Hussaini - RTW Plan for Partial Capacity",
      bodyText: `Hi Team,

Great news - after 4 months fully off work, Melad has been cleared for partial duties.

RTW Plan:
- 2 days per week (Tuesday & Thursday)
- 4-5 hours per day
- Light duties only: data entry, phone tasks, light admin
- No lifting whatsoever
- Seated work with regular standing breaks
- Modified reaching tasks only

Melad was emotional when we told him he could come back. Being 19 and off work for this long has been very isolating for him.

We've arranged a buddy system with a colleague and he'll have a dedicated ergonomic workstation.

Next certificate review: 19/02/2026

Amanda Clarke
HR Manager
Symmetry HR`,
    },
  ],
};

// ============================================================================
// Scenario 3: Andres Nieto - Finger Tendinopathy + Trigger Finger (Real Data)
// Claim #08240066969 | DOB: 7/7/1996 | Sunshine VIC
// 14+ COCs: UNFIT x4 -> PARTIAL x10+ -> RTW 100%
// ============================================================================

const andresNietoScenario: Scenario = {
  id: "andres-nieto",
  name: "Real Case - Finger Tendinopathy (Andres Nieto)",
  worker: "Andres Nieto",
  company: "Symmetry HR",
  durationWeeks: 44,
  baseDate: "2025-03-18",
  emails: [
    // Day 0: PACT/EIP filing
    {
      day: 0,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "Injury Report: Andres Nieto - Right Hand Tendinitis at Workplace",
      bodyText: `Hi GPNet Team,

Reporting a workplace injury for Andres Fabian Gutierrez Nieto (goes by Andres Nieto).

Worker: Andres Fabian Gutierrez Nieto
DOB: 07/07/1996 (28 years old)
Address: 25B Sun Crescent, Sunshine, VIC 3020
Position: Labour hire worker (Symmetry HR placement)
Date of Injury: 18/03/2025

Description of Injury:
Andres has reported injury to his right hand and left hand following repetitive manual tasks. Initial assessment is bilateral hand tendinitis.

PACT (Prompt Action Commencement of Treatment) / Early Intervention Program form has been filed the day after injury (19/03/2025). Fast-tracking into WorkSafe early intervention pathway.

Andres has been seen by Dr Cesar Tan at 423 Ballarat Road, Sunshine. Certificate to follow.

Kind regards,
Amanda Clarke
HR Manager
Symmetry HR`,
      _isFirstEmail: true,
    },

    // Day 7: COC #1 - Dr Cesar Tan - UNFIT (25/3/25 - 8/4/25)
    {
      day: 7,
      fromEmail: "reception@ballaratrd.local",
      fromName: "Dr. Cesar Tan (Ballarat Road Medical)",
      subject: "Medical Certificate - Andres Nieto (Certificate of Capacity)",
      bodyText: `Dear Case Manager,

Certificate of Capacity for Andres Fabian Gutierrez Nieto.

Patient: Andres Fabian Gutierrez Nieto
DOB: 07/07/1996
Claim Number: Not yet known
Date of Injury: 18/03/2025
Date of Examination: 25/03/2025

Diagnosis: Injury of the right hand and left hand tendinitis

Work Capacity: HAS NO CURRENT WORK CAPACITY (UNFIT)
Period: 25/03/2025 to 08/04/2025

Physical Function Assessment:
- Sit: CAN
- Stand/Walk: CAN
- Bend: CAN
- Squat: CAN
- Kneel: CAN
- Reach above shoulder: CAN
- Use injured arm/hand: CANNOT
- Lift: CANNOT
- Neck movement: CANNOT

Mental Health: All NOT AFFECTED

Regards,
Dr. Cesar Tan
423 Ballarat Road, Sunshine VIC
Provider: 203749AT
Ph: 03 9312 3000`,
      attachments: [{
        filename: "COC-Andres-Nieto-25Mar2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "pending",
          "UNFIT - No current work capacity",
          "25/03/2025", "08/04/2025",
          "Injury R hand + L hand tendinitis",
          "Dr. Cesar Tan", "423 Ballarat Road, Sunshine VIC"
        ),
      }],
    },

    // Day 21: COC #2 - Dr Kuku takes over - UNFIT (9/4/25 - 11/4/25) gap fill
    {
      day: 21,
      fromEmail: "reception@durhamrd.local",
      fromName: "Dr. Babatunde Kuku (Durham Road Medical)",
      subject: "Medical Certificate - Andres Nieto (Gap Coverage)",
      bodyText: `Dear Case Manager,

Short-duration Certificate of Capacity for Andres Gutierrez Nieto to cover gap period.

Claim Number: Pending
Date of Examination: ~09/04/2025

Diagnosis: Right middle finger tendinitis (refined from initial bilateral hand tendinitis diagnosis)

Work Capacity: UNFIT
Period: 09/04/2025 to 11/04/2025 (2-day coverage)

Note: I am taking over as Andres's treating GP from Dr Cesar Tan. He will be seen at our practice going forward.

Treatment: Physiotherapy / Analgesic / Splint commenced.

Regards,
Dr. Babatunde Kuku
134 Durham Road, Sunshine 3020
Provider: 4678736H
Ph: 03 9310 2389`,
      attachments: [{
        filename: "COC-Andres-Nieto-gap-Apr2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "pending",
          "UNFIT - Gap coverage (2 days)",
          "09/04/2025", "11/04/2025",
          "Right middle finger tendinitis",
          "Dr. Babatunde Kuku", "134 Durham Road, Sunshine 3020"
        ),
      }],
    },

    // Day 28: COC #3 - Dr Kuku - UNFIT (12/4/25 - 28/4/25)
    {
      day: 28,
      fromEmail: "reception@durhamrd.local",
      fromName: "Dr. Babatunde Kuku (Durham Road Medical)",
      subject: "Certificate Renewal - Andres Nieto (Continued Unfit)",
      bodyText: `Dear Case Manager,

Renewed Certificate of Capacity for Andres Gutierrez Nieto.

Date of Examination: 15/04/2025

Diagnosis: Right middle finger tendinitis
Work Capacity: UNFIT
Period: 12/04/2025 to 28/04/2025

Physical: Sit=CAN, Stand=CAN, Bend=CAN, Squat=CAN, Kneel=WITH MODIFICATIONS, Reach above shoulder=WITH MODIFICATIONS, Use arm/hand=CANNOT, Lift=CANNOT, Neck=CAN

Treatment: Physiotherapy / Analgesic / Splint

Regards,
Dr. Babatunde Kuku`,
      attachments: [{
        filename: "COC-Andres-Nieto-15Apr2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "pending",
          "UNFIT - No current work capacity",
          "12/04/2025", "28/04/2025",
          "Right middle finger tendinitis",
          "Dr. Babatunde Kuku", "134 Durham Road, Sunshine 3020"
        ),
      }],
    },

    // Day 38: COC #4 - Dr Kuku - UNFIT (26/4/25 - 23/5/25)
    {
      day: 38,
      fromEmail: "reception@durhamrd.local",
      fromName: "Dr. Babatunde Kuku (Durham Road Medical)",
      subject: "Certificate Renewal - Andres Nieto (Last UNFIT Certificate)",
      bodyText: `Dear Case Manager,

Renewed Certificate of Capacity for Andres Gutierrez Nieto.

Date of Examination: 26/04/2025

Diagnosis: Right middle finger tendinitis
Work Capacity: UNFIT
Period: 26/04/2025 to 23/05/2025

This is the last UNFIT certificate I anticipate issuing. Andres has been referred to physiotherapy and I expect him to transition to partial capacity at next review.

Regards,
Dr. Babatunde Kuku`,
      attachments: [{
        filename: "COC-Andres-Nieto-26Apr2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "UNFIT - Final unfit certificate expected",
          "26/04/2025", "23/05/2025",
          "Right middle finger tendinitis",
          "Dr. Babatunde Kuku", "134 Durham Road, Sunshine 3020"
        ),
      }],
    },

    // Day 42: Insurer acceptance
    {
      day: 42,
      fromEmail: "claims@dxc.local",
      fromName: "DXC Claims Team",
      subject: "Andres Nieto - Claim 08240066969 - Worker Acceptance",
      bodyText: `Dear Claims Manager,

RE: Andres Fabian Gutierrez Nieto - Claim #08240066969

This letter confirms that the worker's claim has been ACCEPTED.

Andres is entitled to weekly payments and reasonable medical and like expenses as per the Workplace Injury Rehabilitation and Compensation Act 2013.

An employer pend letter has been separately sent to Symmetry HR.

Please ensure all certificates of capacity are forwarded to our office promptly.

DXC Claims Administration`,
    },

    // Day 68: COC #5 - Nathan Malkoun (Physio) - FIRST PARTIAL! (24/5/25 - 20/6/25)
    {
      day: 68,
      fromEmail: "reception@hobsonsbay.local",
      fromName: "Nathan Malkoun (Hobsons Bay Physiotherapy)",
      subject: "Certificate of Capacity - Andres Nieto (PARTIAL - Physio Certified)",
      bodyText: `Dear Case Manager,

Certificate of Capacity for Andres Gutierrez Nieto. Please note this certificate is being issued by the treating physiotherapist under the WorkSafe Victoria guidelines.

Claim: 08240066969
Date of Examination: 27/05/2025

Diagnosis: R) 3rd & 4th digit flexor tendinopathy + trigger finger
(Updated from simple "tendinitis" - the condition has been properly diagnosed as flexor tendinopathy with trigger finger)

Work Capacity: HAS CAPACITY FOR SUITABLE EMPLOYMENT (PARTIAL)
Period: 24/05/2025 to 20/06/2025

Physical Function:
- Sit: CAN
- Stand/Walk: CAN
- Bend: CAN
- Squat: CAN
- Kneel: CAN
- Reach above shoulder: CAN
- Use injured arm/hand: CANNOT
- Lift: WITH MODIFICATIONS
- Neck movement: CAN

Treatment: Physiotherapy + Home Exercise Program (HEP)

This is a significant milestone - Andres has transitioned from UNFIT (2 months) to PARTIAL capacity. He can undertake suitable employment that does not require use of his injured right hand for gripping, lifting, or repetitive movements.

Regards,
Nathan Malkoun
Physiotherapist
Hobsons Bay Physiotherapy
S8, 6/230 Blackshaws Rd, Altona North VIC 3025
Provider: 6237121W`,
      attachments: [{
        filename: "COC-Andres-Nieto-27May2025-PARTIAL.pdf",
        contentType: "application/pdf",
        sizeBytes: 16000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Suitable employment (physio certified)",
          "24/05/2025", "20/06/2025",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Nathan Malkoun (Physiotherapist)", "Hobsons Bay Physiotherapy, Altona North"
        ),
      }],
    },

    // Day 78: Employer RTW
    {
      day: 78,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Andres Nieto - RTW Plan Commenced (Modified Duties)",
      bodyText: `Hi Team,

Andres started modified duties this week.

RTW Plan:
- Light duties that don't require right hand gripping/lifting
- Using left hand primarily for tasks
- Data entry, phone tasks, admin work
- Gradually building up hours

The trigger finger diagnosis explains why recovery has been slow - it's more complex than simple tendinitis. Physio is now the primary certifier which is common in graduated RTW cases under WorkSafe.

Amanda`,
    },

    // Day 80: COC #6 - Physio - PARTIAL (10/6/25 - 7/7/25)
    {
      day: 80,
      fromEmail: "reception@hobsonsbay.local",
      fromName: "Nathan Malkoun (Hobsons Bay Physiotherapy)",
      subject: "Certificate Renewal - Andres Nieto (Partial Capacity Continued)",
      bodyText: `Dear Case Manager,

Renewed Certificate of Capacity for Andres Gutierrez Nieto.

Claim: 08240066969
Date of Examination: 06/06/2025

Work Capacity: PARTIAL - Suitable employment
Period: 10/06/2025 to 07/07/2025

Continued physio + HEP. Steady progress with finger mobility.

Nathan Malkoun, Physiotherapist
Hobsons Bay Physiotherapy`,
      attachments: [{
        filename: "COC-Andres-Nieto-06Jun2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Suitable employment (continued)",
          "10/06/2025", "07/07/2025",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Nathan Malkoun (Physiotherapist)", "Hobsons Bay Physiotherapy"
        ),
      }],
    },

    // Day 105: COC #7 - Amended (July 1)
    {
      day: 105,
      fromEmail: "reception@hobsonsbay.local",
      fromName: "Nathan Malkoun (Hobsons Bay Physiotherapy)",
      subject: "Amended Certificate - Andres Nieto (COC July 2025)",
      bodyText: `Dear Case Manager,

Amended Certificate of Capacity for Andres Gutierrez Nieto.

Claim: 08240066969
Date: 01/07/2025

This is an amended certificate correcting the previous certificate dates. Work capacity remains PARTIAL with suitable employment.

Continued physio treatment. Trigger finger symptoms gradually improving with targeted exercises.

Nathan Malkoun, Physiotherapist`,
      attachments: [{
        filename: "COC-Andres-Nieto-01Jul2025-amended.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Amended certificate",
          "07/07/2025", "24/07/2025",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Nathan Malkoun (Physiotherapist)", "Hobsons Bay Physiotherapy"
        ),
      }],
    },

    // Day 128: COC #8 - July 24
    {
      day: 128,
      fromEmail: "reception@hobsonsbay.local",
      fromName: "Nathan Malkoun (Hobsons Bay Physiotherapy)",
      subject: "Certificate Renewal - Andres Nieto (Continued PARTIAL, July)",
      bodyText: `Dear Case Manager,

Certificate of Capacity renewal for Andres Gutierrez Nieto.

Claim: 08240066969
Date: 24/07/2025

Work Capacity: PARTIAL - Suitable employment continued
Ongoing physio and home exercise program. Good compliance from Andres.

Nathan Malkoun, Physiotherapist`,
      attachments: [{
        filename: "COC-Andres-Nieto-24Jul2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Suitable employment",
          "24/07/2025", "22/08/2025",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Nathan Malkoun (Physiotherapist)", "Hobsons Bay Physiotherapy"
        ),
      }],
    },

    // Day 157: COC #9 - August 22
    {
      day: 157,
      fromEmail: "reception@hobsonsbay.local",
      fromName: "Nathan Malkoun (Hobsons Bay Physiotherapy)",
      subject: "Certificate Renewal - Andres Nieto (Month 5 PARTIAL)",
      bodyText: `Dear Case Manager,

Certificate of Capacity renewal.

Claim: 08240066969
Date: 22/08/2025

Work Capacity: PARTIAL - Suitable employment
Period continuing through to next review.

5 months into partial capacity. Finger mobility improving but trigger finger still present. Considering whether surgical consult may be needed.

Nathan Malkoun, Physiotherapist`,
      attachments: [{
        filename: "COC-Andres-Nieto-22Aug2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Month 5 (trigger finger persisting)",
          "22/08/2025", "~Sept 2025",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Nathan Malkoun (Physiotherapist)", "Hobsons Bay Physiotherapy"
        ),
      }],
    },

    // Day 180: Occ rehab status report
    {
      day: 180,
      fromEmail: "rehab@ams.local",
      fromName: "AMS Occupational Rehabilitation (Ref: 30659)",
      subject: "Status Report - Andres Nieto, CN 08240066969 (AMS Ref 30659)",
      bodyText: `Dear Case Manager,

Occupational Rehabilitation Status Report

Worker: Andres Fabian Gutierrez Nieto
Claim: 08240066969
AMS Reference: 30659
Employer: Symmetry HR

Current Status:
- Andres continues in modified duties role
- Good engagement with physiotherapy and home exercise program
- Trigger finger symptoms gradually improving
- Currently working partial hours in suitable employment

Workplace Assessment:
- Suitable duties available and being performed
- Employer supportive and accommodating
- Worker motivated and cooperative

Recommendations:
- Continue current treatment plan
- Gradual increase in hand usage as tolerated
- Monitor for need for surgical intervention (trigger finger release)
- Target: Progressive increase toward full pre-injury duties

Next Status Report: 4 weeks

AMS Occupational Rehabilitation
Reference: 30659`,
    },

    // Day 225: COC - valid until 17 Nov
    {
      day: 225,
      fromEmail: "reception@durhamrd.local",
      fromName: "Dr. Babatunde Kuku (Durham Road Medical)",
      subject: "Certificate Renewal - Andres Nieto (PARTIAL, Valid Until Nov 17)",
      bodyText: `Dear Case Manager,

Certificate of Capacity renewal.

Claim: 08240066969

Work Capacity: PARTIAL - Suitable employment
Valid Until: 17/11/2025

Andres continues in partial capacity. The trigger finger is slowly responding to conservative treatment. He is performing well in his modified role.

Dr. Babatunde Kuku
134 Durham Road, Sunshine 3020`,
      attachments: [{
        filename: "COC-Andres-Nieto-valid-17Nov2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Suitable employment",
          "~Oct 2025", "17/11/2025",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Dr. Babatunde Kuku", "134 Durham Road, Sunshine 3020"
        ),
      }],
    },

    // Day 240: COC - Nov 13
    {
      day: 240,
      fromEmail: "reception@durhamrd.local",
      fromName: "Dr. Babatunde Kuku (Durham Road Medical)",
      subject: "Certificate Renewal - Andres Nieto (Nov 2025)",
      bodyText: `Dear Case Manager,

Certificate of Capacity renewal for Andres Gutierrez Nieto.

Claim: 08240066969
Date: 13/11/2025

Work Capacity: PARTIAL - Suitable employment continued
Period: Through to early December 2025

Progress is steady. 8 months in partial capacity now. Andres is gradually taking on more hand-intensive tasks.

Dr. Babatunde Kuku`,
      attachments: [{
        filename: "COC-Andres-Nieto-13Nov2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Month 8",
          "13/11/2025", "~Dec 2025",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Dr. Babatunde Kuku", "134 Durham Road, Sunshine 3020"
        ),
      }],
    },

    // Day 262: COC - Dec 6 (worker engaged in work)
    {
      day: 262,
      fromEmail: "reception@durhamrd.local",
      fromName: "Dr. Babatunde Kuku (Durham Road Medical)",
      subject: "Certificate Renewal - Andres Nieto (Dec 2025, Worker Engaged)",
      bodyText: `Dear Case Manager,

Certificate of Capacity renewal.

Claim: 08240066969
Date of Examination: 06/12/2025

Work Capacity: PARTIAL - Suitable employment
Period: 11/12/2025 to 07/01/2026

IMPORTANT NOTE: Andres has declared that YES, he HAS engaged in work. He is actively working in his modified role and making good progress.

Physical Function:
- Use injured arm/hand: STILL CANNOT
- Lift: STILL CANNOT
- All other functions: CAN or WITH MODIFICATIONS

Dr. Babatunde Kuku
134 Durham Road, Sunshine 3020`,
      attachments: [{
        filename: "COC-Andres-Nieto-06Dec2025.pdf",
        contentType: "application/pdf",
        sizeBytes: 15000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Worker engaged in work",
          "11/12/2025", "07/01/2026",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Dr. Babatunde Kuku", "134 Durham Road, Sunshine 3020"
        ),
      }],
    },

    // Day 298: COC - Jan 10, 2026 (latest)
    {
      day: 298,
      fromEmail: "reception@durhamrd.local",
      fromName: "Dr. Babatunde Kuku (Durham Road Medical)",
      subject: "Certificate Renewal - Andres Nieto (January 2026)",
      bodyText: `Dear Case Manager,

Certificate of Capacity renewal.

Claim: 08240066969
Date: 10/01/2026

Work Capacity: PARTIAL - Suitable employment continued
Period: From 10/01/2026

Andres continues in partial capacity. Now approaching 10 months since injury. The trigger finger has improved significantly with conservative treatment.

Dr. Babatunde Kuku`,
      attachments: [{
        filename: "COC-Andres-Nieto-10Jan2026.pdf",
        contentType: "application/pdf",
        sizeBytes: 14000,
        base64Data: makeFakeCertPdf(
          "Andres F Gutierrez Nieto", "07/07/1996", "08240066969",
          "PARTIAL - Month 10",
          "10/01/2026", "~Feb 2026",
          "R 3rd & 4th digit flexor tendinopathy + trigger finger",
          "Dr. Babatunde Kuku", "134 Durham Road, Sunshine 3020"
        ),
      }],
    },

    // Day 300: RTW 100% notification from occ rehab
    {
      day: 300,
      fromEmail: "rehab@ams.local",
      fromName: "AMS Occupational Rehabilitation (Ref: 30659)",
      subject: "RTW 100% PIH Notification - Andres Nieto, CN 08240066969",
      bodyText: `Dear Case Manager,

RTW 100% Pre-Injury Hours Notification

Worker: Andres Fabian Gutierrez Nieto
Claim: 08240066969
AMS Reference: 30659

This notification confirms that Andres has achieved RETURN TO WORK at 100% of his pre-injury hours.

Despite the extended PARTIAL capacity period (approximately 8 months), Andres has progressively increased his duties and hours and is now working at full pre-injury capacity.

This is a successful rehabilitation outcome. Service closure will follow.

AMS Occupational Rehabilitation`,
    },

    // Day 305: Service closure
    {
      day: 305,
      fromEmail: "rehab@ams.local",
      fromName: "AMS Occupational Rehabilitation (Ref: 30659)",
      subject: "Service Closure - Andres Nieto, CN 08240066969 (Case Complete)",
      bodyText: `Dear Case Manager,

Service Closure Notification

Worker: Andres Fabian Gutierrez Nieto
Claim: 08240066969
AMS Reference: 30659
Employer: Symmetry HR

Reason for Closure: Successful RTW at 100% pre-injury hours

Case Summary:
- Date of injury: 18/03/2025
- Initial diagnosis: Bilateral hand tendinitis
- Final diagnosis: R 3rd & 4th digit flexor tendinopathy + trigger finger
- UNFIT period: 25/03/2025 to 23/05/2025 (approximately 2 months)
- PARTIAL period: 24/05/2025 to ~January 2026 (approximately 8 months)
- RTW 100% achieved: January 2026
- Total case duration: approximately 10 months

Key factors in successful outcome:
1. Early PACT/EIP engagement (day after injury)
2. Comprehensive physiotherapy with Nathan Malkoun
3. Employer flexibility in providing suitable modified duties
4. Worker motivation and compliance with treatment
5. Good coordination between GP, physio, and occ rehab provider

Occupational rehabilitation services are now closed.

AMS Occupational Rehabilitation
Reference: 30659`,
    },

    // Day 310: Employer confirmation
    {
      day: 310,
      fromEmail: "employer@symmetry.local",
      fromName: "Amanda Clarke (Symmetry HR)",
      subject: "RE: Andres Nieto - Full RTW Confirmed, Case Closure",
      bodyText: `Hi Team,

Confirming Andres Nieto has fully returned to pre-injury duties.

Case Summary:
- 10-month case for what started as "hand tendinitis" but was actually flexor tendinopathy with trigger finger
- 2 months UNFIT + 8 months PARTIAL = longest case in our portfolio
- 3 different certifiers (initial GP, ongoing GP, physiotherapist)
- Successful outcome despite complexity

Lessons learned:
1. Trigger finger is more complex than simple tendinitis - accurate early diagnosis matters
2. Labour hire cases require extra coordination effort
3. Early intervention (PACT/EIP on Day 1) pays off even in complex cases
4. Long PARTIAL periods are OK if progressive improvement is demonstrated

Please close this case. Andres is performing well and grateful for the support.

Amanda Clarke
HR Manager
Symmetry HR`,
    },
  ],
};

// ============================================================================
// Scenario Runner
// ============================================================================

const ALL_SCENARIOS: Scenario[] = [jacobGunnScenario, meladHussainiScenario, andresNietoScenario];

async function sendEmail(email: DemoEmail, scenario: Scenario, threadMessageId?: string): Promise<string> {
  const messageId = `<real-${scenario.id}-day${email.day}-${Date.now()}@preventli.local>`;

  // Compute simulated receivedAt from scenario baseDate + day offset
  const baseMs = new Date(scenario.baseDate).getTime();
  const receivedAt = new Date(baseMs + email.day * 24 * 60 * 60 * 1000).toISOString();

  const payload: Record<string, any> = {
    messageId,
    fromEmail: email.fromEmail,
    fromName: email.fromName,
    toEmail: "claims@preventli.local",
    subject: email.subject,
    bodyText: email.bodyText,
    source: "demo",
    receivedAt,
  };

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
  const statusIcon = result.isNewCase ? "★" : result.certificateDetected ? "📋" : "→";
  console.log(`  [Day ${String(email.day).padStart(3)}] ${statusIcon} ${email.fromName}`);
  console.log(`          "${email.subject}"`);
  console.log(`          ${result.processingStatus} | Case: ${result.caseId || "pending"} | Match: ${result.matchMethod}`);
  if (result.isNewCase) console.log(`          ★ NEW CASE CREATED`);
  if (result.certificateDetected) console.log(`          📋 Certificate detected`);
  console.log();

  return messageId;
}

async function runScenario(scenario: Scenario, speed: "fast" | "slow"): Promise<void> {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  REAL CASE: ${scenario.name}`);
  console.log(`  Worker: ${scenario.worker} | Company: ${scenario.company}`);
  console.log(`  Duration: ${scenario.durationWeeks} weeks | Emails: ${scenario.emails.length}`);
  console.log(`${"═".repeat(70)}\n`);

  let threadMessageId: string | undefined;

  for (let i = 0; i < scenario.emails.length; i++) {
    const email = scenario.emails[i];

    if (speed === "slow" && i > 0) {
      const delayMs = Math.min(email.day * 50, 2000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    try {
      const msgId = await sendEmail(email, scenario, threadMessageId);
      if (email._isFirstEmail) {
        threadMessageId = msgId;
      }
    } catch (err) {
      console.error(`  [Day ${email.day}] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`✓ Scenario "${scenario.name}" complete (${scenario.emails.length} emails sent)\n`);
}

async function main(): Promise<void> {
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

  console.log(`\n🏥 Preventli REAL CASE Scenario Runner`);
  console.log(`   Based on OCR'd medical certificates from actual WorkCover cases`);
  console.log(`   Server: ${BASE_URL}`);
  console.log(`   Speed: ${speed}`);
  console.log(`   Scenario: ${scenarioId}\n`);

  // Health check
  try {
    const healthResp = await fetch(`${BASE_URL}/api/system/health`);
    if (!healthResp.ok) throw new Error(`Server returned ${healthResp.status}`);
    console.log(`✓ Server is running\n`);
  } catch {
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

  console.log(`${"═".repeat(70)}`);
  console.log(`✅ All done! ${totalEmails} emails across ${scenarios.length} real case(s) in ${elapsed}s`);
  console.log(`\nReal cases created:`);
  console.log(`  1. Jacob Gunn     - Thoracic spasm (claim #08250029242) - CLEARANCE + SETBACK`);
  console.log(`  2. Melad Hussaini - L4/L5 disc bulges (claim #08250027189) - UNFIT → PARTIAL`);
  console.log(`  3. Andres Nieto   - Trigger finger (claim #08240066969) - Full RTW achieved`);
  console.log(`\nLogin at ${BASE_URL} to view cases`);
  console.log(`${"═".repeat(70)}\n`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
