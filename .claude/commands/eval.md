---
name: eval
version: 1.0.0
description: Evaluate framework implementation and provide actionable recommendations
---

# Eval: Framework Actionability Assessment

Evaluate the current state of the Claude Code toolkit framework and provide actionable recommendations for improvement.

---

## What This Does

The `/eval` command assesses your toolkit implementation across multiple dimensions:
1. **Structure** - Are all required files and directories present?
2. **Memory System** - Is the memory system being used effectively?
3. **Skills/Commands** - Are custom skills properly configured?
4. **Configuration** - Is toolkit-config.yaml optimized?
5. **Workflow Integration** - Are key workflows documented and followed?
6. **Actionability** - What concrete next steps will make the framework more useful?

---

## Evaluation Process

### Step 1: Structural Health Check

Check for presence of:
- `.claude/` directory structure
- `CLAUDE.md` (project instructions)
- `claude-progress.txt` (session continuity)
- `features.json` (feature tracking) - if applicable
- `toolkit-config.yaml` (configuration)
- `.claude/commands/` (custom commands)
- `.claude/skills/` (custom skills)
- `.claude/v3/memory/` (memory system)
- `.claude/rules/` (domain-specific rules)

### Step 2: Memory System Utilization

Check `.claude/v3/memory/`:
- `project.json` - Is project context populated?
- `decisions.json` - Are architectural decisions documented?
- `learnings.json` - Are patterns captured?
- `entities.json` - Are key code entities tracked?

**Red Flags:**
- Empty memory files (initialized but never used)
- No decisions documented despite significant architecture
- No learnings captured after multiple sessions

### Step 3: Workflow Assessment

Check for workflow documentation:
- Is there a clear development process?
- Are verification steps defined?
- Is there a commit/deployment workflow?
- Are there guidelines for specific domains (React, database, security)?

### Step 4: Configuration Optimization

Evaluate `toolkit-config.yaml`:
- Model selection appropriate for tasks?
- Orchestrator mode matches project complexity?
- Guided mode settings suitable for user skill level?
- Project registry up to date?

### Step 5: Actionability Analysis

Identify gaps between current state and ideal state:
- What's missing that would make daily work smoother?
- What manual steps could be automated?
- What knowledge should be captured but isn't?
- What workflows are ad-hoc that should be formalized?

