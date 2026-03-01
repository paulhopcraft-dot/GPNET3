# Timeline Engine Testing Guide

## Overview

This document provides comprehensive instructions for testing the Timeline Engine implementation for GPNet3.

## Automated Tests

### Test Files Created

1. **Backend Test**: `server/storage.test.ts`
   - Tests the `getCaseTimeline()` storage method
   - 8 test cases covering all major scenarios

2. **Frontend Test**: `client/src/components/TimelineCard.test.tsx`
   - Tests the React component rendering and behavior
   - 10 test cases covering all UI states

### Running Tests

```bash
# Run all tests
npm run test

# Run only backend tests
npm run test -- storage.test

# Run only frontend tests
npm run test -- TimelineCard

# Run tests in watch mode
npm run test -- --watch

# Generate coverage report
npm run test -- --coverage
```

**Note**: Due to pre-existing schema issues in the codebase (line 457 in shared/schema.ts), some tests may not run until that issue is resolved. The manual testing approach below provides comprehensive validation.

## Manual Testing

### Prerequisites

1. Start the development server:
```bash
npm run dev
```

2. Ensure you have test data in your database. You can seed the database:
```bash
npm run seed
```

### Backend API Testing

#### Test 1: Valid Case with Events

```bash
# Test a case that has timeline events
curl http://localhost:5000/api/cases/CASE-001/timeline | jq
```

