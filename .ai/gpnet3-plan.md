# Plan: Fix Urgent and Routine Actions Display

## Goal
Modify the employer dashboard API to return actions distributed across all three priority levels so urgent and routine sections display items.

## Constraints
- Do not change the priority calculation logic
- Do not modify frontend components
- Do not change the statistics calculation
- Keep total actions returned at approximately 50 for performance

## Execution Briefing (Auto-Generated)
📋 TASK SUMMARY: Fix API to distribute actions across priority levels
📊 WORK BREAKDOWN: 5 total steps
🧠 MODEL ALLOCATION: Primary=SONNET | OPUS:0 SONNET:5 HAIKU:0
⚡ APPROACH: Single file modification with targeted logic change
🎯 KEY COMMANDS: /verify after implementation
⏱️ ESTIMATED SCOPE: Low complexity - expect 1 session
🔍 CRITICAL PATHS: Step 2 (core logic change)

## Steps
1. [SONNET] Open server/routes/employer-dashboard.ts and locate line 250 with priorityActions.slice(0, 50)
2. [SONNET] Replace the single slice with distributed selection logic:
   - Filter priorityActions into three arrays by priority
   - Take up to 20 critical actions
   - Take up to 15 urgent actions
   - Take up to 15 routine actions
3. [SONNET] Concatenate the three arrays to form the final priorityActions response
4. [SONNET] Keep existing sort order within each priority group (by daysOverdue descending)
5. [SONNET] Test by refreshing employer dashboard and verifying all three sections show items

## Done When
- API response includes actions with priority='urgent'
- API response includes actions with priority='routine'
- Employer dashboard shows items in Urgent Actions section (not 0)
- Employer dashboard shows items in Routine Actions section (not 0)
- Critical Actions section continues to display items
- All tests pass
