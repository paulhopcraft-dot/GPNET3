# Case Detail Redesign - Clear Status & Next Actions

## Problem Statement

Current case detail panel shows:
- Dates that are clearly wrong (1990, 2005, 2007, 0202)
- No clear indication of certificate status
- No obvious "what to do next" guidance
- Summary information is scattered
- Hard to tell if data is reliable or fallback

## Proposed Solution: Status-First Layout

### 1. **STATUS HEADER** (Top of panel, always visible)

```
┌─────────────────────────────────────────────────────────────┐
│ [ICON] CASE STATUS                                          │
│                                                              │
│ ⚠️  NEEDS ATTENTION                                         │
│ Certificate expired 45 days ago - Chase certificate         │
│                                                              │
│ 📋 NEXT ACTIONS (2 pending)                                 │
│   1. Chase certificate (DUE NOW - Overdue by 42 days)       │
│   2. Follow up with worker (Due in 3 days)                  │
└─────────────────────────────────────────────────────────────┘
```

**Status Badge Colors:**
- 🟢 **Compliant** - Everything up to date
- 🟡 **Attention Needed** - Certificate expiring soon (≤7 days)
- 🔴 **Urgent** - Certificate expired or missing
- ⚪ **Unknown** - Insufficient data

---

### 2. **KEY DATES & DATA QUALITY** (Second section)

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 KEY DATES                                                │
│                                                              │
│ Date of Injury:        05 Oct 2025 (3 months ago)          │
│                        ✅ Verified from case notes          │
│                                                              │
│ Case Created:          22 Dec 2025 (15 days ago)           │
│                                                              │
│ Current Certificate:   01 Jul 2026 - 01 Jul 2026           │
│                        ⚠️  Future date - not yet active     │
│                                                              │
│ Days off work:         92 days                              │
│ Expected RTW:          05 Jan 2026 (12 weeks from injury)  │
│                        ⚠️  Overdue by 1 day                 │
└─────────────────────────────────────────────────────────────┘
```

**Data Quality Indicators:**
- ✅ **Verified** - Extracted from case text or custom field
- ⚠️ **Inferred** - Calculated or estimated
- ❌ **Fallback** - Using ticket creation date (unreliable)
- ❓ **Unknown** - No data available

---

### 3. **CERTIFICATE COMPLIANCE** (Third section)

```
┌─────────────────────────────────────────────────────────────┐
│ 🏥 CERTIFICATE STATUS                                       │
│                                                              │
│ Current Status:  ❌ No Active Certificate                   │
│                                                              │
│ Last Certificate:                                            │
│   • Start: 01 Jul 2026                                      │
│   • End: 01 Jul 2026                                        │
│   • Capacity: Partial                                       │
│   • Issue: ⚠️  Certificate dates are in the future         │
│                                                              │
│ Required Action:                                             │
│   Request current medical certificate from worker/GP        │
│                                                              │
│ [Button: Request Certificate]                               │
└─────────────────────────────────────────────────────────────┘
```

**Certificate Status Indicators:**
- 🟢 **Active** - Valid certificate covering today
- 🟡 **Expiring Soon** - Less than 7 days remaining
- 🔴 **Expired** - Latest certificate has expired
- ⚪ **Missing** - No certificates on file
- ⚠️ **Invalid** - Certificate has date/data issues

---

### 4. **CASE SUMMARY** (Fourth section - collapsible)

```
┌─────────────────────────────────────────────────────────────┐
│ 📝 CASE SUMMARY                                   [Expand ▼]│
│                                                              │
│ Worker is experiencing discomfort in fingers from using     │
│ cutting machine. Reports loss of feeling. Candidate states  │
│ doesn't usually use cutting machine - did it 3-4 months ago │
│ and didn't report at the time.                              │
│                                                              │
│ ⚠️  Data Quality Issues Detected:                           │
│   • Certificate dates are in future (Jul 2026)              │
│   • Possible data entry error                               │
│                                                              │
│ Generated: 15 minutes ago using Claude Sonnet 4.5           │
│ [Button: Regenerate Summary]                                │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. **TIMELINE** (Fifth section)

Show events in chronological order with clear visual timeline:

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 TIMELINE                                                 │
│                                                              │
│  05 Oct 2025  ●─────────────┐                              │
│               │ Injury Date  │ ✅ Verified                  │
│               └──────────────┘                              │
│                                                              │
│  22 Dec 2025  ●─────────────┐                              │
│               │ Case Created │                              │
│               └──────────────┘                              │
│                                                              │
│  01 Jul 2026  ●─────────────┐                              │
│               │ Certificate  │ ⚠️  Future date              │
│               │ (Invalid)    │                              │
│               └──────────────┘                              │
│                                                              │
│  TODAY        ●─────────────┐                              │
│  06 Jan 2026  │ No active    │ ❌ Action needed            │
│               │ certificate  │                              │
│               └──────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Changes

