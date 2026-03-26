# Human-Skeptical Test Plan

**Generated:** 2026-03-24
**Philosophy:** Test as a sharp, skeptical case manager would. Not just "does it load" but "can I actually do my job."

---

## SCENARIO-001: Pre-Employment Happy Path
**Workflow:** Pre-employment health clearance
**Actor(s):** Employer, Candidate, Clinician
**Severity if broken:** CRITICAL
**Setup:** Logged in as admin/clinician
**Steps:**
1. Navigate to /pre-employment
2. Create new assessment for a candidate
3. Verify magic link is generated (accessToken)
4. Open /check/:token as candidate
5. Complete questionnaire with healthy responses
6. Verify AI generates reportJson
7. As clinician, view assessment report
8. Click Approve → verify clearance_level = cleared_unconditional
9. Verify employerNotifiedAt is set
**Expected:** Full lifecycle completes, audit trail exists
**Watch for:** Missing notifications, no audit event on approval, broken magic link

## SCENARIO-002: Pre-Employment Rejection and Retrieval
**Workflow:** Pre-employment health clearance
**Actor(s):** Clinician
**Severity if broken:** HIGH
**Setup:** Completed assessment exists
**Steps:**
1. Reject an assessment → clearance_level = not_cleared
2. Navigate away from pre-employment page
3. Try to find the rejected assessment again
4. Search by candidate name
5. Verify rejection reason is visible
6. Verify audit trail shows who rejected and when
**Expected:** Rejected assessments are findable and auditable
**Watch for:** Rejected assessments disappearing from lists, no search by status

## SCENARIO-003: Pre-Employment Conditional Clearance Attempt
**Workflow:** Pre-employment health clearance
**Actor(s):** Clinician
**Severity if broken:** HIGH
**Setup:** Assessment with borderline health results
**Steps:**
1. Review assessment with mixed results (some conditions, some fit)
2. Look for option to set cleared_conditional or cleared_with_restrictions
3. Attempt to specify restrictions
4. Verify restrictions are stored and visible
**Expected:** Conditional clearance path exists
**Watch for:** Only binary Approve/Reject available (GAP-001 verification)

## SCENARIO-004: Compliance Score Explanation Drill-Down
**Workflow:** Compliance engine
**Actor(s):** Case manager
**Severity if broken:** HIGH
**Setup:** Case with non-compliant indicator
**Steps:**
1. Navigate to case detail for a case with Low or Very Low compliance
2. Find the compliance indicator
3. Click/expand to see rule-level breakdown
4. For each failed rule: verify reason, legislative reference, and recommended action are shown
5. Navigate to employer view of same case → check what employer sees
**Expected:** Full rule-level explanation accessible from all views
**Watch for:** Indicator shown without drill-down. Employer sees badge only.

## SCENARIO-005: Worker Off Work 400+ Days — Compliance Reality Check
**Workflow:** Compliance engine, case views
**Actor(s):** Case manager
**Severity if broken:** HIGH
**Setup:** Case with dateOfInjury > 400 days ago, workStatus = "Off work", valid certificate
**Steps:**
1. Navigate to case with long off-work duration
2. Check compliance indicator — what does it show?
3. If "compliant" — is this operationally correct? Worker off 400+ days is not a success.
4. Check if any escalation or warning is shown
5. Check RTW plan status — is it stalled?
6. Check if system flags this as needing intervention
**Expected:** System should flag stalled cases, not show false compliance
**Watch for:** CONTRADICTION-002 — compliant label on operationally stalled case

## SCENARIO-006: RTW Plan Status vs Work Status Consistency
**Workflow:** RTW planning, case management
**Actor(s):** Case manager
**Severity if broken:** MEDIUM
**Setup:** Case with RTW plan
**Steps:**
1. Find a case where RTW plan status = "working_well"
2. Check case workStatus — is it "At work"?
3. If "Off work" + "working_well" → contradiction found
4. Update RTW plan status to "failing"
5. Check if workStatus updates or if system warns
**Expected:** Consistent status displays
**Watch for:** CONTRADICTION-003 — independent status updates without validation

