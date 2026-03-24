/**
 * Complex RTW Lifecycle — Canonical Data Model
 *
 * Worker: Daniel Marchetti, warehouse picker, Symmetry Manufacturing
 * Injury: Lumbar strain L4/L5 — lifted 20kg box off low shelf, awkward twist
 * Date of Injury: 15 Jan 2025 (Wednesday)
 * WorkSafe claim: Lodged Day 3
 *
 * This file defines the EXPECTED state of the system at each phase.
 * It is the single source of truth for lifecycle consistency tests.
 * If the live system disagrees with these values, that is a bug.
 *
 * Internal Consistency Rules (the Karpathy scoring dimensions):
 *   R1  Date chain: each cert_issue <= prior_cert_expiry + 7 (grace), cert_expiry > cert_issue
 *   R2  Risk monotonicity: XGBoost score rises when no improvement, falls on genuine progress
 *   R3  Risk badge unity: risk_tab == recovery_tab == dashboard (all from XGBoost threshold)
 *   R4  Capacity-status: capacity >= 50% → work_status must not be "Off Work"
 *   R5  Compliance-cert: cert expired > 14 days → compliance cannot be High or Medium
 *   R6  Stage-duration: stage bracket must match weeks_off (see STAGE_THRESHOLDS)
 *   R7  Action-age: recommended actions must be appropriate for case week (see ACTION_MATRIX)
 *   R8  XGBoost-badge: 0.00–0.30=Low, 0.31–0.60=Medium, 0.61–0.80=High, 0.81+=Very High
 *   R9  RTW% logic: RTW plan progress % must match documented plan activities (0 activities = 0%)
 *   R10 Suitable-duties paradox: employer cannot have "RTW Plan Approved" AND "No suitable duties"
 */

export const INJURY_DATE = new Date('2025-01-15');
export const WORKER_NAME = 'Daniel Marchetti';
export const EMPLOYER_NAME = 'Symmetry Manufacturing';
export const TREATING_GP = 'Dr. Sarah Kim — Brunswick Medical Centre';

// ─────────────────────────────────────────────────────────────
// STAGE THRESHOLDS (R6)
// ─────────────────────────────────────────────────────────────
export const STAGE_THRESHOLDS = {
  Intake:           { minWeeks: 0,  maxWeeks: 2  },
  Assessment:       { minWeeks: 3,  maxWeeks: 8  },
  ActiveTreatment:  { minWeeks: 9,  maxWeeks: 16 },
  RTWTransition:    { minWeeks: 17, maxWeeks: 26 },
  Maintenance:      { minWeeks: 27, maxWeeks: Infinity },
} as const;

// ─────────────────────────────────────────────────────────────
// XGBOOST → RISK BADGE MAPPING (R8)
// ─────────────────────────────────────────────────────────────
export function xgboostToBadge(score: number): string {
  if (score <= 0.30) return 'Low';
  if (score <= 0.60) return 'Medium';
  if (score <= 0.80) return 'High';
  return 'Very High';
}

// ─────────────────────────────────────────────────────────────
// APPROPRIATE ACTIONS BY CASE AGE (R7)
// ─────────────────────────────────────────────────────────────
export const ACTION_MATRIX = {
  week_0_6: [
    'Confirm WorkSafe claim reference number',
    'Schedule initial RTW coordinator meeting',
    'Request medical certificate from treating GP',
    'Identify suitable modified duties',
  ],
  week_7_12: [
    'Develop RTW plan (legally due Week 10)',
    'Follow up on RTW plan progress',
    'Schedule face-to-face review with worker and GP',
    'Request updated medical certificate',
  ],
  week_13_20: [
    'Refer for Independent Medical Examination (IME)',
    'Refer for vocational assessment',
    'Escalate to WorkSafe insurer',
    'Document suitable duties search outcome',
  ],
  week_21_plus: [
    'Issue formal written notice of non-compliance',
    'Notify insurer of non-compliance',
    'Obtain industrial relations advice before any formal action',
    'Complete pre-termination checklist before proceeding',
  ],
} as const;