### A. Fix Date Validation

Add date sanity checks:
```typescript
function isValidInjuryDate(date: Date, ticketCreatedDate: Date): boolean {
  const now = new Date();
  const yearsSinceInjury = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);

  // Injury date must be:
  // 1. Not in the future (beyond 1 day)
  // 2. Not more than 5 years ago
  // 3. Not before 2020 (system wasn't in use)
  // 4. Not before ticket was created

  if (date > now && (date.getTime() - now.getTime()) > 86400000) {
    return false; // More than 1 day in future
  }

  if (yearsSinceInjury > 5) {
    return false; // More than 5 years ago
  }

  if (date.getFullYear() < 2020) {
    return false; // Before 2020
  }

  if (date < ticketCreatedDate) {
    // Injury should not be before ticket creation by more than 1 year
    const daysBetween = (ticketCreatedDate.getTime() - date.getTime()) / 86400000;
    if (daysBetween > 365) {
      return false;
    }
  }

  return true;
}
```

### B. Add Data Quality Field

Add to `workerCases` table:
```typescript
dateOfInjurySource: varchar("date_of_injury_source")
  // Values: "verified" | "extracted" | "fallback" | "unknown"
dateOfInjuryConfidence: varchar("date_of_injury_confidence")
  // Values: "high" | "medium" | "low"
```

### C. Redesign Case Detail Component

New component structure:
```tsx
<CaseDetailPanel>
  <StatusHeader
    status={complianceStatus}
    nextActions={pendingActions}
    urgent={hasUrgentIssues}
  />

  <KeyDatesSection
    dateOfInjury={case.dateOfInjury}
    injuryDateSource={case.dateOfInjurySource}
    certificates={certificates}
    dataQualityIssues={qualityIssues}
  />

  <CertificateComplianceSection
    status={certificateStatus}
    activeCertificate={activeCert}
    issues={certificateIssues}
    onRequestCertificate={handleRequestCert}
  />

  <CaseSummarySection
    summary={summary}
    dataQualityWarnings={warnings}
    onRegenerate={handleRegenerate}
  />

  <TimelineSection
    events={timelineEvents}
    currentStatus={status}
  />
</CaseDetailPanel>
```

---

## Example: Andres Nieto Case (Fixed)

```
┌─────────────────────────────────────────────────────────────┐
│ 🟡 ATTENTION NEEDED                                         │
│                                                              │
│ Certificate dates appear invalid (future dates)             │
│ Worker may need current medical certificate                 │
│                                                              │
│ 📋 NEXT ACTIONS (1 pending)                                 │
│   1. Request current medical certificate (DUE NOW)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📅 KEY DATES                                                │
│                                                              │
│ Date of Injury:        06 Oct 2025 (3 months ago)          │
│                        ✅ Extracted from case notes         │
│                        "3 or 4 months ago" → Oct 6, 2025    │
│                                                              │
│ Days off work:         92 days                              │
│ Work Status:           Off work                             │
│                                                              │
│ Certificate on File:   01 Jul 2026 - 01 Jul 2026           │
│                        ⚠️  Future date - likely data error  │
│                        ⚠️  Please verify with worker/GP     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏥 CERTIFICATE STATUS                                       │
│                                                              │
│ ❌ NO ACTIVE CERTIFICATE                                    │
│                                                              │
│ Issue: Certificate dates (Jul 2026) are 6 months in the    │
│ future. This appears to be a data entry error.             │
│                                                              │
│ Required Action:                                             │
│   Contact worker to obtain current medical certificate      │
│                                                              │
│ [Button: Request Certificate via Email]                     │
│ [Button: Mark Certificate as Requested]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Priority Fixes

1. **Immediate: Fix invalid API key** - Get new key from Anthropic
2. **High: Add date validation** - Reject dates before 2020 or more than 1 day in future
3. **High: Redesign case header** - Show status + next actions first
4. **Medium: Add data quality indicators** - Show when dates are uncertain
5. **Medium: Certificate validation** - Flag future dates, single-day certificates
6. **Low: Visual timeline** - Better visualization of case progression

---

## Questions for User

1. What's the most important information you need to see when opening a case?
2. What decisions do you need to make quickly?
3. Are there specific compliance indicators WorkSafe requires?
4. Should we auto-flag cases with suspicious dates (>5 years ago, future dates)?
