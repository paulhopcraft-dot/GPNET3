# Andres Nieto Case - Remaining Todos

## Case Details
- **Case ID:** FD-43714
- **Worker:** Andres Nieto (contact: Andres Gutierrez)
- **Organization:** org-alpha (Symmetry Manufacturing)
- **Email:** andresgutini77@gmail.com
- **Branch:** `fix/andres-nieto-case-improvements`

## ✅ COMPLETED TASKS

### 1. Action Validation Fix
- **Issue:** Andres showed "191 days overdue" for medical certificate despite having valid certificates
- **Solution:** Added action validation logic in `notificationService.ts` to auto-complete stale actions
- **Result:** Andres successfully removed from critical actions (reduced from 23 to 20 items)
- **Files:** `server/services/notificationService.ts`

### 2. Date Format Improvements
- **Issue:** Charts showed confusing week format (W1, W2, W3)
- **Solution:** Implemented month/year format (01/25, 02/25, 03/25)
- **Result:** All recovery timelines now use intuitive MM/YY format
- **Files:**
  - `client/src/lib/dateUtils.ts` (new utility functions)
  - `client/src/components/DynamicRecoveryTimeline.tsx`
  - `client/src/components/RecoveryChart.tsx`

### 3. Branch Setup
- **Created:** `fix/andres-nieto-case-improvements` branch
- **Committed:** All improvements with proper documentation
- **Status:** Ready for further work

## 🔄 PENDING TASKS

### 1. Navigate to Andres Nieto's Case Page
- **Goal:** Access his specific case (FD-43714) to view complete timeline
- **Method:** Use `/cases` page search functionality
- **Search:** "Andres" or "Nieto"
- **Expected:** View his recovery timeline with new MM/YY date formatting

### 2. Investigate Certificate Date Inconsistencies
- **Issue:** Found suspicious July 2026 certificate dates (impossible future dates)
- **Action:** Examine Andres's certificate data in detail
- **Tools:**
  - `check-andres-certs.js` (already created)
  - `investigate-certificate-dates.js` (already created)
- **Expected:** Identify and fix data quality issues

### 3. Complete Case Documentation
- **Review:** All contact information and case history
- **Verify:** Recovery timeline accuracy
- **Update:** Any incorrect data found during investigation

### 4. Test New Date Formatting
- **Verify:** MM/YY format displays correctly in his case
- **Test:** Hover tooltips, chart axes, recovery phases
- **Compare:** Before/after screenshots if needed

## 🔍 NEXT SESSION STEPS

1. **Login** to dashboard (credentials: employer@symmetry.local / ChangeMe123!)
2. **Navigate** to `/cases` page
3. **Search** for "Andres Nieto"
4. **Access** case FD-43714
5. **Review** Timeline/Treatment tabs for new date formatting
6. **Investigate** certificate data inconsistencies
7. **Document** any additional issues found

## 📋 VERIFICATION CHECKLIST

- [ ] Andres Nieto NOT in critical actions (✅ confirmed in dashboard)
- [ ] Date formatting shows MM/YY in recovery charts (✅ confirmed in Melad's case)
- [ ] Action validation prevents false "overdue" alerts (✅ working)
- [ ] Navigate to Andres's specific case page
- [ ] Verify his timeline shows new date format
- [ ] Investigate July 2026 certificate dates
- [ ] Complete any needed data corrections

## 🎯 SUCCESS CRITERIA

**Branch is complete when:**
- Andres Nieto case displays perfectly with new date formatting
- Certificate data inconsistencies resolved
- All timeline data is accurate and trustworthy
- Case serves as model for other similar cases