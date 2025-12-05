# GPNet Agent Harness

## Session Instructions

Every coding session MUST follow this exact sequence:

1. Run: `pwd`
2. List all project files recursively
3. Read: `factori/features.json`
4. Read: `factori/progress.log`
5. Read: latest git commit(s)
6. Identify ONE feature where `"pass": false`
7. Restate plan, boundaries, and affected files BEFORE coding
8. Modify ONLY the files required for that single feature
9. Do NOT touch unrelated files or architecture
10. Do NOT modify tests unless explicitly instructed
11. Implement the feature cleanly and incrementally
12. Ensure any existing tests continue to pass
13. Update ONLY the "pass" field in `features.json`
14. Append a concise summary to `progress.log`
15. Commit with a descriptive message mentioning ONLY the feature
16. STOP — do not proceed to a second feature.

## Key Files

- `factori/features.json` - Feature tracking (pass/fail status)
- `factori/progress.log` - Chronological work log
- `factori/harness_instructions.md` - Original harness source

## Enforcement

This harness MUST be enforced in every session. Focus on ONE feature at a time.
