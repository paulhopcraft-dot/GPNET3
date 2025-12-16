---
description: Save state for next session
---

# /project:handoff

End of session save:

1. Check for uncommitted changes - commit them with WIP message if needed
2. Update features.json with current status
3. Write to claude-progress.txt:
   - What was completed this session
   - What's in progress (with file locations)
   - Exact next step
   - Decisions made
   - Any blockers
4. Push to remote if configured

Output confirmation of what was saved.
