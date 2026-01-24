---
name: spawn
version: 1.0.0
description: Multi-instance parallel deployment - run 5+ Claude Code instances simultaneously
---

# Spawn Parallel Instances: $ARGUMENTS

## Overview

Run multiple Claude Code instances in parallel for faster development. Based on Boris's workflow of running 5+ instances simultaneously, each working on different parts of a project.

---

## Why Multiple Instances?

- **5x faster development** - Parallelize independent tasks
- **Focused context** - Each instance has clean, dedicated context
- **No laptop meltdown** - Terminal is lighter than IDE extensions
- **Isolated branches** - Each instance works on its own worktree

---

## Quick Start

### 1. Decompose Your Task

First, break your feature into parallelizable chunks:

```
/spawn "Build user dashboard with auth, API, and tests"
```

**Claude analyzes and suggests:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task Decomposition
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature: User Dashboard

Parallelizable chunks:
  1. [layout]  Dashboard UI + routing
  2. [api]     Backend endpoints for user data
  3. [auth]    Authentication middleware
  4. [tests]   Unit + E2E tests

Dependencies:
  - tests depends on api + layout (run last)
  - layout + api + auth can run in parallel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Open Terminal Tabs

**Mac:**
```
Command + T          → New tab
Command + Shift + I  → Rename tab
```

**Linux:**
```
Ctrl + Shift + T     → New tab
Right-click tab      → Rename
```

**Windows Terminal:**
```
Ctrl + Shift + T     → New tab
Right-click tab      → Rename
```

### 3. Create Worktrees (Optional but Recommended)

Each instance gets its own branch to avoid conflicts:

```bash
# In your main terminal
git worktree add ../spawn-layout feature/layout
git worktree add ../spawn-api feature/api
git worktree add ../spawn-auth feature/auth
git worktree add ../spawn-tests feature/tests
```

### 4. Launch Claude in Each Tab

**Tab 1 - "layout":**
```bash
cd ../spawn-layout
claude
```

**Tab 2 - "api":**
```bash
cd ../spawn-api
claude
```

**Tab 3 - "auth":**
```bash
cd ../spawn-auth
claude
```

**Tab 4 - "tests":**
```bash
cd ../spawn-tests
claude
```

### 5. Assign Tasks

Give each instance its focused prompt:

**Tab 1 (layout):**
```
Build the dashboard layout with:
- Sidebar navigation
- Main content area
- User profile dropdown
- Responsive design

Commit when done with message: "feat(layout): dashboard UI"
```

**Tab 2 (api):**
```
Create API endpoints:
- GET /api/user/profile
- GET /api/user/stats
- PUT /api/user/settings

Commit when done with message: "feat(api): user endpoints"
```

**Tab 3 (auth):**
```
Implement auth middleware:
- JWT validation
- Role-based access
- Session refresh

Commit when done with message: "feat(auth): middleware"
```

**Tab 4 (tests):**
```
Wait for me to say "ready", then:
- Write unit tests for API endpoints
- Write E2E tests for dashboard
- Ensure 80%+ coverage

Commit when done with message: "test: dashboard coverage"
```

---

## Coordination Checklist

Track which instance owns what:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Spawn Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instance  │ Task      │ Branch          │ Status
──────────┼───────────┼─────────────────┼────────
Tab 1     │ layout    │ feature/layout  │ ⏳ working
Tab 2     │ api       │ feature/api     │ ✅ done
Tab 3     │ auth      │ feature/auth    │ ⏳ working
Tab 4     │ tests     │ feature/tests   │ ⏸️ waiting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Merge Strategy

When all instances complete:

### Option A: Sequential Merge
```bash
git checkout main
git merge feature/layout
git merge feature/api
git merge feature/auth
git merge feature/tests
```

### Option B: Octopus Merge (all at once)
```bash
git checkout main
git merge feature/layout feature/api feature/auth feature/tests
```

### Option C: Squash Each
```bash
git checkout main
git merge --squash feature/layout && git commit -m "feat: dashboard layout"
git merge --squash feature/api && git commit -m "feat: user API"
# ... etc
```

---

## Cleanup

After merging:

```bash
# Remove worktrees
git worktree remove ../spawn-layout
git worktree remove ../spawn-api
git worktree remove ../spawn-auth
git worktree remove ../spawn-tests

# Delete branches
git branch -d feature/layout feature/api feature/auth feature/tests

# Prune stale references
git worktree prune
```

---

## Terminal vs IDE

**Why Boris uses terminal directly:**

| Terminal | IDE Extension (Cursor/VS Code) |
|----------|-------------------------------|
| Lighter memory footprint | Heavier - runs inside IDE |
| Can run 5+ instances | 2-3 before lag |
| Direct Claude Code | Extra abstraction layer |
| Faster responses | Slightly slower |

**When to use IDE:** Single-instance work where you need inline code suggestions.

**When to use terminal:** Parallel work, overnight tasks, heavy lifting.

---

## Automation Script

Save as `spawn.sh` for quick setup:

```bash
#!/bin/bash
# Usage: ./spawn.sh <feature-name> <chunk1> <chunk2> <chunk3> ...

FEATURE=$1
shift
CHUNKS=("$@")

echo "Creating worktrees for: $FEATURE"

for chunk in "${CHUNKS[@]}"; do
    BRANCH="feature/${FEATURE}-${chunk}"
    PATH_WT="../spawn-${chunk}"

    git worktree add "$PATH_WT" -b "$BRANCH"
    echo "✓ Created: $PATH_WT ($BRANCH)"
done

echo ""
echo "Now open ${#CHUNKS[@]} terminal tabs and run:"
for chunk in "${CHUNKS[@]}"; do
    echo "  cd ../spawn-${chunk} && claude"
done
```

**Usage:**
```bash
./spawn.sh dashboard layout api auth tests
```

---

## Best Practices

1. **Decompose first** - Spend 5 min planning chunks before spawning
2. **Independent tasks** - Each instance should work on non-overlapping code
3. **Clear boundaries** - "You own /src/api, don't touch /src/ui"
4. **Commit frequently** - Small commits in each worktree
5. **Coordinate dependencies** - If B needs A, tell B to wait
6. **Name your tabs** - You will forget which is which

---

## Integration with Other Commands

- `/worktree create` - Create individual worktrees
- `/delegate` - Spawn sub-agents within single session
- `/status` - Check project progress across branches
- `/resolve` - Fix merge conflicts when combining work

---

## Example: Full Workflow

```bash
# 1. Plan decomposition
/spawn "E-commerce checkout flow"

# 2. Create worktrees (from main terminal)
git worktree add ../spawn-cart feature/cart
git worktree add ../spawn-payment feature/payment
git worktree add ../spawn-confirmation feature/confirmation

# 3. Open 3 new terminal tabs, name them: cart, payment, confirmation

# 4. In each tab:
#    cd ../spawn-<name> && claude

# 5. Assign tasks to each instance

# 6. Monitor progress, merge when all complete

# 7. Cleanup
git worktree remove ../spawn-cart ../spawn-payment ../spawn-confirmation
git branch -d feature/cart feature/payment feature/confirmation
```

---

**Ready to spawn? Describe your feature and I'll decompose it into parallel chunks.**
