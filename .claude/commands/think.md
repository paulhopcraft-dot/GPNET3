---
description: Thinking mode selector based on task complexity
---

| Mode | Tokens | Use When |
|------|--------|----------|
| think | ~4,000 | Simple fixes, small changes |
| think hard | ~8,000 | Multi-file changes, moderate complexity |
| think harder | ~16,000 | Architecture decisions, debugging failures |
| ultrathink | ~32,000 | Initial planning, complex research, repeated failures |

Rules:
- Use ultrathink for first request in a session
- If task failed with lower thinking, escalate
- At 50% context, quality degrades - use /project:fresh