## SCENARIO-007: Certificate Expiry Chase Workflow
**Workflow:** Certificate management, action queue
**Actor(s):** Case manager
**Severity if broken:** HIGH
**Setup:** Case with certificate expiring within 7 days
**Steps:**
1. Find case with expiring certificate
2. Verify certificate_expiring_soon status is shown
3. Check action queue for chase_certificate action
4. Verify action has correct due date (before expiry)
5. Try to draft an email to GP requesting new certificate
6. Complete the action
7. Upload new certificate
8. Verify compliance status updates
**Expected:** Full certificate renewal workflow works
**Watch for:** No action created, email draft not functional, compliance not updating

## SCENARIO-008: Action Queue — Overdue Action Visibility
**Workflow:** Action queue
**Actor(s):** Case manager
**Severity if broken:** MEDIUM
**Setup:** Actions with past due dates
**Steps:**
1. Navigate to action queue / dashboard
2. Verify overdue actions are visually distinct (red border, overdue badge)
3. Check if overdue count is shown on dashboard stats
4. Try to complete an overdue action
5. Try to cancel an overdue action — verify reason is required
**Expected:** Overdue actions are prominent and actionable
**Watch for:** Overdue actions hidden in list, no visual distinction, cancellation without reason

## SCENARIO-009: Termination Workflow — Full s82 WIRC Path
**Workflow:** Termination
**Actor(s):** Case manager
**Severity if broken:** CRITICAL
**Setup:** Active case eligible for termination
**Steps:**
1. Navigate to case and open termination panel
2. Initiate termination → PREP_EVIDENCE
3. Record evidence gathering
4. Progress through: AGENT_MEETING → CONSULTANT_CONFIRMATION
5. Send pre-termination invite → verify 7-day notice requirement
6. Record pre-termination meeting
7. Make decision (TERMINATE)
8. Record WorkSafe notification
9. Verify full audit trail of each step
10. Verify case lifecycle updates to closed_terminated
**Expected:** All 10 steps completable in order with audit trail
**Watch for:** Steps skippable, no date enforcement, no audit trail, lifecycle not updating

## SCENARIO-010: Termination Abort and Recovery
**Workflow:** Termination
**Actor(s):** Case manager
**Severity if broken:** MEDIUM
**Setup:** Termination in progress (any step)
**Steps:**
1. Initiate termination, progress to DECISION_PENDING
2. Abort termination → TERMINATION_ABORTED
3. Check what happens to the case
4. Can the case return to active management?
5. Is the aborted termination recorded for audit?
**Expected:** Clean abort with return to active case management
**Watch for:** GAP-010 — no path back after abort

## SCENARIO-011: AI Summary Accuracy and Correction
**Workflow:** Smart summary
**Actor(s):** Clinician
**Severity if broken:** HIGH
**Setup:** Case with existing data
**Steps:**
1. Generate AI summary for a case
2. Read summary — does it accurately reflect case data?
3. Look for incorrect assertions or hallucinated details
4. Try to flag the summary as inaccurate
5. Try to add a correction
6. Regenerate — does it improve?
7. Check audit trail for summary generation
**Expected:** Summary is reviewable and correctable
**Watch for:** GAP-012 — no correction mechanism

## SCENARIO-012: Email Draft — Generate, Edit, Send
**Workflow:** Email communication
**Actor(s):** Case manager
**Severity if broken:** HIGH
**Setup:** Case requiring communication
**Steps:**
1. Open case, initiate email draft
2. Select type (e.g., certificate_chase)
3. Select recipient
4. Generate AI draft
5. Review draft — check for accuracy
6. Edit draft content
7. Attempt to send
8. Check if sent status is recorded
**Expected:** Draft → edit → send → track workflow
**Watch for:** GAP-014 — no actual send path, copy-only

## SCENARIO-013: Employer View — Can They Actually Do Their Job?
**Workflow:** Employer dashboard
**Actor(s):** Employer
**Severity if broken:** HIGH
**Setup:** Login as employer role
**Steps:**
1. Navigate to employer dashboard
2. View case stats — are they accurate?
3. Click a case — can employer see enough detail?
4. Can employer see RTW plan status?
5. Can employer approve/reject RTW plan?
6. Can employer see compliance indicator?
7. Can employer understand what compliance means (explanation)?
8. Create new case — does it go through?
**Expected:** Employer can self-serve core tasks
**Watch for:** GAP-008 — no RTW approval UI. GAP-005 — no compliance explanation.

