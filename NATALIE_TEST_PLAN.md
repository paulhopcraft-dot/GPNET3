# Preventli User Acceptance Testing - Day Plan for Natalie

**Date:** January 12, 2026
**Tester:** Natalie
**System:** Preventli Treatment Tab Integration & Core Workflows
**Environment:** Development/Staging

---

## 🎯 Testing Objectives

1. **Primary Focus:** Validate Treatment Tab functionality and clinical oversight features
2. **Secondary:** Test case management workflows and navigation
3. **Integration:** Verify Freshdesk sync and data accuracy
4. **Usability:** Assess overall user experience for case managers

---

## ⏰ Day Schedule (6-8 hours)

### **Morning Session (9:00 AM - 12:00 PM)**
- **9:00-9:30 AM:** System setup and orientation
- **9:30-10:30 AM:** Treatment Tab Core Testing (Test Plan 1)
- **10:30-10:45 AM:** Break
- **10:45-12:00 PM:** Case Management Workflows (Test Plan 2)

### **Afternoon Session (1:00 PM - 5:00 PM)**
- **1:00-2:30 PM:** Freshdesk Integration Testing (Test Plan 3)
- **2:30-2:45 PM:** Break
- **2:45-4:00 PM:** End-to-End Scenarios (Test Plan 4)
- **4:00-5:00 PM:** Bug reporting and feedback session

---

## 📋 Test Plan 1: Treatment Tab Core Functionality

### **Objective:** Verify the new Treatment Tab replaces Recovery tab and displays comprehensive clinical information

### **Pre-conditions:**
- System is running on localhost:5173
- User is logged in as case manager
- Test cases are available in the system

### **Test Cases:**

#### TC1.1: Treatment Tab Navigation
**Steps:**
1. Navigate to dashboard
2. Click on any case to open case detail page
3. Look for tab navigation at top of case detail
4. Verify "Treatment" tab is present
5. Verify "Recovery" tab is NOT present
6. Click on "Treatment" tab

**Expected Results:**
- ✅ Treatment tab exists and is clickable
- ❌ Recovery tab should not be visible anywhere
- ✅ Treatment tab content loads without errors

**Pass/Fail:** _____ **Notes:** _________________

#### TC1.2: Treatment Plan Display
**Steps:**
1. With Treatment tab open, locate "Current Treatment Plan" section
2. Verify treatment plan information is displayed
3. Check for provider details
4. Look for plan status
5. Verify treatment interventions are listed

**Expected Results:**
- ✅ Treatment plan section visible with title "Current Treatment Plan"
- ✅ Provider name and details shown
- ✅ Plan status displayed (active/completed/pending)
- ✅ Key interventions listed in readable format

**Pass/Fail:** _____ **Notes:** _________________

#### TC1.3: Diagnosis Information
**Steps:**
1. In Treatment tab, locate "Diagnosis" section
2. Verify primary diagnosis is displayed
3. Check for secondary diagnoses
4. Look for diagnosis date
5. Verify medical provider information

**Expected Results:**
- ✅ Primary diagnosis clearly displayed
- ✅ Secondary diagnoses listed (if applicable)
- ✅ Diagnosis date shown
- ✅ Diagnosing provider information present

**Pass/Fail:** _____ **Notes:** _________________

#### TC1.4: Recovery Graph Integration
**Steps:**
1. In Treatment tab, locate recovery progress section on right side
2. Verify recovery timeline chart is displayed
3. Check for medical certificate markers
4. Look for projected return-to-work date
5. Verify graph is responsive and readable

**Expected Results:**
- ✅ Recovery graph visible on right side (1/3 width)
- ✅ Timeline shows progress over time
- ✅ Medical certificate milestones marked
- ✅ Projected RTW date displayed
- ✅ Graph scales properly on different screen sizes

**Pass/Fail:** _____ **Notes:** _________________

---

## 📋 Test Plan 2: Case Management Workflows

### **Objective:** Test core case management functionality and navigation

#### TC2.1: Dashboard Navigation
**Steps:**
1. From Treatment tab, navigate back to dashboard
2. Try searching for specific cases
3. Sort cases by different criteria
4. Filter cases by work status

**Expected Results:**
- ✅ Navigation works smoothly
- ✅ Search returns relevant results
- ✅ Sorting functions correctly
- ✅ Filters apply properly

**Pass/Fail:** _____ **Notes:** _________________

#### TC2.2: Case Detail Tabs
**Steps:**
1. Open a case detail page
2. Navigate through all available tabs
3. Test: Overview, Medical, Financial, Actions, Communications, Treatment
4. Verify content loads in each tab