---

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAMEWORK EVALUATION: [project-name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STRUCTURE HEALTH: [SCORE]/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Present:
  - CLAUDE.md (project instructions)
  - claude-progress.txt (session tracking)
  - toolkit-config.yaml (configuration)
  - .claude/commands/ (X commands)
  - .claude/skills/ (Y skills)

⚠️ Missing/Incomplete:
  - features.json (no feature tracking)
  - .claude/rules/ (no domain-specific rules)

❌ Issues:
  - [Critical structural issues]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 MEMORY SYSTEM: [SCORE]/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Active:
  - project.json: [Populated/Empty]
  - decisions.json: X decisions documented
  - learnings.json: Y learnings captured
  - entities.json: Z entities tracked

⚠️ Underutilized:
  - project.json is empty - no high-level context
  - Only 0 decisions documented despite complex architecture

💡 Opportunity:
  - Document key architectural decisions (auth, database, API design)
  - Capture patterns that work well for this codebase
  - Track critical entities (services, models, utilities)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ CONFIGURATION: [SCORE]/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Settings:
  Model: [sonnet/opus/haiku]
  Orchestrator: [mode] / [scope]
  Guided Mode: [enabled/disabled]

✅ Optimized:
  - Model selection appropriate for project
  - Orchestrator scope matches workflow

⚠️ Could Improve:
  - Guided mode enabled but user appears technical
  - Cost estimates disabled (helpful for budgeting)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 CUSTOM SKILLS: [SCORE]/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Discovered: X commands, Y skills

Domain-Specific:
  ✅ [skill-name] - [what it does]

General-Purpose:
  ✅ status, review, handoff (core workflow)
  ✅ remember, recall (memory integration)

⚠️ Missing Common Skills:
  - /test - Run project test suite
  - /deploy - Deployment workflow
  - /docs - Generate/update documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 WORKFLOW INTEGRATION: [SCORE]/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Documented:
  - Development workflow in CLAUDE.md
  - Git workflow defined
  - Verification checklist present

⚠️ Ad-Hoc:
  - Testing process not formalized
  - Deployment steps not documented
  - Code review process unclear

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 OVERALL SCORE: [TOTAL]/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rating: [EXCELLENT / GOOD / NEEDS WORK / MINIMAL]

EXCELLENT (90-100): Framework is highly optimized and actionable
GOOD (70-89): Solid foundation, some opportunities for improvement
NEEDS WORK (50-69): Basic structure present, significant gaps
MINIMAL (0-49): Framework not effectively utilized

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 ACTIONABLE RECOMMENDATIONS (Priority Order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HIGH PRIORITY (Do These First):
1. [Action] - Why: [benefit], How: [command/steps], Time: ~Xmin
2. [Action] - Why: [benefit], How: [command/steps], Time: ~Xmin
3. [Action] - Why: [benefit], How: [command/steps], Time: ~Xmin

MEDIUM PRIORITY (Nice to Have):
4. [Action] - Why: [benefit], How: [command/steps], Time: ~Xmin
5. [Action] - Why: [benefit], How: [command/steps], Time: ~Xmin

LOW PRIORITY (Future Enhancement):
6. [Action] - Why: [benefit], How: [command/steps], Time: ~Xmin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 QUICK WINS (Under 5 Minutes Each)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. `/remember` - Document one key architectural decision
2. Update project.json with high-level project understanding
3. Add missing rule file (e.g., .claude/rules/testing.md)
4. Enable cost/time estimates in toolkit-config.yaml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Scoring Rubric

### Structure Health (0-100)
- **100**: All core files present, well-organized, custom skills
- **80**: Core files present, some custom additions
- **60**: Basic structure only (CLAUDE.md, claude-progress.txt)
- **40**: Minimal structure (just CLAUDE.md or less)
- **20**: No structured framework

### Memory System (0-100)
- **100**: All memory files actively used, rich documentation
- **80**: Some memory files used, decent documentation
- **60**: Memory files exist but mostly empty
- **40**: Memory system initialized but never used
- **20**: No memory system

### Configuration (0-100)
- **100**: Optimized for project, thoughtfully configured
- **80**: Good defaults, mostly appropriate
- **60**: Basic configuration, works but not optimized
- **40**: Default settings, not project-specific
- **20**: No configuration file

### Custom Skills (0-100)
- **100**: Multiple domain-specific skills, well-integrated
- **80**: Several useful custom commands
- **60**: A few custom additions
- **40**: Only default commands
- **20**: No skill system

### Workflow Integration (0-100)
- **100**: All workflows documented and automated
- **80**: Key workflows documented
- **60**: Basic workflow docs
- **40**: Workflows mostly ad-hoc
- **20**: No documented workflows

---

## Example Recommendations

### If Memory System Empty:
```
HIGH PRIORITY:
1. Populate project.json
   Why: Faster session startup, better context retention
   How: Run `/remember --type project "Preventli is a WorkSafe compliance system..."`
   Time: ~2min

2. Document architectural decisions
   Why: Preserve reasoning, avoid repeating debates
   How: Run `/remember --type decision "Use Drizzle ORM for type safety"`
   Time: ~5min per decision
```

### If Missing Common Skills:
```
MEDIUM PRIORITY:
3. Create /test skill
   Why: Standardize test running across sessions
   How: Copy .claude/commands/review.md and modify for tests
   Time: ~10min
```

### If Workflow Not Formalized:
```
HIGH PRIORITY:
2. Document deployment workflow
   Why: Reduce errors, enable automation
   How: Create .claude/rules/deployment.md with steps
   Time: ~15min
```

---

## When to Run This

- **After initial setup** - Verify framework is properly configured
- **Monthly check-in** - Ensure framework stays relevant as project evolves
- **New team member** - Help them understand the framework state
- **Before major features** - Ensure framework can support upcoming work
- **After learning curve** - Update framework based on what actually helps

---

## Integration with Other Commands

- Follow up with `/remember` to document findings
- Use `/help` to discover commands mentioned in recommendations
- Run `/status` to see if recommendations align with current work
- Use `/config` to implement configuration suggestions

---

$ARGUMENTS
