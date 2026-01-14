# GPNet Compliance System Testing Guide

**Version:** 1.0
**Date:** January 13, 2026
**Tester:** Natalie
**System:** GPNet Employer Portal - Compliance Monitoring Module

---

## Table of Contents

1. [Quick Start Instructions](#1-quick-start-instructions)
2. [Test Scenarios](#2-test-scenarios)
3. [Expected Results](#3-expected-results)
4. [Bug Reporting](#4-bug-reporting)
5. [Business Validation](#5-business-validation)
6. [User Experience Testing](#6-user-experience-testing)
7. [Data Accuracy Checklist](#7-data-accuracy-checklist)
8. [Compliance Workflow Testing](#8-compliance-workflow-testing)

---

## 1. Quick Start Instructions

### System Access

| Item | Value |
|------|-------|
| **URL** | http://192.168.0.140:5000 |
| **Username** | employer@symmetry.local |
| **Password** | ChangeMe123! |

### Login Steps

1. Open your web browser (Chrome or Edge recommended)
2. Navigate to http://192.168.0.140:5000
3. Enter the credentials above
4. Click "Sign In"
5. You should land on the main dashboard showing worker cases

### Navigation Overview

| Tab/Section | Purpose |
|-------------|---------|
| **Dashboard** | Overview of all worker cases with compliance indicators |
| **Case Detail** | Click any row to see detailed case information |
| **Summary Tab** | Current status with compliance rules breakdown |
| **Timeline Tab** | Chronological case events and communications |
| **Risk Tab** | Risk register with likelihood/impact assessment |
| **Treatment Tab** | Medical treatment plan and recovery progress |

---

## 2. Test Scenarios

### Scenario 1: View Compliance Dashboard

**Objective:** Verify the dashboard displays compliance indicators correctly

**Steps:**
1. Login to the system
2. View the main cases list
3. Look for the "Compliance" column in the cases table

**What to Check:**
- [ ] Compliance indicator is visible for each case
- [ ] Color coding matches severity (red for low, green for high)
- [ ] Cases can be sorted by compliance status

---

### Scenario 2: View Case Compliance Breakdown

**Objective:** Verify detailed compliance rules display correctly

**Steps:**
1. Click on the **Charlie Sassine** case (FD-44223)
2. Navigate to the **Summary** tab
3. Scroll to "Compliance Rules Breakdown" section

**What to Check:**
- [ ] 7 compliance rules are displayed
- [ ] Each rule shows:
  - Rule name
  - Status indicator (PASS/WARN/FAIL)
  - Details explaining the status
- [ ] Visual status indicators match:
  - Red dot = FAIL
  - Amber dot = WARN
  - Green dot = PASS

**Expected Results for Charlie Sassine:**

| Rule | Expected Status | Expected Details |
|------|-----------------|------------------|
| Certificate Current | FAIL | No current medical certificate on file |
| RTW Plan (10 weeks) | WARN | RTW plan due soon (week 8) |
| Medical Provider Contact | PASS | Recent contact recorded |
| Workplace Assessment | FAIL | Assessment overdue by 14 days |
| Regular Contact (14 days) | PASS | Last contact 3 days ago |
| Claim Notification (10 days) | PASS | Reported within timeframe |
| Investigation Complete (60 days) | WARN | Investigation pending (day 45) |

---

### Scenario 3: Test Priority Actions Display

**Objective:** Verify priority actions are correctly identified

**Steps:**
1. View the Charlie Sassine case
2. Look for the compliance summary at the bottom of the rules breakdown
3. Check the "Priority Actions" section

**What to Check:**
- [ ] Compliance score shows "4/7 rules passed"
- [ ] Priority actions list includes:
  - "Obtain current medical certificate"
  - "Complete workplace assessment"

---

### Scenario 4: Test Different Compliance Levels

**Objective:** Verify system handles various compliance states

**Steps:**
1. Browse through different cases on the dashboard
2. Find cases with different compliance levels:
   - Very High
   - High
   - Medium
   - Low
   - Very Low

**What to Check:**
- [ ] "Very High" and "High" show green styling
- [ ] "Medium" shows yellow/amber styling
- [ ] "Low" and "Very Low" show red styling
- [ ] Compliance breakdown only appears for Medium/Low/Very Low cases

---

### Scenario 5: Test Case Information Accuracy

**Objective:** Verify case data displays correctly across all tabs

**Steps:**
1. Open the Charlie Sassine case
2. Verify information on each tab matches the case record:
   - Summary tab
   - Injury tab
   - Timeline tab
   - Financial tab
   - Risk tab
   - Contacts tab
   - Treatment tab

**What to Check:**
- [ ] Worker name appears correctly in header
- [ ] Company name is accurate
- [ ] Injury date is displayed correctly
- [ ] Work status badge is accurate
- [ ] All tabs load without errors

---

### Scenario 6: Test Dynamic Data Updates

**Objective:** Verify the system uses live data (not hardcoded)

**Steps:**
1. View case details for Charlie Sassine
2. Note the worker's name and company
3. Check that these values appear dynamically throughout the page:
   - In the header
   - In the action plan items
   - In the contacts section

**What to Check:**
- [ ] Worker name "{workerCase.workerName}" appears (not placeholder text)
- [ ] Company name "{workerCase.company}" appears (not placeholder text)
- [ ] Action items reference the actual worker name

---

### Scenario 7: Test Action Plan Functionality

**Objective:** Verify action plan is interactive and accurate

**Steps:**
1. Open a case with pending actions
2. Review the Action Plan section on the right side
3. Check the action items

**What to Check:**
- [ ] Checkboxes are clickable
- [ ] Actions are organized by timeframe:
  - Immediate Actions (This Week)
  - Short-Term Actions (Next 2 Weeks)
  - Medium-Term Actions (Jan-Feb 2026)
  - Milestone: 3-Month Stability Review
- [ ] Worker-specific details appear in action items

---

## 3. Expected Results

### Compliance Rules - WorkSafe Victoria Requirements

The system evaluates 7 core compliance rules based on WIRC Act 2013 and WorkSafe Claims Manual:

| Rule Code | Rule Name | Source | Severity |
|-----------|-----------|--------|----------|
| CERT_CURRENT | Certificate Must Be Current | WIRC Act s38, WorkSafe Manual 2.4 | Critical |
| RTW_PLAN_10WK | RTW Plan Within 10 Weeks | WIRC Act s41, WorkSafe Manual 5.3 | High |
| FILE_REVIEW_8WK | Case Review Every 8 Weeks | WIRC Reg 224, WorkSafe Manual 5.1 | Medium |
| PAYMENT_STEPDOWN | Weekly Payment Step-Down After 13 Weeks | WIRC Act s37, WorkSafe Manual 3.4 | Low |
| CENTRELINK_CLEARANCE | Centrelink Clearance Required | WorkSafe Manual 3.5 | High |
| SUITABLE_DUTIES | Employer Must Provide Suitable Duties | WIRC Act s99, WorkSafe Manual 5.2 | High |
| RTW_OBLIGATIONS | Return to Work Obligations | WIRC Act s155-165, WorkSafe Manual 5 | Medium |

### Status Indicators

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| PASS | Green dot | Emerald | Rule requirement is satisfied |
| WARN | Amber dot | Amber/Yellow | Approaching deadline or needs attention |
| FAIL | Red dot | Red | Non-compliant, immediate action required |

### Compliance Score Calculation

- **Very High:** 90-100% of rules passing
- **High:** 75-89% of rules passing
- **Medium:** 50-74% of rules passing
- **Low:** 25-49% of rules passing
- **Very Low:** 0-24% of rules passing

---

## 4. Bug Reporting

### How to Report Issues

When you find an issue, please document:

1. **Bug Title:** Brief description
2. **Steps to Reproduce:** Numbered steps to recreate the issue
3. **Expected Result:** What should happen
4. **Actual Result:** What actually happened
5. **Screenshots:** If applicable
6. **Severity:** Critical / High / Medium / Low

### Bug Report Template

```
BUG: [Title]
=============

SEVERITY: [Critical/High/Medium/Low]

STEPS TO REPRODUCE:
1.
2.
3.

EXPECTED RESULT:
[What should happen]

ACTUAL RESULT:
[What actually happened]

ADDITIONAL NOTES:
[Any other observations]

SCREENSHOT:
[Attach if helpful]
```

### Severity Definitions

| Severity | Definition | Example |
|----------|------------|---------|
| **Critical** | System unusable, data loss risk | Cannot login, incorrect compliance status |
| **High** | Major feature broken | Rules not displaying, wrong data |
| **Medium** | Feature works but with issues | Styling problems, slow loading |
| **Low** | Minor cosmetic issues | Typos, alignment issues |

### Where to Submit

Email bug reports to: jacinta.bailey@gpnet.au
Or note them in the shared testing spreadsheet if provided.

---

## 5. Business Validation

### Compliance Rules Match WorkSafe Requirements

Review each rule and confirm it aligns with WorkSafe Victoria requirements:

#### CERT_CURRENT - Certificate Currency

**WorkSafe Requirement:**
- Workers off work must have a current Certificate of Capacity
- Certificate must be from a registered medical practitioner
- Must specify worker's capacity for work

**System Implementation:**
- [ ] System correctly flags cases with expired certificates
- [ ] System correctly identifies workers who are off work
- [ ] Recommendation "Chase certificate immediately" is appropriate

**Your Assessment:**
- Does this align with actual WorkSafe practice? YES / NO / PARTIAL
- Notes: _______________________________________________

---

#### RTW_PLAN_10WK - Return to Work Plan

**WorkSafe Requirement:**
- RTW plan must be developed within 10 weeks for serious injuries
- Must identify suitable duties
- Must outline graduated return to work process

**System Implementation:**
- [ ] System tracks weeks since injury correctly
- [ ] Warning triggers at appropriate time (before 10 weeks)
- [ ] Recommendation to develop RTW plan is appropriate

**Your Assessment:**
- Does this align with actual WorkSafe practice? YES / NO / PARTIAL
- Notes: _______________________________________________

---

#### FILE_REVIEW_8WK - 8-Week Case Review

**WorkSafe Requirement:**
- WIRC Regulation 224 requires reviews every 8 weeks
- Must assess worker's current work capacity
- Must determine ongoing entitlement

**System Implementation:**
- [ ] System tracks days since last case update
- [ ] Warning triggers when approaching 8 weeks (56 days)
- [ ] Recommendation to schedule review is appropriate

**Your Assessment:**
- Does this align with actual WorkSafe practice? YES / NO / PARTIAL
- Notes: _______________________________________________

---

#### PAYMENT_STEPDOWN - 13-Week Step-Down

**WorkSafe Requirement:**
- Weekly payments reduce after first 13 weeks
- Applies if worker has not returned to work
- Encourages return to work

**System Implementation:**
- [ ] System correctly calculates weeks off work
- [ ] Step-down notification triggers at 13 weeks
- [ ] Recommendation to notify worker is appropriate

**Your Assessment:**
- Does this align with actual WorkSafe practice? YES / NO / PARTIAL
- Notes: _______________________________________________

---

#### CENTRELINK_CLEARANCE - Centrelink Verification

**WorkSafe Requirement:**
- Must obtain Centrelink clearance before processing payments
- Prevents double-dipping with social security benefits
- Compliance with federal regulations

**System Implementation:**
- [ ] System tracks Centrelink clearance status
- [ ] Warning triggers when clearance is needed
- [ ] Recommendation to obtain clearance is appropriate

**Your Assessment:**
- Does this align with actual WorkSafe practice? YES / NO / PARTIAL
- Notes: _______________________________________________

---

#### SUITABLE_DUTIES - Employer Duty to Provide Work

**WorkSafe Requirement:**
- Employer must provide suitable employment where reasonable
- Work must be safe and appropriate
- Consider worker's incapacity, skills, and experience

**System Implementation:**
- [ ] System assesses when suitable duties should be identified
- [ ] Links to RTW plan status correctly
- [ ] Recommendation follows hierarchy: pre-injury duties > alternative duties > alternative employment

**Your Assessment:**
- Does this align with actual WorkSafe practice? YES / NO / PARTIAL
- Notes: _______________________________________________

---

#### RTW_OBLIGATIONS - General RTW Compliance

**WorkSafe Requirement:**
- Comprehensive obligations for employers, workers, and agents
- Case management requirements
- Cooperation between parties in good faith

**System Implementation:**
- [ ] System monitors cooperation and engagement
- [ ] Tracks case activity as proxy for engagement
- [ ] Recommendation to review obligations is appropriate

**Your Assessment:**
- Does this align with actual WorkSafe practice? YES / NO / PARTIAL
- Notes: _______________________________________________

---

### Missing Compliance Rules

Are there any compliance requirements you typically track that are NOT in the system?

**Additional rules needed:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 6. User Experience Testing

### Navigation Assessment

Rate each aspect from 1 (Poor) to 5 (Excellent):

| Aspect | Rating (1-5) | Comments |
|--------|--------------|----------|
| Finding a specific case | | |
| Understanding compliance status at a glance | | |
| Navigating between tabs | | |
| Finding action items | | |
| Understanding what needs to be done | | |
| Overall ease of use | | |

### Information Clarity

| Question | YES / NO | Comments |
|----------|----------|----------|
| Is the compliance score meaning clear? | | |
| Are the PASS/WARN/FAIL indicators intuitive? | | |
| Is it clear what action to take for FAIL items? | | |
| Is the priority of issues clear? | | |
| Are the recommendations actionable? | | |

### Speed and Performance

| Action | Acceptable Speed? | Comments |
|--------|-------------------|----------|
| Loading the dashboard | YES / NO | |
| Opening case details | YES / NO | |
| Switching between tabs | YES / NO | |
| Generating AI summary | YES / NO | |

### Missing Features

What features would make this system more useful for your daily work?

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 7. Data Accuracy Checklist

### For Charlie Sassine Case (FD-44223)

Verify the following information is accurate:

| Field | Value Shown | Correct? | Actual Value if Wrong |
|-------|-------------|----------|----------------------|
| Worker Name | Charlie Sassine | YES / NO | |
| Company | (Check displayed) | YES / NO | |
| Injury Date | (Check displayed) | YES / NO | |
| Work Status | (Check displayed) | YES / NO | |
| Compliance Level | Very Low | YES / NO | |
| Certificate Status | Expired | YES / NO | |

### Cross-Reference with Source Systems

If you have access to source systems (Freshdesk, etc.), verify:

- [ ] Case ID matches Freshdesk ticket
- [ ] Worker information matches source records
- [ ] Injury dates are consistent
- [ ] Certificate dates align with actual certificates on file

### Data Freshness

- [ ] Is the data current or stale?
- [ ] When was the case last updated?
- [ ] Do timeline events match recent activities?

---

## 8. Compliance Workflow Testing

### End-to-End Compliance Monitoring

Test the full workflow of identifying and addressing a compliance issue:

#### Step 1: Identify Non-Compliant Case

1. From dashboard, find a case with "Very Low" or "Low" compliance
2. Note which rules are failing
3. **Document:** Which case? Which rules are failing?

**Your notes:**
_______________________________________________

---

#### Step 2: Review Compliance Details

1. Click into the case
2. Review the compliance rules breakdown
3. Understand WHY each rule is failing

**Your notes:**
- Rule 1 failing because: _______________________
- Rule 2 failing because: _______________________

---

#### Step 3: Review Recommended Actions

1. Check the recommendations for each failing rule
2. Assess if recommendations are practical and actionable
3. Review the priority actions summary

**Your notes:**
- Are recommendations clear? YES / NO
- Are recommendations actionable? YES / NO
- What would you add/change? _______________________

---

#### Step 4: Check Action Plan

1. Navigate to the Action Plan section
2. Review immediate and short-term actions
3. Verify actions align with compliance issues

**Your notes:**
- Do actions address the compliance failures? YES / NO
- Are timelines realistic? YES / NO
- Anything missing? _______________________

---

#### Step 5: Review Case Context

1. Check other tabs (Injury, Timeline, Financial, etc.)
2. Verify you have enough context to take action
3. Assess if information is complete

**Your notes:**
- Is there enough information to act? YES / NO
- What additional information would help? _______________________

---

### Suggested Improvements

Based on your testing, what improvements would make this system more valuable?

**Priority 1 (Must Have):**
1. _______________________________________________
2. _______________________________________________

**Priority 2 (Should Have):**
1. _______________________________________________
2. _______________________________________________

**Priority 3 (Nice to Have):**
1. _______________________________________________
2. _______________________________________________

---

## Summary Checklist

Before completing testing, ensure you have:

- [ ] Logged in successfully
- [ ] Viewed at least 3 different cases
- [ ] Reviewed the Charlie Sassine compliance breakdown in detail
- [ ] Checked all 7 tabs for at least one case
- [ ] Validated at least 3 compliance rules against WorkSafe requirements
- [ ] Completed the UX rating section
- [ ] Documented at least 1 bug (if found)
- [ ] Provided suggestions for improvement

---

## Questions & Feedback

Please record any questions or general feedback here:

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________

---

**Thank you for your thorough testing!**

Your feedback will directly shape the development of the GPNet compliance system to better serve WorkSafe Victoria compliance needs.

---

*Document prepared for Preventli/GPNet compliance testing*
