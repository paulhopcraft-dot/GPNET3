---
description: Re-test all completed features for regressions
---

# /project:verify

Run verification on all features with passes: true

For each completed feature:
1. Run its test suite
2. Check acceptance criteria still met
3. Report PASS or FAIL

Output results showing which passed and which failed.

If any fail, suggest fixes or flip passes back to false.
