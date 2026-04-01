# Overnight QA Patrol Prompt

Stored here for reference. Use Layer 1 (master prompt) for initial run, then Layer 2 (loop watchdog) for recurring cycles.

## Layer 2 — Loop Watchdog Prompt

```
Re-run the overnight workflow integrity watchdog for the injury management application.

On this cycle:
1. inspect changed files, failing tests, logs, and existing QA artifacts
2. choose the single highest-value next workflow, contradiction, or regression check
3. run only the relevant checks
4. update:
   - overnight-qa-log.md
   - loop-journal.md
   - workflow-gap-register.md
   - logic-contradictions.md
   - test-scorecard.md
5. surface only:
   - new critical/high issues
   - score changes
   - regressions
   - newly discovered contradictions
   - policy questions
6. apply at most one bounded change, and only if clearly justified
7. stop if stop conditions are met

Be strict.
Do not hide workflow defects behind passing tests.
Do not invent policy silently.
Prefer reports and targeted tests over broad edits.
```

## Notes

- Full master prompt is too large to store here — it lives in the conversation history
- Run Layer 1 in a fresh Claude Code session with Opus + 1M context
- Run Layer 2 via `/loop 30m` after Layer 1 completes
- Server needs `NODE_OPTIONS="--max-old-space-size=4096"` to avoid OOM crashes
- Login: `admin@gpnet.local` / `devpass123` (dev bypass)
