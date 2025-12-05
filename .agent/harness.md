# GPNet Agent Harness

This document provides behavioral constraints and operating procedures for AI agents working on the GPNet codebase.

---

## 1. Project Context (GPNet-Specific)

GPNet is a B2B case management and decision-support platform for employers, host sites, occupational health providers, and insurers managing worker injuries, long-term conditions, mental health issues, and return-to-work (RTW) processes. The platform centralises case tracking, certificate management, compliance monitoring, and AI-assisted decision support.

### Core Subsystems

- **Cases & Workers** - Core entity management for injured/affected workers and their case records
- **Certificate Engine** - Medical certificate ingestion, parsing, capacity tracking, and expiry monitoring
- **Timeline Engine** - Unified chronological view of all case events (certificates, notes, attachments, milestones)
- **Compliance Engine** - Monitors certificate validity, RTW status, evidence gaps, and generates compliance flags
- **Action Queue** - Task management system for pending actions (chase certificate, worker check-in, host follow-up)
- **Freshdesk Integration** - Bidirectional sync with Freshdesk support tickets and email communications
- **Smart Summary Engine** - AI-generated case summaries with situation, risks, and recommended next steps
- **Claims Avatar** - AI-driven interview system for collecting worker narratives and structured data
- **RTW Intelligence Engine** - Return-to-work plan generation, duty matching, and progression monitoring
- **Termination Process** - HR integration for incapacity-based employment termination workflows
- **Clinical Evidence Evaluation** - Evidence gap detection and clinical action recommendations
- **Behaviour & Sentiment Engine** - Worker engagement and sentiment tracking from communications
- **Predictive Analytics** - Risk scoring, duration prediction, and RTW probability assessment

### Tech Stack

- **Backend**: TypeScript, Node.js, Express, Drizzle ORM, PostgreSQL
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Testing**: Vitest, Playwright (E2E)
- **AI**: LLM integrations for summaries, avatar interviews, and predictions

---

## 2. Safety & Forbidden Zones (GPNet-Specific)

The following directories and files are SENSITIVE and should not be modified unless explicitly instructed:

### Database & Schema
- **`shared/schema.ts`** - Core Drizzle schema definitions and TypeScript types. Do NOT modify table structures or remove fields.
- **`migrations/`** - SQL migration files. Do NOT create, edit, or delete migrations without explicit instruction.
- **`drizzle.config.ts`** - ORM configuration. Do NOT modify.
- **`server/db.ts`** - Database connection setup. Do NOT modify.

### Core Infrastructure
- **`server/storage.ts`** - Main `DbStorage` class implementing `IStorage` interface. Treat as critical infrastructure.
- **`server/index.ts`** - Express server bootstrapping. Avoid modifications.
- **`server/routes.ts`** - Route registration. Be cautious; changes can break API contracts.

### Authentication & Security
- **`server/controllers/auth.ts`** - Authentication controller. Do NOT modify unless explicitly working on auth.
- **`server/middleware/auth.ts`** - Auth middleware. Do NOT modify.
- **`server/middleware/`** - All middleware files require explicit permission to change.

### Configuration & Environment
- **`.env`** / **`.env.*`** - Environment config files. NEVER commit secrets or modify these files.
- **`package.json`** / **`package-lock.json`** / **`pnpm-lock.yaml`** - Dependency files. Only modify when explicitly adding/updating dependencies.
- **`tsconfig.json`** / **`vite.config.ts`** / **`vitest.config.ts`** - Build/test config. Avoid changes.

### Test Infrastructure
- **`tests/`** - E2E and integration tests. Do NOT rewrite tests unless explicitly asked.
- **`server/storage.test.ts`** - Storage layer tests. Do NOT modify unless fixing related bugs.

### Backup & Legacy Code
- **`server_backup/`** - Backup files. Do NOT touch.
- **`gpm3-v1.*/`** - Legacy version directories. Do NOT modify.
- **`attached_assets/`** - Asset archives. Do NOT modify.

