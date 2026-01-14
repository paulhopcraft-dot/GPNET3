# Dashboard Interface Testing Plan

**Project:** Preventli (gpnet3)
**Version:** Post-merge main branch
**Date:** 2026-01-13
**Tester:** [Your name]

---

## Quick Start

```bash
# Start the application
npm run dev

# Login credentials (test account)
# Navigate to: http://localhost:5173
```

---

## 1. Employer Dashboard Testing

### 1.1 Dashboard Load & Display
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1.1.1 | Dashboard loads | Login as employer user, navigate to dashboard | Dashboard displays with case statistics | |
| 1.1.2 | Statistics cards | Check top statistics row | Shows: Total Cases, At Work, Off Work, Critical Actions | |
| 1.1.3 | Priority actions grid | Scroll to action sections | Displays Critical, Urgent, Routine action categories | |
| 1.1.4 | Auto-refresh | Wait 30 seconds | Dashboard data refreshes automatically | |
| 1.1.5 | Empty state | If no cases exist | Shows appropriate empty state message | |

### 1.2 Priority Action Cards
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1.2.1 | Critical actions (red) | Check critical section | Red-themed cards for expired certificates, urgent issues | |
| 1.2.2 | Urgent actions (orange) | Check urgent section | Orange-themed cards for overdue reviews | |
| 1.2.3 | Routine actions (blue) | Check routine section | Blue-themed cards for standard follow-ups | |
| 1.2.4 | Action click navigation | Click any action card | Navigates to corresponding case detail page | |
| 1.2.5 | Days overdue display | Check action cards | Shows accurate "X days overdue" or due date | |

### 1.3 Navigation from Dashboard
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1.3.1 | Case row click | Click a case in the list | Opens case detail modal/page | |
| 1.3.2 | Action item click | Click action item | Navigates to specific case | |
| 1.3.3 | Back navigation | Use browser back button | Returns to dashboard correctly | |

---

## 2. Case Detail Page Testing

### 2.1 Case Loading
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 2.1.1 | Case loads | Navigate to /employer/cases/{id} | Case detail page loads with worker info | |
| 2.1.2 | Loading state | Observe during load | Shows "Loading case details..." spinner | |
| 2.1.3 | Invalid case ID | Navigate to non-existent case | Shows "Case not found" error | |
| 2.1.4 | Case header | Check top section | Displays worker name, claim number, status badges | |

### 2.2 Tab Navigation (8 Tabs)
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 2.2.1 | Summary tab | Click Summary | Shows case overview, action plan | |
| 2.2.2 | Treatment tab | Click Treatment | Shows treatment plan, diagnosis, recovery graph | |
| 2.2.3 | Documents tab | Click Documents | Shows document list/upload interface | |
| 2.2.4 | Timeline tab | Click Timeline | Shows case history timeline | |
| 2.2.5 | Contacts tab | Click Contacts | Shows contact management panel | |
| 2.2.6 | Financial tab | Click Financial | Shows financial information | |
| 2.2.7 | Risk tab | Click Risk | Shows risk assessment | |
| 2.2.8 | Compliance tab | Click Compliance | Shows compliance report card | |

### 2.3 Treatment Tab Content
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 2.3.1 | Treatment plan display | View treatment section | Shows current treatment plan with provider | |
| 2.3.2 | Diagnosis display | View diagnosis section | Shows primary/secondary diagnoses | |
| 2.3.3 | Recovery graph | View recovery section | Shows timeline chart with milestones | |
| 2.3.4 | Worker-specific data | Compare multiple cases | Each case shows different recovery timeline | |
| 2.3.5 | Responsive layout | Resize browser | Grid adjusts (2/3 left, 1/3 right on desktop) | |

---

## 3. Compliance Features Testing

### 3.1 Compliance Report Card
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.1.1 | Compliance tab loads | Click Compliance tab on case | Shows compliance report card | |
| 3.1.2 | Compliance score | Check score display | Shows percentage and status (Compliant/At Risk/Non-Compliant) | |
| 3.1.3 | Issues tab | Click Issues tab | Lists non-compliant rules with severity | |
| 3.1.4 | Compliant tab | Click Compliant Rules | Shows passing rules | |
| 3.1.5 | Severity colors | Check issue cards | Critical=red, High=orange, Medium=amber, Low=blue | |
| 3.1.6 | Recommendations | Expand an issue | Shows actionable recommendation text | |
| 3.1.7 | Document references | Check issue details | Shows WIRC Act/Claims Manual references | |
| 3.1.8 | Refresh button | Click refresh icon | Reloads compliance data | |

### 3.2 Compliance Rules Evaluated
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.2.1 | CERT_CURRENT | Case with expired cert | Shows as non-compliant | |
| 3.2.2 | CERT_CURRENT | Case with valid cert | Shows as compliant | |
| 3.2.3 | RTW_PLAN_10WK | Case >10 weeks, no RTW plan | Shows as non-compliant | |
| 3.2.4 | SUITABLE_DUTIES | Case without suitable duties | Flags appropriately | |
| 3.2.5 | PAYMENT_STEPDOWN | Case >13 weeks | Shows step-down requirement | |
| 3.2.6 | CENTRELINK_CLEARANCE | Check case data | Evaluates correctly | |

