# Compliance System Testing Plan for Natalie

## 🎯 Focus: WorkSafe Victoria Compliance Engine Testing

**Objective:** Test the compliance rules engine that automatically evaluates cases against WorkSafe Victoria requirements and creates action items for non-compliant cases.

**Duration:** 2-3 hours focused testing
**Key Benefit:** Validate that the system correctly identifies compliance issues and helps case managers stay on top of WorkSafe requirements.

---

## 🔧 Compliance Rules Overview

Our system monitors 7 key compliance rules:

1. **CERT_CURRENT** - Medical certificates must be current for off-work cases
2. **RTW_PLAN_10WK** - RTW plan required within 10 weeks of injury
3. **SUITABLE_DUTIES** - Suitable duties offered based on capacity
4. **RTW_OBLIGATIONS** - Worker engagement with RTW process
5. **PAYMENT_STEPDOWN** - Payment step-down after 13 weeks
6. **CENTRELINK_CLEARANCE** - Centrelink clearance requirements
7. **MEDICAL_OVERSIGHT** - Regular medical review requirements

---

## 📋 Compliance Testing Scenarios

### **Scenario 1: Expired Medical Certificate (CERT_CURRENT)**

**Setup:**
1. Find a case where worker is "Off work"
2. Check if medical certificate is expired or about to expire