// ─────────────────────────────────────────────────────────────
// MEDICAL CERTIFICATES
// ─────────────────────────────────────────────────────────────
export const CERTIFICATES = {
  cert1: {
    issued:      '2025-01-17', // Day 3 post-injury (first GP visit)
    expires:     '2025-01-31', // 2 weeks
    capacity:    0,
    status:      'Unfit for work',
    restrictions: ['No lifting >5kg', 'No prolonged standing >10min', 'No bending/twisting'],
    gp_notes:    'Acute lumbar strain. Rest advised. Review in 2 weeks.',
    // R1 check: issued(17 Jan) > injury_date(15 Jan) ✓
  },
  cert2: {
    issued:      '2025-01-30', // Day before cert1 expires (overlap of 1 day — valid)
    expires:     '2025-02-27', // 4 weeks (GP extending gap — no urgency)
    capacity:    0,
    status:      'Unfit for work',
    restrictions: ['No lifting >5kg', 'No prolonged standing >10min', 'No bending/twisting'],
    gp_notes:    'No significant improvement. Continuing rest and anti-inflammatories.',
    // EDGE CASE EC4: cert issued 1 day before prior cert expires — VALID overlap, system must accept
    // R1 check: issued(30 Jan) <= expiry_of_cert1(31 Jan) + 7 ✓
    // TRIGGER: Restrictions IDENTICAL to cert1 → system must flag "Unchanged restrictions — 2 certs"
  },
  cert3: {
    issued:      '2025-02-27', // Exactly on cert2 expiry — zero-day gap (valid but tight)
    expires:     '2025-03-27', // 4 weeks
    capacity:    15,
    status:      'Partially fit — modified duties',
    restrictions: ['No lifting >5kg', 'No bending/twisting', 'Seated work max 2h/day'],
    gp_notes:    'Physio commenced. Minimal improvement. Seated light duties may be trialled.',
    // EDGE CASE EC8: capacity=15% but worker may still be "Off Work" if employer has no suitable role
    // TRIGGER: First cert showing ANY capacity improvement — must not reset risk to Low
    // R1: issued(27 Feb) == expiry_of_cert2(27 Feb) — zero-day gap, borderline. System should accept.
  },
  cert4: {
    issued:      '2025-03-28', // 1 day after cert3 expires — 1-day gap (minor)
    expires:     '2025-04-28', // 4 weeks
    capacity:    30,
    status:      'Partially fit — modified duties',
    restrictions: ['No lifting >10kg', 'No bending/twisting', 'Seated work max 4h/day'],
    gp_notes:    'Slow improvement. Lifting restriction eased slightly. Suitable duties required.',
    // EDGE CASE EC7: restrictions slightly NARROWER than cert3 (5kg→10kg) — genuine improvement
    // TRIGGER: System should note "Restrictions improving — capacity 30%"
    // R1: issued(28 Mar) = expiry_of_cert3(27 Mar) + 1 — 1-day gap. System must NOT penalise compliance.
  },
  cert4_gap: {
    // EDGE CASE EC5: What if cert4 arrived 10 days after cert3 expired?
    issued:      '2025-04-06', // 10 days after cert3 expiry
    expires:     '2025-04-28',
    capacity:    30,
    status:      'Partially fit',
    restrictions: ['No lifting >10kg', 'Seated work max 4h/day'],
    gp_notes:    'As above.',
    // TRIGGER: 10-day cert gap → compliance drops to Medium
    // After 14 days → compliance drops to Low
    // System must generate action: "Certificate gap detected — request updated cert urgently"
  },
  cert_backdated: {
    // EDGE CASE EC17: Worker submits cert at Week 21 backdated by GP to cover Week 20 gap
    issued:      '2025-06-02',  // actual issue date
    valid_from:  '2025-05-15',  // backdated by GP
    expires:     '2025-06-30',
    capacity:    0,
    status:      'Unfit for work',
    restrictions: ['All previous restrictions apply'],
    gp_notes:    'Worker was unwell and unable to attend clinic. Certificate covers period from 15 May.',
    // Q: Does a backdated cert repair a compliance gap retroactively?
    // Expected behaviour: System accepts cert but logs "Backdated certificate — gap 15 May to 2 Jun covered by GP note"
    // Should NOT automatically restore compliance to High for the gap period
  },
} as const;

