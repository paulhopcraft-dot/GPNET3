# Data Accuracy Verification Testing for Natalie

## 🎯 Objective: Truth Validation
**Ensure Preventli displays accurate case information that matches reality**

The compliance engine is generating 121+ alerts - but are they all correct? Natalie needs to cross-check everything against Freshdesk and real case knowledge to validate our data integrity.

---

## 📊 Critical Data Points to Verify

### **1. Case Status Accuracy**

**What to Check:**
- Worker's actual current work status vs. displayed status
- Injury dates match between Preventli and Freshdesk
- Medical certificate dates are accurate
- RTW plan status reflects reality

**Testing Process:**
1. **Select 10-15 cases** from different categories
2. **Cross-reference with Freshdesk** for each case:
   - Worker name and details
   - Current work status (At work/Off work/Light duties)
   - Injury date
   - Latest medical certificate information
   - RTW progress notes

**Questions to Ask:**
- Does this worker's status in Preventli match what's in Freshdesk?
- Are the dates correct?
- Is the medical certificate information up to date?

---

### **2. Compliance Alert Validation**

**Focus:** Are the 121+ compliance alerts legitimate?

**Testing Scenarios:**

#### **Expired Certificate Alerts**
- **Find cases flagged for expired certificates**
- **Check Freshdesk:** Is the certificate actually expired?
- **Verify dates:** Certificate end date vs. today's date
- **Worker status:** Is worker actually off work? (If at work, expired cert alert shouldn't trigger)

**Expected Findings:**
- Some alerts may be false positives
- Some legitimate expired certificates
- Possible data sync issues

#### **RTW Plan Requirements (10+ Week Rule)**
- **Find cases flagged for missing RTW plans**
- **Calculate injury date:** Is it really >10 weeks ago?
- **Check Freshdesk:** Does RTW plan actually exist?
- **Worker status:** Is worker actually still off work?

**Red Flags to Look For:**
- Workers marked as "At work" but flagged for RTW plan
- Incorrect injury date calculations
- RTW plans that exist but aren't detected

#### **Worker Engagement Issues**
- **Check cases flagged for poor engagement**
- **Cross-reference:** Do the Freshdesk notes support this?
- **Timeline verification:** Missed appointments, failed contact attempts

---

### **3. Treatment Tab Data Integrity**

**What Natalie Should Verify:**

#### **Treatment Plan Information**
- **Provider details:** Are they correct and current?
- **Treatment interventions:** Do they match medical records?
- **Plan status:** Accurate vs. actual treatment progress?

#### **Diagnosis Display**
- **Primary diagnosis:** Matches medical certificates?
- **Secondary diagnoses:** Complete and accurate?
- **Diagnosing provider:** Correct medical professional?

#### **Recovery Graph Integration**
- **Timeline accuracy:** Medical certificate markers in right places?
- **Projected RTW date:** Realistic based on treatment plan?
- **Progress tracking:** Reflects actual recovery status?

---

## 🔍 Systematic Verification Process

### **Step 1: High-Impact Cases (30 minutes)**
**Focus on cases with multiple compliance alerts**

1. Select 5 cases with the most compliance issues
2. For each case:
   - Open in Preventli Treatment tab
   - Open same case in Freshdesk
   - Compare all data points systematically
   - Note discrepancies

### **Step 2: Recent Certificate Expiries (20 minutes)**
**Focus on time-sensitive compliance issues**

1. Find cases flagged: "Certificate expired in last 7 days"
2. Verify each one:
   - Certificate actually expired?
   - Worker still off work?
   - Dates calculated correctly?

### **Step 3: Long-term Cases (25 minutes)**
**Focus on RTW plan compliance**

1. Find cases flagged: "RTW plan required (>10 weeks)"
2. Verify each one:
   - Injury date correct?
   - Time calculation accurate?
   - RTW plan truly missing?
   - Worker status appropriate?

### **Step 4: Cross-System Sync (15 minutes)**
**Focus on Freshdesk integration accuracy**

1. Pick 3-5 cases updated recently in Freshdesk
2. Check if updates appeared in Preventli:
   - New medical certificates
   - Status changes
   - Contact notes
   - Provider updates

---

## 🚨 Common Issues to Watch For

### **Data Sync Problems:**
- [ ] Medical certificates in Freshdesk not appearing in Preventli
- [ ] Status changes not synchronized
- [ ] Date parsing errors (wrong injury dates)
- [ ] Missing recent updates

### **Logic Errors:**
- [ ] Compliance rules triggering inappropriately
- [ ] False positive alerts
- [ ] Incorrect time calculations
- [ ] Wrong worker status assumptions

### **Display Issues:**
- [ ] Information showing in wrong fields
- [ ] Dates formatted incorrectly
- [ ] Provider information mixed up
- [ ] Recovery graph showing wrong timeline

### **Missing Information:**
- [ ] Cases in Freshdesk not in Preventli
- [ ] Medical certificates not detected
- [ ] RTW plans not recognized
- [ ] Important case notes missing

---

## 📝 Documentation Template

**For each discrepancy found:**

**Case:** [Worker Name/Case ID]
**Issue:** [Brief description]
**Preventli Shows:** [What system displays]
**Freshdesk Shows:** [What actually exists]
**Impact:** [High/Medium/Low]
**Notes:** [Additional context]

**Example:**
- **Case:** John Smith (08240066969)
- **Issue:** Expired certificate alert
- **Preventli Shows:** "Certificate expired 5 days ago"
- **Freshdesk Shows:** New certificate uploaded 2 days ago
- **Impact:** High (false compliance alert)
- **Notes:** Sync delay issue

---

## ✅ Success Criteria

### **High Accuracy (Target >95%):**
- [ ] Case statuses match reality
- [ ] Compliance alerts are legitimate
- [ ] Dates and timelines accurate
- [ ] Medical information current

### **Sync Quality:**
- [ ] Recent Freshdesk updates reflected
- [ ] No major data gaps
- [ ] Certificate detection working
- [ ] Status changes propagated

### **User Trust:**
- [ ] Information Natalie sees is reliable
- [ ] Compliance alerts actionable
- [ ] No obvious false alarms
- [ ] Treatment tab data trustworthy

---

## 🎯 Strategic Value

**Why This Testing Matters:**

1. **Compliance Credibility:** False alerts undermine trust in the system
2. **Workflow Efficiency:** Accurate data saves time, inaccurate data wastes time
3. **WorkSafe Compliance:** Wrong information could lead to real compliance violations
4. **User Adoption:** Case managers need to trust the data to rely on the system

**Key Questions:**
- Would you trust this information to make compliance decisions?
- Does this accurately reflect what you know about these cases?
- Are there any obvious errors that would make you doubt the system?
- Would this help or hinder your daily workflow?

---

## 📞 Escalation Process

**If Major Accuracy Issues Found:**

1. **Document thoroughly** (screenshots helpful)
2. **Stop testing** that component if critical errors
3. **Report immediately** for investigation
4. **Continue testing** other areas

**If Minor Issues:**
1. **Note for later fixing**
2. **Continue testing**
3. **Assess overall accuracy percentage**

---

**🎯 The goal: Ensure Natalie sees information she can trust to do her job effectively and stay compliant with WorkSafe Victoria requirements.**