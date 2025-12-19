---
description: Pick next incomplete feature and implement it
---

# /project:continue

1. Read features.json, find next "passes": false feature
2. Check dependencies are satisfied (skip if blocked)
3. Implement the feature with tests
4. Run tests, verify end-to-end
5. Update features.json: set passes: true
6. Update claude-progress.txt with what was done
7. Commit with conventional message (feat:/fix:/etc)

If no features.json exists, say so and suggest /project:status first.

$ARGUMENTS