**Expected Results:**
- ✅ All tabs are accessible
- ✅ Content loads without errors
- ✅ Data appears relevant and up-to-date
- ✅ No broken links or missing information

**Pass/Fail:** _____ **Notes:** _________________

#### TC2.3: Case Actions and Updates
**Steps:**
1. In case detail, try adding a new action/note
2. Update case status if possible
3. Verify changes are saved
4. Check audit trail/history

**Expected Results:**
- ✅ New actions can be added
- ✅ Status updates work correctly
- ✅ Changes persist after page refresh
- ✅ Change history is recorded

**Pass/Fail:** _____ **Notes:** _________________

---

## 📋 Test Plan 3: Freshdesk Integration

### **Objective:** Verify Freshdesk data synchronization and accuracy

#### TC3.1: Case Data Sync
**Steps:**
1. Identify a case in Preventli
2. Look up the same case/ticket in Freshdesk
3. Compare key data points:
   - Worker name
   - Company
   - Injury date
   - Current status
   - Recent updates

**Expected Results:**
- ✅ Case data matches between systems
- ✅ Recent Freshdesk updates appear in Preventli
- ✅ Status synchronization is accurate
- ✅ No obvious data discrepancies

**Pass/Fail:** _____ **Notes:** _________________

#### TC3.2: Medical Certificate Integration
**Steps:**
1. Find a case with recent medical certificates
2. Verify certificates appear in both systems
3. Check certificate dates and details
4. Look for certificate status (current/expired)

**Expected Results:**
- ✅ Medical certificates from Freshdesk appear in Preventli
- ✅ Certificate dates are accurate
- ✅ Certificate status is correctly calculated
- ✅ Certificate details are complete

**Pass/Fail:** _____ **Notes:** _________________

---

## 📋 Test Plan 4: End-to-End Scenarios

### **Objective:** Test realistic case management scenarios

#### TC4.1: New Case Review Workflow
**Scenario:** A new injury case needs initial assessment

**Steps:**
1. Select a recent case from dashboard
2. Review case in Treatment tab for clinical overview
3. Check medical certificates and treatment plan
4. Assess compliance indicators
5. Determine next actions needed

**Expected Results:**
- ✅ All information needed for assessment is readily available
- ✅ Treatment tab provides comprehensive clinical picture
- ✅ Next steps are clear based on displayed information
- ✅ Workflow feels efficient and logical

**Pass/Fail:** _____ **Notes:** _________________

#### TC4.2: Case Status Review Workflow
**Scenario:** Regular review of ongoing cases

**Steps:**
1. Filter dashboard for "Off work" cases
2. Open several cases and review Treatment tabs
3. Check for expired certificates or missing treatment plans
4. Identify cases requiring immediate attention

**Expected Results:**
- ✅ Can quickly identify cases needing attention
- ✅ Treatment tab helps prioritize urgent cases
- ✅ Compliance issues are visible and actionable
- ✅ Workflow supports efficient case triage

**Pass/Fail:** _____ **Notes:** _________________

---

## 🐛 Bug Reporting Template

For each bug found, please record:

**Bug ID:** BUG-[NUMBER]
**Priority:** Critical/High/Medium/Low
**Component:** Treatment Tab/Dashboard/Navigation/Data/Other
**Summary:** [Brief description]
**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
**Actual Result:**
**Screenshot:** [If applicable]
**Browser:** Chrome/Firefox/Safari/Edge
**Notes:**

---

## ✅ Success Criteria

### **Must Pass (Critical):**
- [ ] Treatment tab replaces Recovery tab completely
- [ ] All treatment information displays correctly
- [ ] Navigation works without errors
- [ ] Freshdesk data synchronization is accurate

### **Should Pass (Important):**
- [ ] Recovery graph integration works properly
- [ ] Case management workflows are efficient
- [ ] Performance is acceptable (page loads < 3 seconds)
- [ ] Interface is intuitive for case managers

### **Nice to Have (Enhancement):**
- [ ] Mobile responsiveness works well
- [ ] Advanced filtering/search functions properly
- [ ] Print/export capabilities work if available

---

## 🎯 End of Day Deliverables

1. **Completed test plan** with all Pass/Fail results
2. **Bug report list** with priorities and details
3. **User feedback summary** on overall experience
4. **Recommendations** for improvements or critical fixes needed

---

**System Access Instructions:**
- URL: http://localhost:5173
- Login: [TO BE PROVIDED]
- Freshdesk: [Your existing access]
- Support Contact: [Your contact info]

**Happy Testing! 🚀**