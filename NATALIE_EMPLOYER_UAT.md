# Preventli Employer Portal - User Acceptance Testing Plan

**Document Version:** 1.0
**Date:** January 27, 2026
**Tester:** Natalie
**Role:** Employer (Symmetry Manufacturing)
**Access Method:** Remote via ngrok tunnel

---

## 1. Executive Summary

This UAT plan validates the Employer Portal functionality from an employer's perspective. The tester will access the system remotely as a Symmetry Manufacturing employer to verify case visibility, compliance information, and overall usability.

---

## 2. Test Environment

### 2.1 Access Details

| Item | Value |
|------|-------|
| **Access URL** | `[NGROK_URL_HERE]` (provided separately) |
| **Email** | `employer@test.com` |
| **Password** | `password123` |
| **Organization** | Symmetry Manufacturing |
| **Available Cases** | 49 worker cases |

### 2.2 Browser Requirements

- Chrome (recommended), Firefox, or Edge
- Modern browser with JavaScript enabled
- Screen resolution: 1280x720 minimum

### 2.3 Support Contact

- **Technical Issues:** [Paul's contact]
- **Testing Questions:** [Paul's contact]
- **Session Time:** [Scheduled time]

---

## 3. Test Scope

### 3.1 In Scope

- Employer login and authentication
- Dashboard case listing and navigation
- Case detail viewing
- Smart Summary feature
- Compliance indicators
- Medical certificate visibility
- Recovery timeline viewing

### 3.2 Out of Scope

- Admin functions (roles, duties management)
- Case creation/editing
- Clinician-specific features
- System administration

---

## 4. Pre-Test Checklist

Before starting, verify:

- [ ] Received ngrok URL from Paul
- [ ] Have login credentials (employer@test.com / password123)
- [ ] Browser ready (Chrome recommended)
- [ ] Screen sharing available if needed for support
- [ ] This document open for reference
- [ ] Bug reporting template ready (Section 8)

---

## 5. Test Cases

### Module 1: Authentication

#### TC-1.1: Employer Login
**Priority:** Critical
**Objective:** Verify employer can log into the system

**Steps:**
1. Open the ngrok URL in browser
2. Enter email: `employer@test.com`
3. Enter password: `password123`
4. Click "Sign In" button

**Expected Results:**
- [ ] Login page loads without errors
- [ ] Credentials are accepted
- [ ] Redirected to Employer Dashboard
- [ ] Username/organization visible in header

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

#### TC-1.2: Session Persistence
**Priority:** Medium
**Objective:** Verify session remains active during testing

**Steps:**
1. After login, wait 5 minutes
2. Navigate to different pages
3. Return to dashboard

**Expected Results:**
- [ ] User remains logged in
- [ ] No unexpected logouts
- [ ] Navigation works throughout session

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

### Module 2: Dashboard

#### TC-2.1: Case List Display
**Priority:** Critical
**Objective:** Verify employer sees their organization's cases

**Steps:**
1. View the main dashboard after login
2. Count visible cases
3. Verify case information displayed

**Expected Results:**
- [ ] Dashboard loads within 5 seconds
- [ ] 49 Symmetry cases visible
- [ ] Each case shows: Worker name, Status, Injury type
- [ ] Cases are sortable/filterable

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

#### TC-2.2: Case Search
**Priority:** High
**Objective:** Verify search functionality

**Steps:**
1. Locate search box on dashboard
2. Search for "Jacob Gunn"
3. Clear search
4. Search for partial name "And" (for Andres)

**Expected Results:**
- [ ] Search box is visible and functional
- [ ] "Jacob Gunn" case appears in results
- [ ] Search clears properly
- [ ] Partial search returns matching results

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

#### TC-2.3: Case Filtering
**Priority:** Medium
**Objective:** Verify filter functionality

**Steps:**
1. Look for filter options on dashboard
2. Filter by work status (e.g., "Off work")
3. Filter by another status (e.g., "Modified duties")
4. Clear filters

**Expected Results:**
- [ ] Filter options available
- [ ] Filtering reduces case list appropriately
- [ ] Filter can be cleared
- [ ] Counts update to reflect filtered results

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

### Module 3: Case Detail View

#### TC-3.1: Case Detail Navigation
**Priority:** Critical
**Objective:** Verify case detail page accessibility

**Steps:**
1. From dashboard, click on any worker case
2. Observe the case detail page layout
3. Note available tabs/sections

**Expected Results:**
- [ ] Case detail page opens
- [ ] Worker name prominently displayed
- [ ] Multiple tabs/sections visible
- [ ] Back navigation to dashboard works

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

#### TC-3.2: Smart Summary Display
**Priority:** High
**Objective:** Verify AI-generated case summary

**Steps:**
1. Open case detail for any worker
2. Locate the Smart Summary section (left column)
3. If no summary exists, click "Refresh" button
4. Read the summary content

**Expected Results:**
- [ ] Smart Summary section visible
- [ ] Summary contains: Overview, Status, Restrictions
- [ ] Summary is readable and relevant
- [ ] Refresh button generates new summary (3-5 seconds)

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

#### TC-3.3: Medical Certificate Information
**Priority:** Critical
**Objective:** Verify certificate visibility for employer

**Steps:**
1. In case detail, locate medical certificate section
2. Check certificate dates
3. Verify certificate status (current/expired)
4. Look for certificate details

**Expected Results:**
- [ ] Certificate section visible
- [ ] Current certificate dates shown
- [ ] Certificate status clearly indicated
- [ ] Work restrictions from certificate visible

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

#### TC-3.4: Recovery Timeline
**Priority:** High
**Objective:** Verify recovery progress visualization

**Steps:**
1. In case detail, locate recovery timeline/graph
2. Identify key milestones on timeline
3. Look for projected return-to-work date
4. Check for certificate markers

**Expected Results:**
- [ ] Recovery timeline/graph visible
- [ ] Milestones marked (injury date, certificates, etc.)
- [ ] Timeline is readable
- [ ] Shows recovery trajectory

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

### Module 4: Compliance Information

#### TC-4.1: Compliance Indicators
**Priority:** High
**Objective:** Verify compliance status visibility

**Steps:**
1. View case detail page
2. Look for compliance indicators/warnings
3. Identify any cases with compliance issues
4. Note how issues are displayed

**Expected Results:**
- [ ] Compliance status visible per case
- [ ] Clear indication of compliant vs. non-compliant
- [ ] Warnings are prominent if issues exist
- [ ] Compliance info helps prioritize cases

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

#### TC-4.2: Action Items
**Priority:** Medium
**Objective:** Verify recommended actions display

**Steps:**
1. In case detail, locate action items/recommendations
2. Review suggested next steps
3. Check if actions relate to compliance

**Expected Results:**
- [ ] Action items section visible
- [ ] Recommendations are clear and actionable
- [ ] Priority/urgency indicated
- [ ] Actions relevant to employer responsibilities

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

### Module 5: End-to-End Scenarios

#### TC-5.1: Case Triage Workflow
**Priority:** High
**Objective:** Test realistic case review workflow

**Scenario:** As an employer, review cases to identify those needing attention

**Steps:**
1. From dashboard, identify cases with warnings/alerts
2. Open 3 different cases
3. For each, assess: Status, Certificate validity, Next steps needed
4. Determine which case needs most urgent attention

**Expected Results:**
- [ ] Can easily identify cases needing attention
- [ ] Case information supports decision-making
- [ ] Clear path to understanding each case
- [ ] Workflow feels efficient

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

#### TC-5.2: Certificate Expiry Monitoring
**Priority:** High
**Objective:** Test ability to track certificate status

**Scenario:** Employer needs to know which workers have expiring certificates

**Steps:**
1. Look for cases with certificates expiring soon
2. Identify any expired certificates
3. Understand required actions for expired certificates

**Expected Results:**
- [ ] Can find cases with expiring certificates
- [ ] Expiry dates clearly visible
- [ ] Urgency appropriately indicated
- [ ] Clear what action is needed

**Actual Result:** _________________
**Pass/Fail:** _____
**Notes:** _________________

---

## 6. Usability Assessment

Please rate each area (1=Poor, 5=Excellent):

| Area | Rating (1-5) | Comments |
|------|--------------|----------|
| **Overall ease of use** | ___ | |
| **Navigation clarity** | ___ | |
| **Information presentation** | ___ | |
| **Page load speed** | ___ | |
| **Mobile/responsive design** | ___ | |
| **Visual design/aesthetics** | ___ | |

### Open Questions:

1. **Was the information you need as an employer readily available?**

   _Response:_ _________________

2. **What information was missing that you would expect to see?**

   _Response:_ _________________

3. **Was the Smart Summary helpful? How could it be improved?**

   _Response:_ _________________

4. **Would this system help you manage injured workers more effectively?**

   _Response:_ _________________

5. **Any features you would add or change?**

   _Response:_ _________________

---

## 7. Test Summary

### Results Overview

| Module | Tests | Passed | Failed | Blocked |
|--------|-------|--------|--------|---------|
| Authentication | 2 | | | |
| Dashboard | 3 | | | |
| Case Detail | 4 | | | |
| Compliance | 2 | | | |
| E2E Scenarios | 2 | | | |
| **Total** | **13** | | | |

### Critical Issues Found

1. _________________
2. _________________
3. _________________

### Recommendations

1. _________________
2. _________________
3. _________________

---

## 8. Bug Reporting Template

For each issue found, please document:

```
BUG ID: BUG-[NUMBER]
SEVERITY: Critical / High / Medium / Low
COMPONENT: Login / Dashboard / Case Detail / Other

SUMMARY: [One-line description]

STEPS TO REPRODUCE:
1.
2.
3.

EXPECTED: [What should happen]
ACTUAL: [What actually happened]

SCREENSHOT: [Attach if possible]
BROWSER: [Chrome/Firefox/Edge]
```

---

## 9. Sign-Off

**Tester Name:** _________________
**Date:** _________________
**Overall Assessment:** Pass / Pass with Issues / Fail

**Tester Signature:** _________________

---

**Thank you for testing Preventli!**

*Your feedback directly improves the system for all employers managing WorkCover compliance.*
