# Git Branch Workflow - Parallel Development

## Quick Start: Create a Feature Branch

```bash
# 1. Check current branch and status
git status
git branch

# 2. Create and switch to new branch for compliance engine
git checkout -b feature/compliance-engine

# 3. Verify you're on the new branch
git branch
# * feature/compliance-engine  <-- current branch (marked with *)
#   main
```

## Work on Multiple Features in Parallel

### Scenario: Work on Compliance Engine + Debug Smart Summary

**Branch 1: Compliance Engine** (new feature)
```bash
# Create branch from main
git checkout main
git checkout -b feature/compliance-engine

# Work on compliance rules, document ingestion, etc.
# Make commits as you go
git add .
git commit -m "feat: add certificate expiry compliance rule"
```

**Branch 2: Bug Fix for Smart Summary** (fix 500 error)
```bash
# Switch back to main, create bug fix branch
git checkout main
git checkout -b fix/smart-summary-500-error

# Fix the 500 error
# Make commits
git add .
git commit -m "fix: resolve 500 error in smart summary endpoint"
```

### Switch Between Branches

```bash
# Work on compliance engine
git checkout feature/compliance-engine
# ... make changes, test, commit ...

# Quick! Need to fix the 500 error
git checkout fix/smart-summary-500-error
# ... fix bug, test, commit ...

# Back to compliance engine
git checkout feature/compliance-engine
# ... continue building compliance rules ...
```

## Merging Branches Back to Main

### Option A: Merge via Pull Request (Recommended)

```bash
# Push your feature branch to remote
git push -u origin feature/compliance-engine

# Create PR on GitHub
gh pr create --title "Feature: Compliance Rules Engine" --body "Implements WIRC Act compliance checking"

# After PR approval, merge on GitHub
# Then update your local main
git checkout main
git pull origin main
```

### Option B: Direct Merge (Local)

```bash
# Make sure your feature is committed
git checkout feature/compliance-engine
git status  # should be clean

# Switch to main and merge
git checkout main
git merge feature/compliance-engine

# Push to remote
git push origin main

# Delete the feature branch (optional)
git branch -d feature/compliance-engine
```

## Handling Conflicts

If both branches modify the same files:

```bash
# Try to merge
git checkout main
git merge feature/compliance-engine

# If conflicts occur:
# CONFLICT (content): Merge conflict in server/routes.ts

# 1. Open the file and resolve conflicts (look for <<<<<<< markers)
# 2. Remove conflict markers, keep desired code
# 3. Stage the resolved file
git add server/routes.ts

# 4. Complete the merge
git commit -m "Merge feature/compliance-engine into main"
```

## Current Branch Setup

**Recommended branches for your current work:**

1. **`main`** - Stable code (keep this clean)
2. **`feature/compliance-engine`** - Build compliance rules, document ingestion, UI
3. **`fix/smart-summary-500`** - Debug and fix the smart summary error

### Create Both Now:

```bash
# Fix smart summary first (critical)
git checkout -b fix/smart-summary-500

# After fixing, create compliance branch
git checkout main
git checkout -b feature/compliance-engine
```

## Best Practices

1. **Commit often** - Small, focused commits are easier to manage
2. **Pull before push** - Always `git pull` before `git push` to avoid conflicts
3. **Branch naming convention:**
   - `feature/` - New features (feature/compliance-engine)
   - `fix/` - Bug fixes (fix/smart-summary-500)
   - `refactor/` - Code cleanup (refactor/storage-methods)
   - `docs/` - Documentation (docs/api-guide)

4. **Keep branches focused** - One feature/fix per branch
5. **Delete merged branches** - Clean up after merging to avoid clutter

## Stash Changes (Save work without committing)

If you need to switch branches but aren't ready to commit:

```bash
# Save your work temporarily
git stash save "WIP: compliance rule validation"

# Switch branches
git checkout fix/smart-summary-500

# Later, restore your work
git checkout feature/compliance-engine
git stash pop  # Restores and removes from stash
# OR
git stash apply  # Restores but keeps in stash
```

## View All Branches

```bash
# Local branches
git branch

# All branches (local + remote)
git branch -a

# With last commit info
git branch -v
```

## Useful Commands

```bash
# See what changed between branches
git diff main..feature/compliance-engine

# See commit history for a branch
git log feature/compliance-engine --oneline

# Check which branch you're on
git status
# OR
git branch --show-current
```

---

**Ready to start?**

```bash
# Create your compliance engine branch now!
git checkout -b feature/compliance-engine
```

Then work on:
1. Create compliance rules (certificate expiry, RTW deadlines)
2. Ingest WIRC Act sections
3. Build compliance UI
4. Test with real cases

While keeping the main branch stable for production! 🚀