## SCENARIO-014: Case with No Data — Compliance Scoring
**Workflow:** Compliance engine
**Actor(s):** System, Case manager
**Severity if broken:** HIGH
**Setup:** Minimal case (just worker name and company)
**Steps:**
1. Create or find a case with minimal data
2. Check compliance indicator
3. Is it "unknown/insufficient data" or a numeric score?
4. If numeric score — what rules were evaluated?
5. Are the rules meaningful with no data?
**Expected:** System should indicate insufficient data, not false non-compliance
**Watch for:** CONTRADICTION-001 — score from absence of data

## SCENARIO-015: Audit Trail — Material Decision Coverage
**Workflow:** Audit trail
**Actor(s):** Admin
**Severity if broken:** HIGH
**Setup:** Various actions taken
**Steps:**
1. Perform these actions, then check audit log for each:
   a. Login → verify USER_LOGIN event
   b. View case → verify CASE_VIEW event
   c. Update case → verify CASE_UPDATE event
   d. Generate AI summary → verify AI_SUMMARY_GENERATE with user ID
   e. Approve pre-employment → verify event
   f. Complete action → verify ACTION_COMPLETE
   g. Override compliance → verify event
   h. Transition lifecycle → verify event
2. For each event: verify actor, timestamp, and relevant metadata
**Expected:** All material decisions produce audit events
**Watch for:** Missing events for approvals, overrides, and AI actions

## SCENARIO-016: Multiple Certificates — Overlap Handling
**Workflow:** Certificate management
**Actor(s):** Clinician
**Severity if broken:** MEDIUM
**Setup:** Case with existing active certificate
**Steps:**
1. Upload a new certificate with overlapping date range
2. Does the system prevent it, warn, or accept silently?
3. Check certificateCompliance status — which certificate counts?
4. Check restrictions — do they update to new certificate?
**Expected:** System handles overlap coherently
**Watch for:** INV-014 — multiple active certificates creating ambiguity

## SCENARIO-017: Case Closure — Action Cascade
**Workflow:** Case lifecycle, action queue
**Actor(s):** Case manager
**Severity if broken:** MEDIUM
**Setup:** Case with pending actions
**Steps:**
1. Find case with multiple pending actions
2. Transition case to a closed state
3. Check action queue — what happened to pending actions?
4. Are they cancelled? Still showing? Orphaned?
**Expected:** Pending actions cancelled with "case_closed" reason
**Watch for:** INV-011 — no cascade logic, orphaned actions

## SCENARIO-018: RTW Wizard — 5-Step Completion
**Workflow:** RTW planning
**Actor(s):** Clinician
**Severity if broken:** HIGH
**Setup:** Active case eligible for RTW
**Steps:**
1. Navigate to /cases/:id/rtw-wizard
2. Complete Step 1: Current Status
3. Complete Step 2: Pathway selection
4. Complete Step 3: Schedule & goals
5. Complete Step 4: Duty selection
6. Complete Step 5: Consent
7. Verify RTW plan is created with correct data
8. Verify plan appears in RTW planner
**Expected:** Full wizard completion creates valid plan
**Watch for:** Steps losing data, wizard breaking mid-flow, plan not created

## SCENARIO-019: Worker Consent Refusal
**Workflow:** RTW planning
**Actor(s):** Worker (via clinician), Case manager
**Severity if broken:** MEDIUM
**Setup:** RTW plan ready for consent
**Steps:**
1. In RTW wizard Step 5, select "refused" consent
2. Enter refusal reason
3. Complete wizard
4. What happens to the RTW plan?
5. Is the refusal recorded in plan consent table?
6. Is there an escalation or next-step workflow?
**Expected:** Refusal recorded, plan status updated, escalation path exists
**Watch for:** No escalation path after refusal, plan stuck in limbo

## SCENARIO-020: Role-Based Access — Wrong Role Actions
**Workflow:** Permission / RBAC
**Actor(s):** Employer attempting admin actions
**Severity if broken:** HIGH
**Setup:** Logged in as employer role
**Steps:**
1. As employer, try to access /admin routes
2. As employer, try to access /audit
3. As employer, try to update a case they don't own
4. As employer, try to access another organization's cases
5. Verify 401/403/404 responses as appropriate
**Expected:** Role-based restrictions enforced
**Watch for:** Missing permission checks, information disclosure via error messages
