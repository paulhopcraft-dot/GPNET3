---
description: Reload project context after /clear (LEAN MODE - optimized for fresh terminals)
---

Reload project context with **lean-by-default** approach. Fresh terminals start at ~5-10% context instead of ~30%.

## Lean Context Reload (Default)

**Target: ~100 lines loaded vs previous ~850 lines**

### Step 1: Essential Context (~50 lines)
1. Read @CLAUDE.md - Core engineering guidelines (29 lines)
2. Read @claude-progress-current.txt - Current session only (20 lines)
3. Read @.claude/strategy.md - Current focus (15 lines)

### Step 2: Recent Memory (~30 lines)
Load memory summaries instead of full files:
- `.claude/v3/memory/cache/recent.json` - Last 3 decisions/learnings only
- `.claude/v3/memory/project.json` - Project basics (7 lines)

### Step 3: Current Status (~20 lines)
- git status - Uncommitted changes
- Current feature status (summary only)
- Session context

## On-Demand Context Expansion

**Commands for more context when needed:**

```bash
/reload-full          # Load complete context (850+ lines, old behavior)
/history [days]       # Load recent session history
/memory-deep          # Load all decisions/learnings
/recall-archive [id]  # Load specific archived session
```

## Status Report (Lean)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: [name] 🚀 LEAN CONTEXT MODE
Current Focus: [from strategy.md]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recent Work (Current Session):
- [Last 2 items from claude-progress-current.txt]

Status:
✅ X features passing
⏳ Y in progress
📝 Archive: [count] sessions stored

Memory: [count] recent decisions/learnings loaded
Archive: Use /history or /reload-full for complete context

Next Task: [from current session]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Context Optimization Notes

**Lean mode benefits:**
- Fresh terminals usable immediately (5-10% vs 30% context)
- Faster reload times (<5 seconds vs ~15 seconds)
- Archive system automatically manages growth
- Full context available on-demand

**Archive system:**
- Sessions auto-archived when progress >300 lines
- Archived to `claude-progress-archive/` monthly files
- Use `/history [days]` or `/reload-full` to access

## Ready to Continue

"Context reloaded (LEAN MODE). Ready to continue from: [current task]"

**Context usage: ~5-10% 🎯**

Use `/reload-full` if you need complete project history.
