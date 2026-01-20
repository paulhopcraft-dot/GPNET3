# Architecture Decision Records

This document tracks key architectural decisions for the Preventli project.

---

## 2026-01-19 - AI Summary Storage Strategy

**Status:** Accepted | **Confidence:** 75%

### Context

The case summary feature generates AI-powered summaries using Claude API. The question arose whether to store these summaries in the database or generate them on-demand.

Current fields stored on `worker_cases`:
- `aiSummary` (text) - Full markdown summary
- `aiSummaryGeneratedAt` (timestamp) - When generated
- `aiSummaryModel` (text) - Model used (e.g., claude-sonnet-4-20250514)
- `aiWorkStatusClassification` (text) - Extracted work status

### Decision

**Keep the current hybrid approach:**

1. **KEEP storing cached summaries** - API calls take 10-60 seconds and cost money
2. **KEEP metadata fields** - For freshness checks and audit trail
3. **KEEP extracting structured data** - Work status classification, action items to `case_actions`
4. **Consider future extraction** - Risk register items, key dates, financial figures could be normalized

### Rationale

| Approach | Latency | Cost | Freshness | Query-ability |
|----------|---------|------|-----------|---------------|
| On-demand only | 10-60s | High | Always fresh | None |
| Cache + refresh | <100ms | Low | Good (refresh on data change) | Partial |
| Structured JSON | <100ms | Low | Good | Full |

The current approach balances UX (fast display) with cost (cached reduces API calls) and maintainability (refresh mechanism via `needsSummaryRefresh`).

### Alternatives Considered

1. **Generate on-demand only** - Rejected due to 10-60s latency per page load
2. **Store as structured JSON instead of markdown** - Deferred; requires parsing logic and migration
3. **Extract all fields to normalized tables** - Partial adoption; action items already extracted

### Consequences

- Summaries may be slightly stale (acceptable for case management)
- Full-text search of summary content not efficient (would need separate search index)
- Action items are queryable via `case_actions` table

### Related Issues

- Model updated from `claude-3-5-sonnet-20241022` to `claude-sonnet-4-20250514` (2026-01-19)
- API credit balance required for summary generation

### Revisit

Revisit if:
- Users report stale summaries as a problem
- Need to query/filter by summary contents
- Storage costs become significant

---
