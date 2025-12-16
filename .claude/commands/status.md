---
description: Show project progress dashboard
---

# /project:status

Read features.json (or PROJECT_INDEX.json if no features.json) and report:

Progress: X/Y features complete (Z%)

COMPLETED:
- F001: [name]
- F002: [name]

IN PROGRESS:
- F00X: [name] - [status/blocker]

REMAINING:
- F00X: [name] (depends on: F00X)

NEXT UP: F00X - [name]

BLOCKERS:
- [list any blockers]
