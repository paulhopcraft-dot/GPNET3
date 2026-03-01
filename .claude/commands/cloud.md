---
name: cloud
version: 1.0.0
description: Claude Code Web integration for phone/async work - kick off tasks from anywhere
---

# Cloud Task: $ARGUMENTS

## Overview

Run Claude Code tasks from your phone or browser via claude.ai/code. Work continues in the cloud while you're AFK - at the gym, commuting, or sleeping.

---

## When to Use Cloud vs Local

| Use Cloud | Use Local |
|-----------|-----------|
| Away from laptop | At your desk |
| Long-running tasks (1+ hours) | Quick iterations |
| Overnight feature builds | Need to test locally |
| Phone-initiated work | Multiple parallel instances |
| Background tasks | Interactive debugging |

---

## Quick Start (Phone)

1. Open **Claude AI app** on iPhone/Android
2. Tap **Code** in sidebar
3. Select your GitHub repo
4. Paste a cloud-optimized prompt (see templates below)
5. Enable notifications
6. Close app - work continues in cloud

---

## Prompt Templates

### Template: Feature Build

```
Build [FEATURE DESCRIPTION].

## Context
- Tech stack: [e.g., Next.js, TypeScript, Tailwind]
- Key files: [e.g., src/components/, src/api/]

## Requirements
1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

## Success Criteria
- [ ] Feature works as described
- [ ] No TypeScript errors
- [ ] Tests pass (run: npm test)
- [ ] No linting warnings (run: npm run lint)

## When Done
1. Commit with message: "feat: [short description]"
2. Create branch: feature/[feature-name]
3. Push to origin
4. Create PR to main with summary of changes
```

### Template: Bug Fix

```
Fix: [BUG DESCRIPTION]

## Reproduction
[How to trigger the bug]

## Expected Behavior
[What should happen]

## Investigate
1. Check [likely file/area]
2. Look for [pattern/error]

## Success Criteria
- [ ] Bug no longer reproducible
- [ ] No regression in related functionality
- [ ] Tests pass

## When Done
1. Commit with message: "fix: [short description]"
2. Push to branch: fix/[bug-name]
3. Create PR with:
   - What caused the bug
   - How it was fixed
   - How to verify the fix
```

### Template: Refactor

```
Refactor: [WHAT TO REFACTOR]

## Goal
[Why refactoring - performance, readability, maintainability]

## Scope
- Files: [list files]
- DO NOT touch: [protected files/areas]

## Constraints
- Maintain backward compatibility
- No behavior changes
- Keep existing tests passing

## Success Criteria
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Behavior unchanged (verify manually: [how])

## When Done
1. Commit with message: "refactor: [short description]"
2. Push to branch: refactor/[name]
3. Create PR with before/after comparison
```

### Template: Tests

```
Add tests for: [AREA/FEATURE]

## Coverage Goals
- Target: [X]% coverage for [files/modules]
- Focus on: [critical paths, edge cases, error handling]

## Test Types Needed
- [ ] Unit tests for [components/functions]
- [ ] Integration tests for [flows]
- [ ] E2E tests for [user journeys]

## Existing Test Setup
- Framework: [Jest/Vitest/Playwright]
- Run: [npm test / npm run test:e2e]
- Config: [test config location]

## Success Criteria
- [ ] Coverage target met
- [ ] All tests pass
- [ ] Tests are readable and maintainable

## When Done
1. Commit with message: "test: [short description]"
2. Push to branch: test/[area]
3. Create PR with coverage report
```

### Template: Overnight Build (Long-Running)

```
## Overnight Task: [FEATURE NAME]

This is a long-running task. Take your time and be thorough.

### Phase 1: Research & Plan
- Understand existing codebase patterns
- Identify all files that need changes
- Create implementation plan

### Phase 2: Implement
[Detailed requirements]

### Phase 3: Test & Verify
- Write tests for new functionality
- Run full test suite
- Manual verification steps: [list them]

### Phase 4: Cleanup
- Remove any debug code
- Ensure consistent formatting
- Add necessary comments (only where logic is non-obvious)

### Success Criteria
- [ ] All requirements implemented
- [ ] Tests pass: [command]
- [ ] Lint passes: [command]
- [ ] Build succeeds: [command]

### When Done
1. Commit with descriptive messages (multiple commits OK)
2. Push to branch: feature/[name]
3. Create detailed PR with:
   - Summary of all changes
   - Testing instructions
   - Screenshots if UI changes
```

---

## Git Workflow

Cloud Claude commits directly to GitHub. To get changes on your laptop:

```bash
# After cloud task completes
git fetch origin
git checkout feature/[branch-name]   # Switch to the branch Claude created

# Or if Claude created a PR
gh pr checkout [PR-number]           # Checkout PR directly
```

---

## Coordination: Phone → Laptop

### Handoff Format

When cloud task completes, you'll have:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cloud Task Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Branch: feature/user-auth
PR: #47 - Add user authentication
Commits: 5
Files changed: 12

On your laptop:
  git fetch origin
  git checkout feature/user-auth

Or:
  gh pr checkout 47
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Tips for Better Cloud Results

### 1. Be Explicit About Success
Cloud Claude can't ask clarifying questions mid-task. Define success upfront:

```
❌ "Make the login page look better"
✅ "Update login page: center the form, add company logo above,
    use primary color (#3B82F6) for submit button"
```

### 2. Specify Test Commands
```
❌ "Make sure tests pass"
✅ "Run: npm test -- --coverage
    Verify: coverage > 80% for src/auth/"
```

### 3. Include Context
```
✅ "Tech stack: Next.js 14 with App Router, TypeScript, Prisma ORM
    Database: PostgreSQL
    Auth: NextAuth.js with credentials provider"
```

### 4. Define Boundaries
```
✅ "DO NOT modify:
    - src/lib/legacy/ (deprecated, being removed)
    - prisma/schema.prisma (requires migration)
    - .env files"
```

### 5. Request PR with Summary
```
✅ "Create PR with:
    - What changed and why
    - How to test
    - Any follow-up work needed"
```

---

## Generate Cloud Prompt

**Current request**: $ARGUMENTS

**I will generate a cloud-optimized prompt that includes:**
1. Clear context about your project
2. Specific requirements
3. Explicit success criteria
4. Git instructions (branch, commit, PR)

**Copy the generated prompt and paste it into Claude AI app on your phone.**

---

## Integration with Toolkit

After cloud work is on your laptop:

- `/status` - See what changed
- `/review` - Review the cloud-generated code
- `/verify` - Verify the work meets criteria
- `/evolve` - Capture learnings for CLAUDE.md

---

## Example: Full Flow

**1. On Phone (Claude AI app):**
```
Build a contact form with validation.

Context: Next.js 14, TypeScript, Tailwind, React Hook Form

Requirements:
1. Fields: name, email, message (all required)
2. Email validation with proper format check
3. Success toast on submit
4. Error messages below each field

Success Criteria:
- [ ] Form renders at /contact
- [ ] Validation works (test with empty fields, bad email)
- [ ] Success toast appears on valid submit
- [ ] npm run build passes
- [ ] npm test passes

When Done:
1. Commit: "feat: add contact form with validation"
2. Branch: feature/contact-form
3. Push and create PR to main
```

**2. Cloud Claude works for ~30 mins**

**3. Notification: "PR #52 created"**

**4. On Laptop:**
```bash
gh pr checkout 52
npm run dev
# Test at localhost:3000/contact
# Review, approve, merge
```
