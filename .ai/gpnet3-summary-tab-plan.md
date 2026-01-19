# Plan: Fix Case Summary Tab Duplication and Layout

## Goal
Fix the Summary tab to show a clean, non-duplicated overview with Latest Update, Outstanding Items, and Next Action - removing incorrect duplicate sections.

## Constraints
- Do not modify other tabs (Injury, Timeline, Treatment, etc.)
- Summary tab should only show summary content, not duplicate data from other tabs
- Do not change the tab structure or navigation
- Keep existing API endpoints

## Execution Briefing (Auto-Generated)
📋 TASK SUMMARY: Remove duplicate sections from Summary tab, fix layout
📊 WORK BREAKDOWN: 7 total steps
🧠 MODEL ALLOCATION: Primary=SONNET | OPUS:0 SONNET:7 HAIKU:0
⚡ APPROACH: Frontend component debugging and cleanup
🎯 KEY COMMANDS: Browser verification after each change
⏱️ ESTIMATED SCOPE: Low-Medium complexity - expect 1 session
🔍 CRITICAL PATHS: Step 2 (find duplication source), Step 4 (remove incorrect row)

## Steps
1. [SONNET] Open the case detail page component and identify Summary tab content (likely EmployerCaseDetailPage.tsx or similar)
2. [SONNET] Find the source of duplication - locate where status/info is rendered twice in the component tree
3. [SONNET] Remove the duplicate "current status summary" / "case information" section
4. [SONNET] Remove the incorrect "worker company injury date work status risk level" row that shouldn't be there
5. [SONNET] Ensure Summary tab displays only:
   - Latest Update (status, recent activity summary)
   - Outstanding Items (bullet list)
   - Next Action
6. [SONNET] Verify the aiSummary field content renders correctly as markdown
7. [SONNET] Test with Andres Nieto case in browser to confirm fix

## Done When
- Summary tab shows single status section (no duplication)
- No "worker company injury date work status risk level" row appears incorrectly
- Latest Update section displays cleanly
- Outstanding Items and Next Action visible
- Other tabs (Injury, Timeline, Treatment, etc.) unaffected
- Andres Nieto case displays correctly as reference