// ─────────────────────────────────────────────────────────────
// PHASE SNAPSHOTS
// Each phase defines the EXPECTED values across ALL system tabs.
// Any tab showing a different value = inconsistency bug.
// ─────────────────────────────────────────────────────────────

export interface PhaseSnapshot {
  phase: number;
  name: string;
  date: string;           // calendar date
  weeks_off: number;
  // Summary tab
  work_status: 'Off Work' | 'Modified Duties' | 'At Work';
  stage: keyof typeof STAGE_THRESHOLDS;
  compliance: 'High' | 'Medium' | 'Low' | 'Critical';
  next_step_due: string;  // must be in the future relative to phase date, or clearly overdue
  // Risk tab (must equal Recovery tab and Dashboard — R3)
  xgboost_score: number;
  risk_badge: string;     // derived from xgboost_score via R8
  risk_last_checked_max_age_days: number;
  // Recovery tab
  capacity_pct: number;   // must match cert capacity — R4
  rtw_achieved: boolean;
  weeks_expected: number; // baseline = 18 weeks for lumbar strain medium risk
  recovery_phase: string;
  // Compliance
  cert_on_file: boolean;
  cert_expired: boolean;
  cert_gap_days: number;  // days between certs (0 = no gap)
  // RTW Plan
  rtw_plan_status: 'Not Started' | 'In Progress' | 'Approved' | 'Overdue' | 'Completed';
  rtw_plan_pct: number;           // must reflect actual documented activities
  rtw_plan_deadline: string;      // 10 weeks from injury = 26 Mar 2025
  rtw_plan_days_overdue: number;  // 0 if not yet overdue
  // Actions (R7)
  expected_action_keywords: string[];  // at least one of these must appear in Next Recommended Action
  forbidden_action_keywords: string[]; // none of these should appear (wrong-era actions)
  // Suitable duties
  suitable_duties_status: 'Not Assessed' | 'Available' | 'Unavailable' | 'Trialling';
  // Edge cases active at this phase
  active_edge_cases: string[];
}