**Expected Response:**
```json
{
  "caseId": "CASE-001",
  "events": [
    {
      "id": "att-123",
      "caseId": "CASE-001",
      "eventType": "attachment_uploaded",
      "timestamp": "2025-01-20T16:30:00.000Z",
      "title": "Document Uploaded",
      "description": "medical-report.pdf (application/pdf)",
      "severity": "info",
      "icon": "attach_file",
      "metadata": { ... },
      "sourceId": "123",
      "sourceTable": "case_attachments"
    },
    // ... more events sorted newest first
  ],
  "totalEvents": 15
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Response has `caseId`, `events[]`, `totalEvents` fields
- ✅ Events are sorted by timestamp descending (newest first)
- ✅ Each event has all required fields (id, caseId, eventType, timestamp, title)

#### Test 2: Case with No Events

```bash
# Test a case with no related data
curl http://localhost:5000/api/cases/EMPTY-001/timeline | jq
```

**Expected Response:**
```json
{
  "caseId": "EMPTY-001",
  "events": [
    {
      "id": "case-created-EMPTY-001",
      "eventType": "case_created",
      "timestamp": "2025-01-01T10:00:00.000Z",
      "title": "Case Created",
      "severity": "info"
    }
  ],
  "totalEvents": 1
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Only has the "case_created" event

#### Test 3: Non-Existent Case (404)

```bash
# Test with a case ID that doesn't exist
curl -i http://localhost:5000/api/cases/NONEXISTENT/timeline
```

**Expected Response:**
```
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Case not found"
}
```

**Verify:**
- ✅ Status code: 404
- ✅ Error message present

#### Test 4: Limit Parameter

```bash
# Test limit parameter restricts event count
curl "http://localhost:5000/api/cases/CASE-001/timeline?limit=5" | jq
```

**Expected Response:**
```json
{
  "caseId": "CASE-001",
  "events": [ ... ], // exactly 5 events
  "totalEvents": 5
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Number of events ≤ limit parameter
- ✅ `totalEvents` matches `events.length`

#### Test 5: Response Time

```bash
# Create a curl timing file
echo "time_total:  %{time_total}s\n" > curl-format.txt

# Check API response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/cases/CASE-001/timeline
```

**Expected:**
- ✅ Response time < 500ms for typical cases
- ✅ Response time < 1000ms for cases with 100+ events

### Frontend UI Testing

#### Test 1: Loading State

1. Open Chrome DevTools (F12) → Network tab
2. Throttle network to "Slow 3G"
3. Navigate to dashboard: http://localhost:5000
4. Click on a case card to open detail panel

**Verify:**
- ✅ Loading spinner appears in Timeline card
- ✅ Text "Loading timeline..." is visible
- ✅ Loading icon is animated (spinning)

#### Test 2: Error State

1. Stop the backend server (Ctrl+C in terminal)
2. Open/refresh a case detail panel in browser
3. Observe Timeline card

**Verify:**
- ✅ Error icon appears
- ✅ Error message is displayed
- ✅ Other cards in the panel still work
- ✅ No console errors in browser

4. Restart server: `npm run dev`

#### Test 3: Empty State

1. Create a new case with no events (or use EMPTY-001)
2. Navigate to case detail panel
3. Observe Timeline card

**Verify:**
- ✅ Message: "No timeline events available yet."
- ✅ No timeline connecting line visible
- ✅ No loading or error state
- ✅ Card renders cleanly

#### Test 4: Populated State

1. Navigate to a case with diverse events (CASE-001)
2. Observe Timeline card

**Verify:**
- ✅ Multiple events displayed
- ✅ Vertical timeline connecting line visible
- ✅ Each event shows:
  - Colored circle with icon
  - Event title
  - Timestamp (formatted as "15 Jan 2025, 14:30")
  - Event type badge (e.g., "CERTIFICATE ADDED")
  - Description text
- ✅ Events ordered newest to oldest (top to bottom)

#### Test 5: Severity Color Coding

Using the same populated case, verify color coding:

**Verify:**
- ✅ **Critical** events (termination decisions, compliance issues):
  - Red border and background (`border-red-300 bg-red-50`)
  - Red text color
- ✅ **Warning** events (unfit certificates, pre-termination):
  - Amber/yellow border and background (`border-amber-300 bg-amber-50`)
  - Amber text color
- ✅ **Info** events (most events):
  - Slate/gray border and background (`border-slate-300 bg-slate-50`)
  - Gray text color

#### Test 6: Event Type Icons

Verify Material Symbols icons are correct for each event type:

**Verify:**
- ✅ **Certificate Added**: `medical_information` (medical cross icon)
- ✅ **Discussion Note**: `forum` (chat bubble icon)
- ✅ **Attachment Uploaded**: `attach_file` (paperclip icon)
- ✅ **Case Created**: `person_add` (person with plus icon)
- ✅ **Termination Milestones**: Various (`handshake`, `send`, `gavel`, etc.)

#### Test 7: Risk Flags Display

1. Find a case with discussion notes containing risk flags
2. Observe the discussion note event in timeline

**Verify:**
- ✅ Risk flags displayed as small pill badges
- ✅ Maximum of 3 flags shown (even if more exist)
- ✅ Badges have correct styling (`text-[10px]`)

#### Test 8: Event Type Badge Formatting

**Verify badge text formatting:**
- ✅ `certificate_added` → "CERTIFICATE ADDED"
- ✅ `discussion_note` → "DISCUSSION NOTE"
- ✅ `attachment_uploaded` → "ATTACHMENT UPLOADED"
- ✅ `case_created` → "CASE CREATED"
- ✅ All badges are uppercase
- ✅ Underscores replaced with spaces

#### Test 9: Timestamp Formatting

**Verify timestamps use Australian locale (en-AU):**
- ✅ Format: "DD Mon YYYY, HH:MM"
- ✅ Example: "15 Jan 2025, 14:30"
- ✅ Month is abbreviated (Jan, Feb, Mar, etc.)
- ✅ 24-hour time format
- ✅ Leading zeros for single-digit days/hours

#### Test 10: Mobile Responsive

1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone SE" (375x667)
4. Navigate to case detail panel

**Verify:**
- ✅ Timeline card displays correctly on narrow screen
- ✅ No horizontal scrolling required
- ✅ Event text wraps appropriately
- ✅ Icons and badges remain visible
- ✅ Timeline connecting line adjusts correctly

#### Test 11: Scrolling Behavior

1. Find a case with 20+ timeline events
2. Open case detail panel
3. Scroll within the timeline card

**Verify:**
- ✅ Timeline scrolls independently within its card
- ✅ Other cards (Summary, Discussion Notes) don't scroll with timeline
- ✅ All events accessible via scrolling
- ✅ Scroll performance is smooth (60fps)

#### Test 12: Performance

1. Open React DevTools
2. Navigate to "Profiler" tab
3. Start recording
4. Open a case with 50+ events
5. Stop recording

**Verify:**
- ✅ TimelineCard render time < 200ms
- ✅ No unnecessary re-renders
- ✅ No memory leaks
- ✅ No console warnings

### Integration Testing

#### Test 1: Timeline Position in Panel

1. Open any case detail panel
2. Observe card order

**Verify:**
- ✅ Timeline card appears after Discussion Notes card
- ✅ Timeline card has correct styling (matches other cards)
- ✅ Card header shows timeline icon + "Case Timeline" title

#### Test 2: Multiple Cases

1. Open Case A
2. Note the timeline events
3. Close and open Case B
4. Note the timeline events

**Verify:**
- ✅ Timeline updates to show Case B events
- ✅ No events from Case A remain visible
- ✅ Fetch is called for each case (check Network tab)

#### Test 3: Real-Time Updates

1. Open a case detail panel
2. In another browser tab, create a new discussion note for that case
3. Refresh the case detail panel

**Verify:**
- ✅ New event appears in timeline
- ✅ Timeline reorders correctly (newest first)

## Edge Cases

### Edge Case 1: Invalid Timestamp

**Scenario**: Event with malformed timestamp
**Expected**: Shows "Unknown" instead of crashing

### Edge Case 2: Missing Optional Fields

**Scenario**: Event without description, metadata, or icon
**Expected**: Renders correctly with defaults (generic icon, no description)

### Edge Case 3: Very Long Descriptions

**Scenario**: Event with 500+ character description
**Expected**: Text wraps correctly, no overflow

### Edge Case 4: Special Characters

**Scenario**: Event title/description with emojis, HTML entities
**Expected**: Renders correctly, no XSS vulnerability

### Edge Case 5: Network Interruption

**Scenario**: Network disconnects during fetch
**Expected**: Shows error state, graceful degradation

## Test Data Requirements

For comprehensive testing, ensure your database has:

1. **At least one case with:**
   - 3+ medical certificates (including unfit capacity)
   - 5+ discussion notes (including critical risk flags)
   - 2+ attachments
   - Termination process with multiple milestones
   - Created date in the past

2. **At least one case with:**
   - No events (empty timeline)

3. **At least one case with:**
   - 50+ events (for performance testing)

## Success Criteria

All tests pass when:

### Backend
- ✅ API returns 200 for valid cases
- ✅ API returns 404 for invalid cases
- ✅ Events sorted newest-first
- ✅ Limit parameter works correctly
- ✅ Response time < 500ms
- ✅ All event types present
- ✅ Severity levels correct
- ✅ Metadata preserved
- ✅ Icons assigned correctly

### Frontend
- ✅ All 4 states render correctly (loading, error, empty, populated)
- ✅ Severity colors display correctly
- ✅ Risk flags display (max 3)
- ✅ Timestamps formatted correctly
- ✅ Event type badges formatted correctly
- ✅ Mobile responsive
- ✅ Performance < 200ms render time
- ✅ No console errors or warnings

### Integration
- ✅ Timeline appears in correct position
- ✅ Timeline updates when case changes
- ✅ No regression in existing features
- ✅ All edge cases handled gracefully

## Troubleshooting

### Timeline not loading
- Check browser console for errors
- Verify backend server is running
- Check Network tab for failed API calls
- Verify case ID exists in database

### Events out of order
- Check `timestamp` field in database
- Verify server timezone configuration
- Check sorting logic in `getCaseTimeline()`

### Performance issues
- Check database indexes on foreign keys
- Verify `limit` parameter is working
- Profile with React DevTools
- Check for N+1 query issues

### Style issues
- Verify Tailwind CSS is building correctly
- Check Material Symbols font is loaded
- Inspect element classes in DevTools
- Verify shadcn/ui components are installed

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser/environment details
5. Console errors (if any)
6. Screenshots (if applicable)
7. Test case ID (if applicable)

## Maintenance

Update this document when:
- New event types are added
- Timeline UI changes
- New edge cases discovered
- Performance requirements change
- Test infrastructure changes