### 3.3 Compliance Dashboard Widget
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.3.1 | Widget on dashboard | View main dashboard | Compliance widget visible | |
| 3.3.2 | Overall compliance % | Check widget header | Shows organization-wide rate | |
| 3.3.3 | Status distribution | Check progress bars | Shows Compliant/At Risk/Non-Compliant breakdown | |
| 3.3.4 | Top issues | Check issues list | Shows most common violations | |
| 3.3.5 | Auto-refresh | Wait 5 minutes | Widget data updates | |

---

## 4. Contact Management Testing

### 4.1 Contact Display
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.1.1 | Contacts tab loads | Click Contacts on case | Shows contact list | |
| 4.1.2 | Contact cards | View contact list | Shows name, role, phone, email | |
| 4.1.3 | Role categorization | Check contact order | Worker first, then employers, then medical | |
| 4.1.4 | Role badges | Check role labels | Color-coded by role type | |

### 4.2 Click-to-Call/Email
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.2.1 | Phone click | Click phone number | Opens tel: link (phone dialer) | |
| 4.2.2 | Email click | Click email address | Opens email composer dialog | |
| 4.2.3 | Copy phone | Click copy icon on phone | Copies number to clipboard | |
| 4.2.4 | Copy email | Click copy icon on email | Copies email to clipboard | |

### 4.3 Email Composer
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.3.1 | Composer opens | Click email on contact | Email composer dialog appears | |
| 4.3.2 | TO field | Check recipients | Pre-filled with clicked contact | |
| 4.3.3 | CC selection | Click CC dropdown | Shows other case contacts | |
| 4.3.4 | Send to All | Toggle "Send to All" | All contacts added to recipients | |
| 4.3.5 | Open in email client | Click "Open in Email" | Opens mailto: link with all fields | |
| 4.3.6 | Copy content | Click "Copy" button | Copies email content to clipboard | |
| 4.3.7 | Close dialog | Click X or outside | Dialog closes, no action taken | |

### 4.4 Contact CRUD Operations
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.4.1 | Add contact | Click "Add Contact" | Form appears for new contact | |
| 4.4.2 | Fill contact form | Enter name, role, phone, email | Form accepts valid data | |
| 4.4.3 | Save contact | Submit form | Contact appears in list | |
| 4.4.4 | Edit contact | Click edit on existing | Form shows current values | |
| 4.4.5 | Update contact | Modify and save | Changes reflected in list | |
| 4.4.6 | Delete contact | Click delete, confirm | Contact removed from list | |
| 4.4.7 | Role selection | Choose role in form | 12 role options available | |
| 4.4.8 | Primary contact | Set as primary | Badge shows "Primary" | |

---

## 5. Cross-Browser & Responsive Testing

### 5.1 Browser Compatibility
| # | Browser | Version | Dashboard | Case Detail | Compliance | Contacts | Notes |
|---|---------|---------|-----------|-------------|------------|----------|-------|
| 5.1.1 | Chrome | Latest | | | | | |
| 5.1.2 | Firefox | Latest | | | | | |
| 5.1.3 | Edge | Latest | | | | | |
| 5.1.4 | Safari | Latest | | | | | |

### 5.2 Responsive Breakpoints
| # | Screen Size | Dashboard | Case Detail | Tabs | Notes |
|---|-------------|-----------|-------------|------|-------|
| 5.2.1 | Desktop (1920px) | | | | |
| 5.2.2 | Laptop (1366px) | | | | |
| 5.2.3 | Tablet (768px) | | | | |
| 5.2.4 | Mobile (375px) | | | | |

---

## 6. Error Handling & Edge Cases

### 6.1 Network Errors
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 6.1.1 | API timeout | Slow network simulation | Shows loading state, then error | |
| 6.1.2 | API failure | Block API in DevTools | Shows error message with retry | |
| 6.1.3 | Session expired | Wait for JWT expiry | Redirects to login | |

### 6.2 Data Edge Cases
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 6.2.1 | No treatment plan | Case without treatment | Shows "No active treatment plan" | |
| 6.2.2 | No contacts | Case without contacts | Shows "No contacts" message | |
| 6.2.3 | Missing compliance data | New case | Handles gracefully | |
| 6.2.4 | Long text content | Extended notes/names | Text truncates or wraps properly | |

---

## 7. Performance Testing

### 7.1 Load Times
| # | Metric | Target | Actual | Pass/Fail |
|---|--------|--------|--------|-----------|
| 7.1.1 | Dashboard initial load | < 3 seconds | | |
| 7.1.2 | Case detail load | < 2 seconds | | |
| 7.1.3 | Tab switch | < 500ms | | |
| 7.1.4 | Compliance evaluation | < 2 seconds | | |

### 7.2 Bundle Size (Code Splitting)
| # | Check | Expected | Actual | Pass/Fail |
|---|-------|----------|--------|-----------|
| 7.2.1 | Initial bundle | < 400 KB gzipped | ~316 KB | |
| 7.2.2 | Lazy-loaded chunks | On-demand loading | | |

---

## Bug Report Template

```
## Bug Title: [Brief description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**

**Actual Result:**

**Screenshots:**

**Browser/Device:**

**Console Errors:**
```

---

## Testing Session Log

| Date | Tester | Section Tested | Bugs Found | Notes |
|------|--------|----------------|------------|-------|
| | | | | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Product Owner | | | |
