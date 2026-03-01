# Employer Login & Smart Summary Test Guide

## Quick Start

### 1. Start the Servers

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client && npm run dev
```

### 2. Login as Symmetry Employer

**URL:** http://localhost:5173

**Credentials:**
- **Email:** `employer@test.com`
- **Password:** `password123`
- **Organization:** org-alpha (Symmetry cases)

### 3. View Smart Summary

After login, you'll see the Employer Dashboard with 49 Symmetry cases:

1. **Click on any case** to open the detail view
2. **Smart Summary appears** in the left column
3. **If no summary exists**, click the "Refresh" button (with Sparkles icon)
4. **Summary generates** using Claude AI (takes 3-5 seconds)

## Available Cases

The employer account has access to 49 Symmetry cases including:
- Jacob Gunn
- Andres Nieto
- Stuart Barclay
- Ava Thompson
- And 45 more workers

## Smart Summary Features

### What the Summary Shows:
- **Case Overview:** Worker details, injury type, date
- **Current Status:** Work status, medical restrictions
- **Timeline:** Key events and milestones
- **Next Steps:** Recommended actions
- **Compliance Status:** Certificate validity, RTW plan status

### API Endpoints Used:
- `GET /api/cases/:id/summary` - Fetch cached summary
- `POST /api/cases/:id/summary` - Generate new summary
- `POST /api/cases/:id/summary?force=true` - Force regenerate

### UI Components:
- `EmployerCaseDetailView.tsx` - Main case detail component
- Smart Summary in left column
- Action Plan in right column

## Troubleshooting

### "No summary available yet"
- Click the Refresh button to generate
- Summary generation requires ANTHROPIC_API_KEY in .env
- Takes 3-5 seconds to generate

### "Failed to generate summary"
- Check server logs for errors
- Verify ANTHROPIC_API_KEY is set
- Check case has sufficient data (timeline events)

### Can't see any cases
- Verify logged in as `employer@test.com`
- Check organization is org-alpha
- Run: `npx tsx scripts/check-employer-setup.ts`

## Testing Checklist

- [ ] Backend server running on http://localhost:5000
- [ ] Frontend server running on http://localhost:5173
- [ ] Login successful with employer@test.com
- [ ] Dashboard shows 49+ Symmetry cases
- [ ] Can open case detail view
- [ ] Smart summary loads or generates successfully
- [ ] Summary shows meaningful case insights
- [ ] Action plan shows in right column
- [ ] Can refresh summary with new data

## Database Verification

Check employer setup:
```bash
npx tsx scripts/check-employer-setup.ts
```

Check all organizations:
```bash
npx tsx scripts/check-all-orgs.ts
```

List cases for testing:
```bash
npx tsx scripts/list-cases-for-testing.ts
```

## Expected Smart Summary Format

```
CASE SUMMARY - Jacob Gunn

Overview:
Worker sustained lower back injury on [date] while performing manual handling duties at Symmetry.

Current Status:
- Work Status: Off work
- Medical Certificate: Valid until [date]
- Treating Doctor: Dr Smith

Key Milestones:
- Injury reported: [date]
- Initial assessment: [date]
- RTW plan developed: [date]

Restrictions:
- No heavy lifting (>10kg)
- Sit/stand duties only
- Maximum 4 hours per day

Next Steps:
1. Certificate expires in 5 days - chase renewal
2. Schedule RTW planning meeting
3. Review suitable duties with supervisor

Compliance:
✓ Certificate current
⚠️ RTW plan review due
✓ Regular communication maintained
```

## Smart Summary vs Compliance Report

**Smart Summary (Current):**
- Natural language case overview
- Timeline and milestones
- Clinical status and restrictions
- Human-readable recommendations

**Compliance Report (New Feature):**
- Structured rule evaluation
- Pass/fail against WIRC Act requirements
- Severity-based issue flagging
- Regulatory references

Both features complement each other:
- **Smart Summary** = What's happening with this case?
- **Compliance Report** = Are we meeting legal obligations?

---

**Created:** 2026-01-07
**Purpose:** Test employer login and smart summary feature
**User:** employer@test.com
