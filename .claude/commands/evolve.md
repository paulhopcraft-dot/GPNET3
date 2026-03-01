---
name: evolve
version: 1.0.0
description: Update CLAUDE.md from session learnings - capture corrections and preferences
---

# Evolve CLAUDE.md: $ARGUMENTS

## Overview

Analyze the current session for corrections, preferences, and patterns, then suggest updates to CLAUDE.md. Treats CLAUDE.md as a "living breathing document" that improves over time.

---

## Why Evolve?

**The Problem:**
```
Session 1: "Use pnpm, not npm" → Claude corrected
Session 2: "Use pnpm, not npm" → Same mistake
Session 3: "Use pnpm, not npm" → Still happening
```

**The Solution:**
```
/evolve → Adds to CLAUDE.md: "Always use pnpm, never npm"
Session 4+: Claude gets it right automatically
```

---

## What Gets Captured

### 1. Corrections You Made
- Package manager preferences
- Test commands
- Build commands
- File naming conventions
- Code style preferences

### 2. Project-Specific Knowledge
- Directory structure quirks
- Protected files/folders
- Environment setup
- Database conventions

### 3. Patterns That Worked
- Successful approaches
- Preferred libraries
- Architecture decisions
- Error handling patterns

### 4. Things to Avoid
- Files that shouldn't be modified
- Deprecated patterns
- Known gotchas
- Common mistakes

---

## How It Works

### Step 1: Session Analysis

I'll scan the current conversation for:

**Explicit Corrections:**
```
User: "No, use pnpm not npm"
User: "The tests are in __tests__, not tests/"
User: "Don't modify files in /generated"
```

**Implicit Preferences:**
```
User: "Run pnpm test:unit" (implies test command)
User: "Check src/server/api" (implies directory structure)
```

**Repeated Patterns:**
```
Multiple instances of similar corrections
Consistent style choices
Architectural decisions
```

### Step 2: Generate Suggestions

For each finding, I'll propose a CLAUDE.md addition:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Suggested CLAUDE.md Updates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Package Manager
   Source: You corrected "npm install" → "pnpm install" (2x)
   Add: "Always use pnpm, never npm or yarn"

2. Test Command
   Source: You specified the test command
   Add: "Run tests with: pnpm test:unit"

3. Protected Directory
   Source: You warned about /generated
   Add: "Never modify files in /generated/ - auto-generated"

4. API Location
   Source: Repeated references to src/server
   Add: "API routes are in src/server/api/"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Review & Apply

You choose which suggestions to apply:

```
Apply updates? [A]ll / [S]elect / [N]one: S

1. Package Manager     [Y/n]: y
2. Test Command        [Y/n]: y
3. Protected Directory [Y/n]: y
4. API Location        [Y/n]: n

Applying 3 updates to CLAUDE.md...
✓ CLAUDE.md updated
```

---

## CLAUDE.md Structure

Evolved content goes into appropriate sections:

```markdown
# Project: [Name]

## Tech Stack
- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict mode)
- Package Manager: pnpm ← EVOLVED

## Commands
- Dev: pnpm dev
- Test: pnpm test:unit ← EVOLVED
- Build: pnpm build
- Lint: pnpm lint

## Directory Structure
- src/app/ - Pages and layouts
- src/components/ - React components
- src/server/api/ - API routes ← EVOLVED
- src/lib/ - Utilities

## Important Rules
- Always use pnpm, never npm ← EVOLVED
- Never modify /generated/ ← EVOLVED
- Use absolute imports (@/...)

## Patterns
[Architectural decisions, preferred approaches]

## Gotchas
[Known issues, things to avoid]
```

---

## Manual Additions

You can also manually specify things to remember:

```
/evolve "Always run prettier before committing"
/evolve "The auth middleware is in src/middleware.ts"
/evolve "Use Zod for all API validation"
```

---

## Categories of Learnings

### Commands & Scripts
```markdown
## Commands
- Test: pnpm test:unit (not pnpm test)
- E2E: pnpm test:e2e --headed
- DB: pnpm db:push (Prisma)
- Seed: pnpm db:seed
```

### File Conventions
```markdown
## Conventions
- Components: PascalCase.tsx
- Utilities: camelCase.ts
- Tests: *.test.ts (colocated)
- Types: types.ts in each module
```

### Protected Areas
```markdown
## Do Not Modify
- /generated/ - Auto-generated types
- /prisma/migrations/ - Migration history
- /.env* - Environment files
- /public/assets/ - Static assets from design
```

### Architecture Decisions
```markdown
## Architecture
- Server components by default, 'use client' only when needed
- API routes use tRPC, not REST
- State management: Zustand for client, React Query for server
- Forms: React Hook Form + Zod
```

### Style Preferences
```markdown
## Code Style
- Prefer named exports over default exports
- Use early returns to reduce nesting
- Destructure props in function signature
- No barrel files (index.ts re-exports)
```

---

## Integration with Other Commands

- `/remember` - Store general memories (cross-project)
- `/evolve` - Update project-specific CLAUDE.md
- `/handoff` - Includes evolved learnings in handoff
- `/reload` - Reloads evolved CLAUDE.md after /clear

---

## Example Session

**During session:**
```
User: Build a login form
Claude: npm install react-hook-form
User: Use pnpm, not npm
Claude: pnpm add react-hook-form

User: Put the component in src/features/auth
Claude: Created src/components/LoginForm.tsx
User: No, I said src/features/auth
Claude: Moved to src/features/auth/LoginForm.tsx

User: Run the tests
Claude: npm test
User: It's pnpm test:unit
Claude: pnpm test:unit
```

**End of session:**
```
/evolve

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session Analysis Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 3 learnings:

1. PACKAGE MANAGER
   Evidence: Corrected npm → pnpm
   Suggest: "Always use pnpm, never npm"

2. DIRECTORY STRUCTURE
   Evidence: Corrected src/components → src/features/auth
   Suggest: "Feature code goes in src/features/[feature]/"

3. TEST COMMAND
   Evidence: Corrected npm test → pnpm test:unit
   Suggest: "Run tests: pnpm test:unit"

Apply all to CLAUDE.md? [Y/n]: y

✓ Updated CLAUDE.md with 3 learnings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Execute Evolution

**Analyzing current session for learnings...**

I will:
1. Scan conversation for corrections and preferences
2. Identify patterns and repeated guidance
3. Check existing CLAUDE.md to avoid duplicates
4. Present suggestions for your approval
5. Apply approved updates to CLAUDE.md

**Ready to evolve your project's CLAUDE.md.**
