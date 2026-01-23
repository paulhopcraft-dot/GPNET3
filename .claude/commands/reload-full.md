---
description: Load complete project context (heavy mode - 850+ lines)
---

Load **complete project context** including all session history and memory files.

**⚠️ WARNING: This loads 850+ lines and uses ~30% context immediately**

Use this when you need:
- Complete session history (all archived sessions)
- Full memory context (all decisions/learnings)
- Detailed project background
- Comprehensive understanding for complex tasks

## Full Context Reload Sequence

### Step 1: Load All Core Files
1. Read @CLAUDE.md - Engineering guidelines (29 lines)
2. Read @features.json - Complete feature matrix (88 lines)
3. Read @claude-progress.txt - All recent sessions (341 lines)
4. Read @.claude/strategy.md - Strategy context (35 lines)
5. Read @.claude/settings.local.json - Full configuration (85 lines)

### Step 2: Load Complete Memory System
Retrieve all context using /recall:

```
/recall project     # Complete project understanding
/recall --type decision    # All architectural decisions
/recall --type learning    # All patterns and learnings
/recall --recent 10        # Last 10 memory items
```

Memory files loaded:
- `.claude/v3/memory/project.json` - Project understanding
- `.claude/v3/memory/decisions.json` - All key decisions (29 lines)
- `.claude/v3/memory/learnings.json` - All learnings (42 lines)
- `.claude/v3/memory/entities.json` - All entities

### Step 3: Load Archive Context
- Check `claude-progress-archive/index.json` for archived sessions
- Available archived sessions: Sessions 24-25 (use `/recall-archive [id]` to load specific)

### Step 4: Complete Health Check
- git status - All uncommitted changes
- git worktree list - All active branches
- git log --oneline -10 - Recent commits
- Feature status analysis
- Session registry check

## Status Report (Complete)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: [name] 📚 FULL CONTEXT MODE
Current Focus: [from complete analysis]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Complete Session History:
- [All sessions from current + archive]

Complete Status:
✅ X features passing (detailed breakdown)
⏳ Y features in progress (with blockers)
📝 Z features remaining (with priorities)
🗄️ Archive: [count] archived sessions available

Active Worktrees: [complete list with status]

Memory System:
- Decisions: [count] loaded ([list recent])
- Learnings: [count] loaded ([list recent])
- Entities: [count] loaded
- Project context: Complete

Next Task: [from comprehensive analysis]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Context Usage

**This mode loads ~850+ lines and uses ~30% context**

Benefits:
- Complete project understanding
- All historical context available
- Full memory system loaded
- Comprehensive decision context

Cost:
- High context usage (30% immediately)
- Slower reload time (~15 seconds)
- Less room for actual work

## Alternative Commands

For lighter context loading:
```bash
/reload              # Lean mode (5-10% context)
/history 7           # Last 7 days of sessions
/memory-deep         # Just memory files (no progress)
/recall-archive s24  # Specific archived session
```

## Ready to Continue

"Complete context loaded. Full project history available."

**Context usage: ~30% ⚠️**

Consider using `/reload` (lean mode) for regular work to preserve context space.