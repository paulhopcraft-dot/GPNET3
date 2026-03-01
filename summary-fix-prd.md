# PRD: Fix AI Summary Generation Caching Issue

## Problem Statement
Enhanced hybrid summary system with Sonnet 4 is implemented but old Haiku-generated summaries persist in database, preventing new detailed summaries from generating. Users receive poor quality summaries suggesting inappropriate "return to work plans" for already-employed workers like Andres Nieto.

## Feature Overview
Fix the AI summary caching mechanism to ensure:
1. New enhanced Sonnet 4 summaries can override cached Haiku summaries
2. Summaries understand current employment status (no RTW suggestions for employed workers)
3. Detailed January 2026 format summaries are generated with specific dates, symptom ratings, and financial details

## User Stories

### Story 1: Cache Bypass for Enhanced Summaries
**As a** case manager
**I want** the system to generate new Sonnet 4 summaries even when old summaries exist
**So that** I get enhanced quality summaries with current employment context

**Acceptance Criteria:**
- `api_verify: POST /api/cases/FD-43714/summary?force=true returns new summary`
- `api_verify: response.model contains "claude-sonnet-4"`
- `api_verify: response.cached equals false`
- `api_verify: response.generatedAt is recent (within 5 minutes)`

**Prerequisites:**
- HybridSummaryService is implemented
- Anthropic API key is configured
- Server is running on port 5000

### Story 2: Employment Status Recognition
**As a** case manager
**I want** AI summaries to recognize when workers are currently employed
**So that** I don't get inappropriate "return to work plan" suggestions

**Acceptance Criteria:**
- `content_verify: summary for employed worker does not contain "return to work plan"`
- `content_verify: summary for employed worker does not contain "consider RTW"`
- `content_verify: summary recognizes "At work" status from workStatus field`
- `content_verify: summary includes current employer name (e.g., "IKON Services")`

**Prerequisites:**
- Worker case has workStatus="At work"
- Current employer information is available
- Enhanced prompting includes employment status context

### Story 3: Detailed Summary Format
**As a** case manager
**I want** summaries to include specific dates, symptom ratings, and financial details
**So that** I get comprehensive case information in January 2026 format

**Acceptance Criteria:**
- `content_verify: summary contains specific dates (format: "XX/XX/XXXX")`
- `content_verify: summary contains symptom ratings (format: "X/10")`
- `content_verify: summary contains financial amounts (format: "$XXX")`
- `content_verify: summary contains "Latest Update" section with current date`
- `content_verify: summary includes "Status:" with claim status and employment details`

**Prerequisites:**
- Complete Freshdesk ticket data is available
- Enhanced prompting includes example format
- Sonnet 4 model is being used

### Story 4: Cache Refresh Logic Fix
**As a** system administrator
**I want** the needsRefresh logic to correctly identify when summaries need updating
**So that** enhanced summaries are generated when the model or prompting changes

**Acceptance Criteria:**
- `code_verify: needsRefresh returns true when aiSummaryModel != current model`
- `code_verify: needsRefresh returns true when aiSummary is null or empty`
- `code_verify: force=true parameter bypasses all caching`
- `database_verify: old Haiku summaries can be cleared and regenerated`

**Prerequisites:**
- Database schema supports model tracking
- needsSummaryRefresh function exists
- Force generation parameter is implemented

## Implementation Plan

### Phase 1: Fix Cache Logic (15 min)
1. Update needsSummaryRefresh to check model version
2. Add force parameter handling to bypass cache
3. Clear specific cached summaries for testing

### Phase 2: Enhanced Prompting (20 min)
1. Update system prompts to include employment status awareness
2. Add January 2026 format examples to prompts
3. Include complete Freshdesk ticket data in context

### Phase 3: Testing & Verification (15 min)
1. Test with Andres Nieto case (FD-43714)
2. Verify no RTW suggestions for employed workers
3. Confirm detailed format with dates/ratings/finances
4. Test cache bypass functionality

## Success Criteria
- ✅ New Sonnet 4 summaries generate for test cases
- ✅ No inappropriate RTW suggestions for employed workers
- ✅ Detailed January 2026 format with specific data
- ✅ Cache can be bypassed when needed

## Rollback Plan
If issues occur:
1. Restore original summary service configuration
2. Clear problematic cached summaries
3. Fall back to template-based summaries if needed
4. Re-enable Haiku model as temporary measure

## Technical Notes
- Current model: `claude-sonnet-4-20250514`
- Test case: Andres Nieto (FD-43714) - employed at IKON Services
- Expected format: January 2026 detailed summary with employment context
- API endpoint: `/api/cases/:id/summary` with force parameter