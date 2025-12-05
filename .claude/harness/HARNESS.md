# Agentic Harness for Long-running Claude Code Sessions

Based on Anthropic's research: **"Effective Harnesses for Long-running Agents"**

## Overview

This harness enables Claude Code to work effectively across multiple context windows by:

1. **Structured Progress Tracking** - JSON-based files that persist across sessions
2. **Feature Requirements** - Clear list of what needs to be done with verification steps
3. **Session Scripts** - Initialization and end-of-session routines
4. **Git Integration** - Using commits as checkpoints and recovery points

## The Problem

Long-running agents face two main failure modes:

1. **One-shotting** - Trying to build everything at once, hitting context limits mid-implementation
2. **Premature completion** - Claiming the project is done when features are incomplete

## The Solution

### Two-Agent Pattern

**Initializer Agent** (runs once per project/major task):
- Creates feature requirements in `features.json`
- Sets up progress tracking in `claude_progress.json`
- Establishes baseline with initial commit

**Coding Agent** (runs each session):
- Reads progress and feature files to understand state
- Works on ONE feature at a time
- Commits frequently with clear messages
- Only marks features as passing after verification
- Leaves codebase in clean, committable state

## Files

```
.claude/harness/
├── HARNESS.md              # This documentation
├── claude_progress.json    # Session-to-session context
├── features.json           # Feature requirements (passes: false initially)
├── features.schema.json    # JSON Schema for validation
├── init.sh                 # Run at session START
└── end-session.sh          # Run at session END
```

## Usage

### Starting a Session

```bash
# Run initialization script
./.claude/harness/init.sh

# Or manually:
# 1. pwd - verify working directory
# 2. cat .claude/harness/claude_progress.json - read progress
# 3. cat .claude/harness/features.json - read features
# 4. git log --oneline -10 - see recent commits
# 5. npm run test - verify tests pass
```

### During a Session

1. **Pick ONE feature** from `features.json` (priority order, failing features first)
2. **Implement** the feature
3. **Verify** using the verification_steps in the feature definition
4. **Commit** with a clear message
5. **Update** `features.json` - change `passes: false` to `passes: true`
6. **Update** `claude_progress.json` summary
7. **Repeat** or end session

### Ending a Session

```bash
# Run end-of-session script
./.claude/harness/end-session.sh

# Ensure:
# - All changes committed
# - Tests pass
# - Build succeeds
# - Progress file updated
```

## Critical Rules

These rules are **UNACCEPTABLE** to violate:

1. **NEVER** remove or edit feature definitions in `features.json`
2. **ONLY** change `passes` from `false` to `true`
3. **NEVER** mark a feature as passing without verification
4. **Work on ONE feature at a time**
5. **Commit frequently** with clear messages
6. **If tests fail**, fix them before moving to next feature
7. **Leave codebase clean** - no half-done work

## Why JSON?

From the research:

> "We landed on JSON because the model is less likely to inappropriately change or overwrite JSON files compared to markdown files."

Markdown feels more "editable" to the model. JSON's structured format creates a psychological barrier against inappropriate modifications.

## Adding New Features

When adding features to `features.json`:

```json
{
  "id": "F005",
  "name": "Feature Name",
  "description": "What this feature does",
  "priority": 2,
  "category": "feature",
  "passes": false,
  "verification_steps": [
    "Step 1 to verify",
    "Step 2 to verify"
  ],
  "dependencies": ["F001", "F002"],
  "notes": "Additional context"
}
```

**Categories**: `infrastructure`, `testing`, `feature`, `bugfix`, `refactor`, `documentation`

**Priority**: 1 (highest) to 5 (lowest)

## Git as Safety Net

Every commit is a recovery point. If something breaks:

```bash
# See what changed
git log --oneline -10
git diff HEAD~1

# Revert if needed
git revert HEAD
# or
git checkout HEAD~1 -- path/to/file
```

## Session Progress Format

Update `claude_progress.json` with session summaries:

```json
{
  "sessions": [
    {
      "date": "2025-12-05",
      "features_completed": ["F001", "F002"],
      "commits": ["abc123", "def456"],
      "summary": "Set up environment and verified tests pass",
      "blockers": [],
      "next_steps": ["Work on F003"]
    }
  ]
}
```

## References

- Anthropic Research: "Effective Harnesses for Long-running Agents"
- Claude Agent SDK Documentation
- Spec-driven Development patterns
