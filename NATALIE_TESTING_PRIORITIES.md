# Natalie's Testing Priorities - Data Truth First! 🎯

## 🚨 **PRIORITY 1: Data Accuracy Verification** (60% of testing time)

**The most important question:** Do the 121+ compliance alerts reflect reality?

### **Critical Reality Checks:**

#### **🔍 Certificate Expiry Alerts** (30 mins)
- Find 5-10 cases flagged for expired certificates
- **Cross-check with Freshdesk:** Are certificates actually expired?
- **Verify worker status:** Should they even have certificates? (workers "At work" shouldn't need current certificates)
- **Date accuracy:** Are expiry date calculations correct?

**Expected Issues to Find:**
- False positives (workers back at work but still flagged)
- Sync delays (new certificates not detected)
- Date calculation errors

#### **📅 RTW Plan Requirements** (30 mins)
- Find cases flagged: "RTW plan required after 10 weeks"
- **Verify injury dates:** Is the 10-week calculation actually correct?
- **Check Freshdesk:** Does an RTW plan actually exist but wasn't detected?
- **Worker status reality:** Are they really still off work after 10+ weeks?

**Expected Issues to Find:**
- Workers returned to work but system doesn't know
- RTW plans exist but not recognized
- Wrong injury date causing false alerts

#### **📞 Worker Engagement Flags** (20 mins)
- Find cases flagged for poor engagement/non-compliance
- **Freshdesk verification:** Do the case notes actually support this?
- **Timeline check:** Are missed appointments accurately tracked?

---

## 🚨 **PRIORITY 2: Treatment Tab Integration** (30% of testing time)

**Key Question:** Is the new Treatment tab better than the old Recovery tab?

### **Core Integration Testing:**

#### **📊 Information Completeness** (20 mins)
- **Treatment Plan Section:** Are provider details accurate?
- **Diagnosis Section:** Does it match medical certificates?
- **Recovery Graph:** Are medical certificate markers in the right places?

#### **🎯 Compliance Integration** (15 mins)
- **Compliance warnings:** Are they prominently displayed in Treatment tab?
- **Action items:** Do they integrate naturally with case workflow?
- **User experience:** Does this feel better than separate Recovery tab?

#### **🔄 Real-time Updates** (15 mins)
- Make a change in Freshdesk
- Check if it appears in Preventli Treatment tab
- Test compliance status updates

---

## 🚨 **PRIORITY 3: Workflow Impact** (10% of testing time)

**Key Question:** Does this actually help case managers work more efficiently?

### **User Experience Reality Check:**

#### **⚡ Efficiency Test** (10 mins)
- **Scenario:** Review 5 cases for compliance status
- **Compare:** How long would this take manually vs. using Preventli?
- **Usability:** Are compliance issues easy to identify and act on?

**Success Criteria:**
- Faster identification of compliance issues
- Clear next actions
- Reduced time spent checking certificate dates manually
- Better clinical oversight than old approach

---

## 📋 **Testing Execution Plan**

### **Start Here (Most Important):**

#### **Step 1: Truth Testing (60 minutes)**
1. **Pick 10 high-alert cases** from dashboard
2. **For each case:**
   - Open Preventli Treatment tab
   - Open Freshdesk
   - Compare data systematically
   - Note any discrepancies

3. **Focus questions:**
   - Does case status match reality?
   - Are compliance alerts legitimate?
   - Would I trust this information to make decisions?

#### **Step 2: Integration Testing (30 minutes)**
1. **Test Treatment tab workflow**
2. **Compare to old Recovery tab approach**
3. **Assess user experience improvement**

#### **Step 3: Workflow Impact (15 minutes)**
1. **Time how long compliance review takes**
2. **Compare to manual process**
3. **Assess overall efficiency gain**

---

## 🎯 **Critical Success Questions**

### **Data Trustworthiness:**
- Would you trust these compliance alerts to make real decisions?
- Are there obvious false positives that would waste your time?
- Does the case information match what you know from Freshdesk?

### **Workflow Improvement:**
- Is this faster than manually checking compliance requirements?
- Does the Treatment tab give you better clinical oversight?
- Would you want to use this for daily case management?

### **Practical Value:**
- Would this help you avoid WorkSafe compliance violations?
- Are the action items clear and actionable?
- Does this reduce manual compliance checking time?

---

## 🚨 **Red Flags to Report Immediately**

### **Critical Issues:**
- **High false positive rate** (>20% of compliance alerts incorrect)
- **Major data sync failures** (recent Freshdesk updates missing)
- **Systematic date calculation errors**
- **Cases showing in wrong status** consistently

### **Workflow Blockers:**
- **System too slow** for daily use (>5 seconds to load case)
- **Information overload** (too many alerts, hard to prioritize)
- **User interface confusing** for case managers
- **Integration feels clunky** vs. smooth workflow

---

## 📊 **Expected Testing Outcomes**

### **Realistic Expectations:**
- **Some data sync issues** (normal for integration)
- **5-15% false positive rate** on compliance alerts
- **Minor date formatting issues**
- **Overall positive workflow improvement**

### **Success Scenario:**
- **>85% accuracy** on compliance alerts
- **Faster compliance review** than manual process
- **Better clinical insight** than old Recovery tab
- **Clear actionable next steps**

### **Failure Scenario:**
- **High false positive rate** undermines trust
- **Major sync issues** make data unreliable
- **No clear workflow improvement**
- **User experience confusing or slow**

---

## 💡 **Pro Tips for Natalie**

### **Efficient Testing:**
1. **Start with cases you know well** (easier to spot inaccuracies)
2. **Test edge cases** (recently returned workers, new certificates)
3. **Focus on compliance-critical data** (certificate dates, RTW timelines)
4. **Note workflow feelings** (faster/slower, easier/harder than current process)

### **Documentation:**
- **Screenshot obvious errors**
- **Note specific case IDs** for issues found
- **Time your compliance review process**
- **Record gut reactions** about usability

---

**🎯 Bottom Line: We need to know if this system shows accurate information that case managers can trust for real WorkSafe compliance decisions!**