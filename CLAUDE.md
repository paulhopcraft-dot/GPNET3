# Engineering Mode v4.0

This project uses governance defined in .claude/skills/AI_ORCHESTRATOR_v1.1_LOCKED.md.
Toolkit settings are in `toolkit-config.yaml`. Run `/config` to view or modify.

## 🎓 Guided Mode (Interactive Teacher)

**For non-technical users:** Guided mode transforms the toolkit into an interactive development teacher.

**Status:** See `guided_mode.enabled` in `toolkit-config.yaml` (currently: **ON**)

**What it does:**
- Explains WHY we do each step
- Suggests which toolkit features to use when
- Asks for approval before risky actions
- Shows best practices as we work
- Teaches you to recognize patterns

**Full guide:** See `GUIDED-WORKFLOW.md` for complete walkthrough of development lifecycle.

**Quick Start:** Just say "I want to add [feature]" and I'll guide you through planning, building, testing, reviewing, committing, and deploying with explanations at every step.

## Core Rules (5 total)

### Rule 1: Project Context
Every response starts with:
```
[PROJECT: {folder-name}]
```
No exceptions.

### Rule 2: Progress Tracking
- Update `claude-progress.txt` after completing work
- Track features in `features.json` if it exists
- Before `/handoff`, summarize what was done

### Rule 3: Model Selection
**Default: See `toolkit-config.yaml`** (typically sonnet)

**MUST spawn Opus agent when:**
- Choosing between libraries/frameworks
- Database schema design
- API architecture decisions
- Authentication/authorization design
- Complex debugging (>30 min stuck)
- Ambiguous requirements needing interpretation
- Performance optimization trade-offs
- Any "should we use X or Y" moment

**How to spawn:** Use Task tool with `model: "opus"`

**Stay on Sonnet for:**
- Feature implementation (CRUD, services, controllers)
- Tests, refactoring, UI work
- API endpoints, routine coding

### Rule 4: Verify Before Commit
Before any git commit:
1. Run tests
2. Check for obvious issues
3. If 100+ lines changed, do a quick review

### Rule 5: Run /status After Every Task
After completing ANY task, run `/status` to:
- Show progress
- Recommend next command
- Display C/A/H menu

**No exceptions. This is how the user knows what to do next.**

---

## Auto-Triggers (5 total)

| Trigger | When | Action |
|---------|------|--------|
| **Test** | Before commit | Run test suite |
| **Review** | 100+ lines changed, security files touched | Quick code review |
| **Security** | .env or auth code modified | Check for exposed secrets |
| **Progress** | Task completed | Update claude-progress.txt |
| **Recover** | Build/test failures | Diagnose and fix |

---

## Command Reference

| Situation | Use |
|-----------|-----|
| Starting a session | `/status` |
| What should I work on? | `/continue` |
| Before committing | `/review` |
| Ending session | `/handoff` |
| 3+ similar tasks | `/autonomous` |
| New function/class | `/tdd` |
| Feature complete | `/verify` |
| New project | `/init-project` |
| Library choice | `/decide` |
| Risky change | `/anticipate` |
| Complex problem | `/think` |
| Security code | `/security-scan` |
| Multi-file change | `/branch` |
| Merge conflicts | `/resolve` |
| Important context | `/remember` |
| Forgot something | `/recall` |
| View/edit settings | `/config` |
| Daily AI news | `/morning-brief` |

Run `/help` for full list.

**After completing a task, run `/status` to show progress and next actions.**

---

## Guidelines (not rules)

**Keep it simple:**
- Don't over-engineer
- One feature at a time
- Minimal abstractions

**Be explicit:**
- If you can't verify something works, say so
- If blocked, explain why
- If unsure, ask

**Git workflow:**
- Conventional commits (feat/fix/docs/refactor)
- Commit after each feature passes
- Don't force push

---

## Orchestrator Mode

**Current Setting:** `orchestrator_scope: code_changes` (see `toolkit-config.yaml`)

**Apply 4-Phase Process When:**
- ✅ Writing/editing code
- ✅ Creating/modifying files
- ✅ Implementing features
- ✅ Refactoring
- ✅ Installing dependencies
- ✅ Architecture changes

**Skip Orchestrator For:**
- ❌ git status/log/diff (diagnostic)
- ❌ Reading files for context
- ❌ Running tests to check status
- ❌ Grep/search operations
- ❌ Simple informational commands

**4-Phase Process:**
1. CONDITIONING - Restate objective, identify constraints
2. AUTHORITY - Verification plan, confidence level
3. WORKFLOW - Break down steps
4. COMPOUNDING - Extract patterns, learnings

For significant changes, show estimates:
```
TASK: {description}
VERIFICATION: {how we'll know it worked}
STEPS: {breakdown}
EST: ~Xmin | COST: ~$0.XX
```

---

## Session Start

On session start:
1. Check git status
2. Check for failing tests
3. Propose next action

Keep it quick. Don't run 5 commands before the user can speak.

---

That's it. 80 lines instead of 440.