export const PHASES: PhaseSnapshot[] = [
  // ─────────────────────────────────────────────────────────────
  // PHASE 1 — Week 0–2: Claim Lodgement
  // ─────────────────────────────────────────────────────────────
  {
    phase: 1,
    name: 'Claim Lodgement',
    date: '2025-01-17',
    weeks_off: 1,
    work_status: 'Off Work',
    stage: 'Intake',
    compliance: 'High',        // cert on file, claim lodged, all good
    next_step_due: '2025-01-31', // cert renewal due
    xgboost_score: 0.22,       // low — fresh injury, compliant, GP cert within 3 days
    risk_badge: 'Low',         // 0.22 → Low (R8)
    risk_last_checked_max_age_days: 1,
    capacity_pct: 0,
    rtw_achieved: false,
    weeks_expected: 18,
    recovery_phase: 'Acute Phase',
    cert_on_file: true,
    cert_expired: false,
    cert_gap_days: 0,
    rtw_plan_status: 'Not Started',
    rtw_plan_pct: 0,
    rtw_plan_deadline: '2025-03-26', // 10 weeks from 15 Jan
    rtw_plan_days_overdue: 0,
    expected_action_keywords: ['WorkSafe claim', 'coordinator meeting', 'modified duties'],
    forbidden_action_keywords: ['IME', 'vocational', 'formal notice', 'termination'],
    suitable_duties_status: 'Not Assessed',
    active_edge_cases: ['EC1: cert issued Day 3 (not Day 0)'],
    // R-checks: R1✓ R3✓(all=Low) R4✓(0%→Off Work) R5✓(cert current→High) R6✓(1wk→Intake) R7✓ R8✓ R9✓(0%=0 activities)
  },

  // ─────────────────────────────────────────────────────────────
  // PHASE 2 — Week 6: Certificate Renewal, No Progress
  // ─────────────────────────────────────────────────────────────
  {
    phase: 2,
    name: 'Certificate Renewal — No Progress',
    date: '2025-02-26',
    weeks_off: 6,
    work_status: 'Off Work',
    stage: 'Assessment',
    compliance: 'Medium',      // cert on file but identical restrictions × 2 certs = stalled
    next_step_due: '2025-03-26', // RTW plan deadline approaching
    xgboost_score: 0.41,       // rising — no improvement at 6 weeks
    risk_badge: 'Medium',      // 0.41 → Medium (R8)
    risk_last_checked_max_age_days: 1,
    capacity_pct: 0,
    rtw_achieved: false,
    weeks_expected: 18,
    recovery_phase: 'Early Rehabilitation',
    cert_on_file: true,
    cert_expired: false,
    cert_gap_days: 0,          // cert2 issued day before cert1 expires (EC4)
    rtw_plan_status: 'Not Started',
    rtw_plan_pct: 0,
    rtw_plan_deadline: '2025-03-26',
    rtw_plan_days_overdue: 0,
    expected_action_keywords: ['RTW plan', 'GP review', 'unchanged restrictions'],
    forbidden_action_keywords: ['IME', 'formal notice', 'termination', 'insurer escalation'],
    suitable_duties_status: 'Not Assessed',
    active_edge_cases: [
      'EC4: cert2 issued 1 day before cert1 expires (valid overlap)',
      'EC6: restrictions IDENTICAL across 2 certs — system must flag stall',
    ],
    // R-checks: R1✓ R3✓(all=Medium) R4✓ R5✓ R6✓(6wk→Assessment) R7✓ R8✓ R9✓(0%=0 activities) R10✓
  },

  // ─────────────────────────────────────────────────────────────
  // PHASE 3 — Week 12: RTW Milestone Missed
  // ─────────────────────────────────────────────────────────────
  {
    phase: 3,
    name: 'RTW Milestone Missed',
    date: '2025-04-09',
    weeks_off: 12,
    work_status: 'Off Work',
    // EC8: capacity=15% but still Off Work — no suitable role available yet
    stage: 'ActiveTreatment',
    compliance: 'Low',         // RTW plan overdue + cert renewal due
    next_step_due: '2025-03-26', // PAST — RTW plan deadline was 14 days ago
    xgboost_score: 0.67,       // crossed into High — missed milestone, stalled
    risk_badge: 'High',        // 0.67 → High (R8)
    risk_last_checked_max_age_days: 1,
    capacity_pct: 15,          // cert3 shows first improvement — but Off Work still valid (R4: <50%)
    rtw_achieved: false,
    weeks_expected: 18,
    recovery_phase: 'Strengthening',
    cert_on_file: true,
    cert_expired: false,
    cert_gap_days: 0,          // cert3 issued on exact expiry of cert2
    rtw_plan_status: 'Overdue',
    rtw_plan_pct: 0,           // still 0 activities documented despite 14 days overdue
    rtw_plan_deadline: '2025-03-26',
    rtw_plan_days_overdue: 14,
    expected_action_keywords: ['RTW plan overdue', 'face-to-face', 'WorkSafe', 'cl.4.3'],
    forbidden_action_keywords: ['formal notice', 'termination'],
    suitable_duties_status: 'Not Assessed',
    active_edge_cases: [
      'EC8: capacity=15% but work_status=Off Work — both can be true simultaneously',
      'EC9: RTW plan created 1 day after deadline — should flag overdue but lower severity',
    ],
    // R-checks: R1✓ R3✓(all=High) R4✓(15%<50%→Off Work valid) R5✓(cert current→Low valid—RTW overdue cause)
    //           R6✓(12wk→ActiveTreatment) R7✓ R8✓ R9✓(0%=0 activities)
  },

  // ─────────────────────────────────────────────────────────────
  // PHASE 4 — Week 16: Suitable Duties Friction
  // ─────────────────────────────────────────────────────────────
  {
    phase: 4,
    name: 'Suitable Duties Unavailable',
    date: '2025-05-07',
    weeks_off: 16,
    work_status: 'Off Work',
    stage: 'ActiveTreatment',
    compliance: 'Low',         // RTW plan 6 weeks overdue, no suitable duties found
    next_step_due: '2025-03-26', // massively overdue
    xgboost_score: 0.76,
    risk_badge: 'High',        // 0.76 → High (R8)
    risk_last_checked_max_age_days: 1,
    capacity_pct: 30,
    rtw_achieved: false,
    weeks_expected: 18,        // original estimate — now clearly at risk
    recovery_phase: 'Strengthening',
    cert_on_file: true,
    cert_expired: false,
    cert_gap_days: 1,          // cert4 issued 1 day after cert3 expired (EC4 variant — acceptable)
    rtw_plan_status: 'Overdue',
    rtw_plan_pct: 0,           // R9: still 0 activities — pct CANNOT be >0 without documented activities
    rtw_plan_deadline: '2025-03-26',
    rtw_plan_days_overdue: 42,
    expected_action_keywords: ['vocational assessment', 'suitable duties', 'inability notice', 'premium impact'],
    forbidden_action_keywords: ['formal notice', 'termination'],
    suitable_duties_status: 'Unavailable', // R10: cannot have Approved RTW plan while Unavailable
    active_edge_cases: [
      'EC7: cert4 restrictions narrower than cert3 (5kg→10kg lift) — genuine improvement',
      'EC11: employer claims no suitable duties — WorkSafe may contest',
      'EC12: if worker declines offered duties — compliance implications change',
      'EC13: modified duties trialled but worker re-injures — complexity spike',
    ],
    // R-checks: R3✓(all=High) R9✓ R10✓(no plan approved while no suitable duties)
  },

  // ─────────────────────────────────────────────────────────────
  // PHASE 5 — Week 20: Worker Non-Compliance
  // ─────────────────────────────────────────────────────────────
  {
    phase: 5,
    name: 'Worker Non-Compliance',
    date: '2025-06-04',
    weeks_off: 20,
    work_status: 'Off Work',
    stage: 'ActiveTreatment',  // stuck — cannot advance without worker engagement
    compliance: 'Critical',   // cert expired 37 days, 3 contact attempts, no response (R5)
    next_step_due: '2025-03-26', // 70 days overdue
    xgboost_score: 0.89,       // Very High — non-compliant, no cert, no contact
    risk_badge: 'Very High',   // 0.89 → Very High (R8)
    risk_last_checked_max_age_days: 1,
    capacity_pct: 0,           // unknown — no cert on file. Default to 0, not last-known
    rtw_achieved: false,
    weeks_expected: 18,
    recovery_phase: 'Unknown — no certificate',
    cert_on_file: false,       // cert4 expired 28 Apr; no new cert received
    cert_expired: true,
    cert_gap_days: 37,         // 28 Apr → 4 Jun = 37 days without cert (R5: >14 days → compliance cannot be High/Medium)
    rtw_plan_status: 'Overdue',
    rtw_plan_pct: 0,
    rtw_plan_deadline: '2025-03-26',
    rtw_plan_days_overdue: 70,
    expected_action_keywords: ['formal notice', 'WIRC Act', 'non-compliance', 'insurer', 'IR advice', 'FWA'],
    forbidden_action_keywords: ['arrange GP booking', 'create RTW plan', 'request cert'],
    // ^ forbidden: these are week-2 actions, not week-20 actions (R7)
    suitable_duties_status: 'Unavailable',
    active_edge_cases: [
      'EC14: worker responds day after formal notice — case must be resumable immediately',
      'EC15: worker claims hospitalisation during non-compliance period (reasonable excuse)',
      'EC16: worker engages union rep — dynamic changes, IR advice mandatory',
      'EC17: GP submits backdated cert covering gap period',
    ],
    // R-checks: R3✓(all=Very High) R4✓(unknown cap→Off Work) R5✓(37 day gap→Critical) R7✓ R8✓
  },

  // ─────────────────────────────────────────────────────────────
  // PHASE 6 — Week 24: Escalation / Pre-Termination
  // ─────────────────────────────────────────────────────────────
  {
    phase: 6,
    name: 'Escalation — Pre-Termination Pathway',
    date: '2025-07-02',
    weeks_off: 24,
    work_status: 'Off Work',
    stage: 'Maintenance',      // auto-advanced by duration at 27+ weeks — wait, 24 weeks is still RTWTransition
    // NOTE: Stage should be RTWTransition at 24 weeks, NOT Maintenance.
    // Maintenance only kicks in at 27+ weeks.
    // EDGE CASE: if system auto-advances to Maintenance at 24 weeks, that is a stage bug.
    compliance: 'Critical',
    next_step_due: '2025-03-26', // 98 days overdue
    xgboost_score: 0.94,       // approaching ceiling
    risk_badge: 'Very High',   // 0.94 → Very High (R8)
    risk_last_checked_max_age_days: 1,
    capacity_pct: 0,
    rtw_achieved: false,
    weeks_expected: 18,
    recovery_phase: 'Unknown — no certificate since 28 Apr',
    cert_on_file: false,
    cert_expired: true,
    cert_gap_days: 65,         // 28 Apr → 2 Jul = 65 days
    rtw_plan_status: 'Overdue',
    rtw_plan_pct: 0,
    rtw_plan_deadline: '2025-03-26',
    rtw_plan_days_overdue: 98,
    expected_action_keywords: [
      'pre-termination checklist',
      'FWA s.340',
      'adverse action',
      'IR advice',
      'solicitor',
      'WorkSafe insurer approval',
    ],
    forbidden_action_keywords: ['arrange GP booking', 'create RTW plan', 'request cert', 'vocational assessment'],
    suitable_duties_status: 'Unavailable',
    active_edge_cases: [
      'EC18: worker reappears at Week 25 with new cert — case must be resumable, not locked',
      'EC19: worker lodges unfair dismissal claim before actual termination',
      'EC20: WorkSafe insurer refuses to support termination',
      'EC21: new medical evidence = permanent impairment — different pathway (PI lump sum)',
    ],
    // R-checks: R3✓(all=Very High) R5✓(65 day gap→Critical) R6: 24wk→RTWTransition (not Maintenance!)
    //           R7✓ R8✓ R9✓
  },
];