---

## 3. Universal Behaviour Rules

These rules apply to every task:

1. **Work on ONE feature per task.** Do not scope-creep into adjacent features.
2. **Do NOT refactor or "clean up" unrelated files.** Stay focused on the task at hand.
3. **Do NOT rewrite tests unless explicitly asked.** Fix only tests that break due to your changes.
4. **Keep diffs small, local, and safe.** Prefer minimal changes that achieve the goal.
5. **Always end in a clean, committable state.** No broken builds, no partial implementations.
6. **Assume another agent or human may review diffs.** Write clear, reviewable code.
7. **Preserve existing patterns and conventions.** Match the style of surrounding code.
8. **Do NOT introduce new dependencies without explicit approval.**

---

## 4. Initialization Procedure (Per Task)

Before making ANY code changes, every agent must:

1. **Run `pwd`** - Confirm working directory is `/home/user/GPNET3`
2. **List relevant parts of the repo** - Understand the current file structure
3. **Read `.agent/features.json`** - Understand the feature ledger and find your assigned feature
4. **Read `.agent/progress.log`** - Understand what has been done recently
5. **Read recent commits** - Run `git log -n 3 --oneline` to see recent work
6. **Identify ONE feature with `"pass": false`** - Select your target feature
7. **Restate the following before coding**:
   - Which feature you are working on (by key name)
   - Expected outcome when the feature is complete
   - Which files you intend to modify or create
   - Which sensitive areas you will avoid

This initialization ensures context alignment and prevents accidental damage.

---

## 5. Coding Rules (Per Task)

When implementing a feature:

1. **Only modify files necessary for the selected feature.** Do not touch unrelated code.
2. **Prefer local changes over global refactors.** Solve the problem at hand, not hypothetical future problems.
3. **Use existing patterns found in the codebase.** Check similar implementations before inventing new patterns.
4. **Do NOT introduce new tech stacks, frameworks, or major architectural patterns** without spec approval.
5. **Match existing code style** - indentation, naming conventions, import patterns.
6. **Add comments only where logic is non-obvious.** Do not add unnecessary documentation.
7. **Do NOT add features, abstractions, or configurability beyond what was specified.**
8. **Test your changes** - Run relevant tests before marking a feature complete.

---

## 6. Finishing Procedure (Per Task)

After completing a feature:

1. **Update `.agent/features.json`**:
   - Set `"pass": true` for the completed feature
   - Add any relevant notes in the `"notes"` field

2. **Append to `.agent/progress.log`**:
   - One-line summary: `[YYYY-MM-DD] feature_key: <summary of changes>`
   - Include: files changed, tests run, result

3. **Verify tests pass**:
   - Run `npm run test` or relevant test command
   - If tests fail, fix them or document why they fail

4. **Stage and commit**:
   - Stage only relevant files: `git add <files>`
   - Commit with descriptive message: `git commit -m "feat(feature_key): description"`

5. **Leave the repo in a clean state**:
   - No uncommitted changes
   - No broken builds
   - No partial implementations

---

## 7. Required Output

At the end of each task, the agent must report:

1. **Feature worked on**: Key name from `features.json`
2. **Files changed**: List of modified/created files
3. **Logic summary**: 2-3 sentence description of what was implemented
4. **Test status**: Which tests were run and their results
5. **Git commands used**: The exact commit command(s) executed
6. **Blockers or notes**: Any issues encountered or follow-up work needed

---

## 8. Quick Reference Commands

```bash
# Check current state
pwd
git status
git log -n 3 --oneline

# Read harness files
cat .agent/harness.md
cat .agent/features.json
cat .agent/progress.log

# Run tests
npm run test

# Commit changes
git add <files>
git commit -m "feat(feature_key): description"
```

---

This harness ensures consistent, safe, and traceable development on the GPNet platform.
