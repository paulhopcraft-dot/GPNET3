---
description: Spawn sub-agents for isolated tasks
---

Main agent = Manager. Delegates to:
- Research: Find code, return paths + signatures
- Review: Analyze, return categorized findings
- Validator: Run tests, return PASS/FAIL + evidence
- Debug: Trace issues, return root cause + fix

Sub-agents ephemeral. Return summaries only.