// ─────────────────────────────────────────────────────────────
// CONSISTENCY VIOLATION CATALOGUE
// These are readings the system must NEVER show — impossible states.
// Tests that find these should hard-fail, not warn.
// ─────────────────────────────────────────────────────────────
export const IMPOSSIBLE_STATES = [
  {
    id: 'IS-01',
    description: 'RTW Plan approved on Day 0 (same date as injury)',
    rule: 'rtw_plan_approved_date > injury_date + 7',
    severity: 'critical',
    currentlyExhibited: true, // Ethan Wells shows this bug today
  },
  {
    id: 'IS-02',
    description: 'Compliance = High when certificate expired > 14 days',
    rule: 'IF cert_expired_days > 14 THEN compliance != High AND compliance != Medium',
    severity: 'critical',
    currentlyExhibited: false,
  },
  {
    id: 'IS-03',
    description: 'Risk badge on Risk tab != Risk badge on Recovery tab != Dashboard badge',
    rule: 'risk_tab.badge == recovery_tab.badge == dashboard.badge',
    severity: 'high',
    currentlyExhibited: true, // Medium vs High vs High — seen in today\'s session
  },
  {
    id: 'IS-04',
    description: 'RTW Plan progress = 45% with zero documented plan activities',
    rule: 'IF rtw_activities.count == 0 THEN rtw_plan_pct == 0',
    severity: 'high',
    currentlyExhibited: true, // Ethan Wells shows 45% with no activities
  },
  {
    id: 'IS-05',
    description: 'Employer has "RTW Plan Approved" AND "No suitable duties available"',
    rule: 'NOT (rtw_plan_status == Approved AND suitable_duties_status == Unavailable)',
    severity: 'critical',
    currentlyExhibited: false,
  },
  {
    id: 'IS-06',
    description: 'Worker capacity >= 50% but work_status = "Off Work"',
    rule: 'IF capacity_pct >= 50 THEN work_status != "Off Work"',
    severity: 'medium',
    currentlyExhibited: false,
    note: 'Capacity 15-49% can still be Off Work if no suitable duties (EC8)',
  },
  {
    id: 'IS-07',
    description: 'XGBoost score 0.84 displayed as "Low" risk badge',
    rule: 'score 0.81-1.0 must display as Very High',
    severity: 'critical',
    currentlyExhibited: true, // was "Low" in previous session; now "Medium" — still wrong
  },
  {
    id: 'IS-08',
    description: 'Action plan shows "All actions complete" for overdue case > 90 days',
    rule: 'IF rtw_plan_days_overdue > 90 THEN action_plan.items.count > 0',
    severity: 'critical',
    currentlyExhibited: true, // confirmed in today\'s session
  },
  {
    id: 'IS-09',
    description: 'Certificate issue date before injury date',
    rule: 'cert_issue_date >= injury_date',
    severity: 'critical',
    currentlyExhibited: false,
  },
  {
    id: 'IS-10',
    description: 'Stage = Maintenance at 24 weeks (threshold is 27 weeks)',
    rule: 'IF weeks_off < 27 THEN stage != Maintenance',
    severity: 'medium',
    currentlyExhibited: true, // Ethan Wells auto-advanced to Maintenance at 24 weeks today
  },
  {
    id: 'IS-11',
    description: '"Arrange GP booking" recommended for case > 52 weeks off work',
    rule: 'IF weeks_off > 52 THEN action != "Arrange GP booking" (week-2 action only)',
    severity: 'high',
    currentlyExhibited: true, // confirmed in today\'s session
  },
  {
    id: 'IS-12',
    description: 'Risk last-checked date more than 7 days old on a live case',
    rule: 'risk_last_checked_age_days <= 7',
    severity: 'medium',
    currentlyExhibited: true, // last checked 1/12/2025 — 3 months ago
  },
] as const;