**Testing Steps:**
1. Navigate to case detail page
2. Go to **Treatment Tab** (this is what we're really testing!)
3. Look at the medical certificate section
4. Check if system shows certificate status (current/expired)
5. Look for any compliance warnings or action items

**What to Test:**
- Does the system correctly identify expired certificates?
- Are compliance warnings visible in the Treatment tab?
- Are action items automatically created for expired certificates?

**Expected Results:**
- Expired certificates should be highlighted
- System should show "Certificate Expired" warnings
- Action item should be created: "Request new medical certificate"

**Test Data to Create:**
If no expired certificates exist, simulate by:
- Taking an existing case
- Adding a note: "Medical certificate expired 3 days ago, worker still off work"
- Check if compliance engine picks this up

---

### **Scenario 2: Long-term Case Without RTW Plan (RTW_PLAN_10WK)**

**Setup:**
1. Find a case that's been ongoing for >10 weeks
2. Check if RTW plan exists

**Testing Steps:**
1. Look for cases with injury dates >10 weeks ago
2. Open case in Treatment tab
3. Check treatment plan section
4. Look for RTW plan status and compliance indicators

**What to Test:**
- Does system identify cases over 10 weeks without RTW plans?
- Are these flagged as compliance issues?
- Are appropriate actions suggested?

**Expected Results:**
- Cases >10 weeks should show "RTW Plan Required" warning
- Action item: "Develop RTW plan immediately"
- High priority compliance flag

**Test Data to Create:**
- Find a case from September/October 2025
- Add note: "Worker off work for 12 weeks, no RTW plan developed yet"
- Worker should be marked as "Off work"

---

### **Scenario 3: Payment Step-down Required (PAYMENT_STEPDOWN)**

**Setup:**
1. Find cases >13 weeks since injury
2. Check if worker is still receiving full payments

**Testing Steps:**
1. Identify long-term cases (>13 weeks)
2. Check payment status in case details
3. Look for step-down compliance requirements

**What to Test:**
- Are cases >13 weeks flagged for payment step-down?
- Does system suggest appropriate actions?
- Are compliance deadlines clearly shown?

**Expected Results:**
- Cases >13 weeks should show payment step-down requirements
- Clear action items for implementing step-down
- Compliance timeline indicators

---

### **Scenario 4: Worker Engagement Issues (RTW_OBLIGATIONS)**

**Setup:**
1. Find cases where worker may not be engaging with RTW process

**Testing Steps:**
1. Look for cases with missed appointments or non-compliance
2. Add test notes about poor engagement
3. Check if system flags compliance concerns

**Test Notes to Add:**
- "Worker failed to attend medical appointment - 2nd missed appointment"
- "Worker not responding to RTW coordinator calls"
- "Worker declined suitable duties without medical reason"

**What to Test:**
- Does system track worker engagement issues?
- Are repeated non-compliance events flagged?
- Are escalation actions suggested?

**Expected Results:**
- Engagement issues should be tracked and flagged
- Escalation procedures should be suggested
- Compliance risk scoring should increase

---

## 🎮 Interactive Testing Guide

### **Step 1: Access Compliance Dashboard**
1. Log into Preventli system
2. Go to main dashboard
3. Look for compliance indicators on case cards
4. Note any red/amber compliance warnings

### **Step 2: Case-by-Case Compliance Review**
For each test scenario above:

**A. Select Target Case**
- Choose cases that fit the scenario criteria
- Open case detail page
- Navigate to **Treatment Tab** (our new feature!)

**B. Review Compliance Status**
- Look for compliance indicator sections
- Check for warning messages or alerts
- Note any automated action items created

**C. Simulate Compliance Issues**
- Add notes that would trigger compliance rules
- Examples:
  ```
  "Medical certificate expired yesterday, worker still off work"
  "Worker has been off work for 11 weeks, no RTW plan in place"
  "Worker declined suitable duties offer without medical justification"
  "No contact from worker for 2 weeks despite multiple attempts"
  ```

**D. Test System Response**
- Refresh page or navigate away and back
- Check if compliance status updates
- Look for new action items or warnings
- Verify compliance scoring changes

### **Step 3: Compliance Action Testing**
1. Find cases with compliance action items
2. Try marking actions as completed
3. Check if compliance status improves
4. Test action item workflow

---

## 📝 Compliance Testing Checklist

### **Certificate Compliance (CERT_CURRENT)**
- [ ] Expired certificate detection working
- [ ] Current certificate validation correct
- [ ] No certificate scenario handled properly
- [ ] Action items created for expired certificates
- [ ] Warnings displayed in Treatment tab

### **RTW Planning (RTW_PLAN_10WK)**
- [ ] 10-week timeline detection accurate
- [ ] Cases >10 weeks flagged appropriately
- [ ] RTW plan status correctly displayed
- [ ] Action items for plan development created
- [ ] Compliance warnings visible

### **Payment Step-down (PAYMENT_STEPDOWN)**
- [ ] 13-week threshold detection working
- [ ] Step-down requirements clearly shown
- [ ] Action items for payment changes created
- [ ] Compliance timeline indicators present

### **Worker Engagement (RTW_OBLIGATIONS)**
- [ ] Engagement issues tracked correctly
- [ ] Non-compliance events flagged
- [ ] Escalation actions suggested
- [ ] Risk scoring reflects engagement issues

### **General System Integration**
- [ ] Compliance status updates in real-time
- [ ] Action items integrate with case workflow
- [ ] Compliance indicators visible in Treatment tab
- [ ] System performance acceptable during compliance checks
- [ ] No errors when processing compliance rules

---

## 🐛 Specific Issues to Test For

### **Data Accuracy Issues**
- Incorrect date calculations (injury dates, certificate dates)
- Wrong work status affecting compliance rules
- Missing medical information causing false positives

### **User Interface Issues**
- Compliance warnings not prominently displayed
- Action items unclear or confusing
- Complex compliance status hard to understand
- Performance slow when loading compliance data

### **Workflow Issues**
- Compliance actions don't integrate well with normal case management
- Difficulty marking compliance items as resolved
- Too many false alarms diluting real issues
- Compliance requirements not clear to case managers

---

## 📊 Success Metrics

### **Functional Success**
- All 7 compliance rules evaluate correctly
- Appropriate action items created for violations
- Compliance status accurately reflects case reality
- No false positives for compliant cases

### **Usability Success**
- Compliance information clear and actionable
- Integration with Treatment tab feels natural
- Case managers can easily understand next steps
- Workflow efficiency improved vs manual compliance tracking

### **Business Impact Success**
- Compliance issues identified before they become critical
- Action items help case managers stay proactive
- Reduced risk of WorkSafe Victoria compliance violations
- Better clinical oversight through Treatment tab integration

---

## 📞 Testing Support

**During Testing:**
- Note any cases where compliance rules don't make sense
- Record any system errors or slow performance
- Document user experience issues
- Take screenshots of confusing displays

**Questions to Ask:**
- Does this compliance check make sense for this case?
- Are the suggested actions appropriate?
- Would this help you stay compliant with WorkSafe requirements?
- Is the information presented clearly in the Treatment tab?

**Focus Areas:**
- Treatment tab integration (our main new feature)
- Compliance automation accuracy
- Action item usefulness
- Overall workflow improvement

---

**Ready to test the compliance system that keeps us ahead of WorkSafe requirements! 🎯**