// ─────────────────────────────────────────────────────────────
// KARPATHY LOOP SCORING
// Score = sum of consistency dimensions passing.
// Each iteration: identify lowest-scoring dimension, mutate one rule, re-score.
// ─────────────────────────────────────────────────────────────
export const KARPATHY_DIMENSIONS = [
  { id: 'D1', name: 'Date chain integrity',        weight: 10, rules: ['R1'] },
  { id: 'D2', name: 'Risk badge unity',             weight: 10, rules: ['R3', 'R8'] },
  { id: 'D3', name: 'Action age-appropriateness',  weight: 10, rules: ['R7'] },
  { id: 'D4', name: 'Compliance accuracy',          weight: 10, rules: ['R5'] },
  { id: 'D5', name: 'Stage-duration correctness',  weight: 8,  rules: ['R6'] },
  { id: 'D6', name: 'RTW plan % truthfulness',     weight: 8,  rules: ['R9'] },
  { id: 'D7', name: 'Capacity-status coherence',   weight: 7,  rules: ['R4'] },
  { id: 'D8', name: 'Suitable duties logic',        weight: 7,  rules: ['R10'] },
  { id: 'D9', name: 'Impossible state absence',    weight: 10, rules: ['IS-01..IS-12'] },
] as const;

export const MAX_SCORE = KARPATHY_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0); // 80
