---
name: task-handoff
version: 1.0.0
description: Complex Task Handoff - Design to Build Mode Transition
aliases: [design-complete, task-ready]
tags: [governance, complex, workflow]
---

# Task Handoff Command

**Signals completion of design phase and authorizes transition to build mode for COMPLEX tasks.**

This command reviews PRD completeness, creates execution artifacts, and enables file-based build mode with strict scope controls.

---

## Usage

**Standard Task Handoff:**
```
/task-handoff
```

**With Context Clear Recommendation:**
```
/task-handoff --clear
```

**Force Handoff (Skip Validation):**
```
/task-handoff --force
```

---

## How It Works

### Phase 1: PRD Validation
1. **Scan for PRD files** in current directory: `*-prd-*.md`
2. **Validate PRD completeness:**
   - Problem statement defined
   - User stories with acceptance criteria
   - Definition of Done specified
   - Rollback procedures documented
   - Edge cases mapped

### Phase 2: Conflict Resolution
1. **Check for concurrent sessions** working on similar tasks
2. **If conflicts found**, offer resolution:
   - **Collaborate** - Merge into shared execution plan
   - **Separate** - Create isolated execution scope
   - **Abort** - Cancel handoff process

### Phase 3: Execution Plan Generation
1. **Create execution artifact:** `task-execution-plan-{sessionId}.md`
2. **Include:**
   - Final requirements from PRD
   - Implementation sequence
   - Verification checkpoints
   - Definition of Done criteria
   - Session isolation boundaries

### Phase 4: Build Mode Authorization
1. **Mark PRD as locked** for scope changes
2. **Enable file-based execution** - Claude reads ONLY from execution plan
3. **Set governance mode** to STRICT (no scope expansion)
4. **Optional:** Recommend context clear for fresh start

---

## Integration with Enhanced Task System

**Called by enhanced task-enhanced skill after PRD approval:**

1. **COMPLEX task** creates PRD file
2. **User approves** with "approved"
3. **System requires** `/task-handoff` before execution
4. **Handoff validates** and creates execution plan
5. **Build mode** activated with strict governance

---

## File-Based Execution Mode

After handoff, **STRICT BUILD MODE** is enabled:

### Requirements
- Read ONLY from `task-execution-plan-{sessionId}.md`
- No scope expansion beyond written requirements
- No reinterpretation of original intent
- Stop when Definition of Done criteria are met

### Session Isolation
```
File Naming:
├── task-execution-plan-{timestamp}-{sessionId}.md (unique)
├── task-execution-plan-shared.md (collaborative)
└── active-tasks.json (coordination registry)
```

---

## Examples

### Successful Handoff
```
/task-handoff

🎯 TASK HANDOFF VALIDATION
PRD Found: auth-system-prd-20260122-1234-sess001.md
Completeness: ✓ (6/6 sections complete)
Session Conflicts: None detected
Execution Plan: Generated

✅ DESIGN → BUILD TRANSITION COMPLETE

Artifact: task-execution-plan-20260122-1400-sess001.md
Mode: STRICT BUILD ENABLED
Scope: LOCKED (no expansion allowed)

🚀 Ready for implementation. Enhanced task system will now
   execute ONLY from execution plan file.

Recommended: Type /clear for fresh build context
```

### Conflict Resolution
```
/task-handoff

⚠️ SIMILAR TASK DETECTED
Description: "add user authentication system"
PRD File: auth-system-prd-20260122-1200-sess002.md
Status: Active (started 2 hours ago)

Resolution required:
1. "collaborate" - Join existing authentication effort
2. "separate" - Create different scope (e.g., API auth vs UI auth)
3. "abort" - Cancel this handoff

Choice: separate

✅ SEPARATE SCOPE HANDOFF
Your Scope: API Authentication (backend focus)
Execution Plan: task-execution-plan-auth-api-20260122-1400-sess001.md
Other Scope: UI Authentication (continuing separately)

Both efforts can proceed independently.
```

---

## Error Handling

**Missing PRD:**
```
❌ HANDOFF BLOCKED: No PRD file found
Required: [task-name]-prd-[timestamp]-[sessionId].md
Action: Complete COMPLEX task PRD creation first
```

**Incomplete PRD:**
```
⚠️ PRD VALIDATION FAILED
Missing Sections:
  ✗ Definition of Done
  ✗ Rollback procedures

Action: Complete missing sections or use --force
```

---

**This command enforces the governance boundary between design and implementation phases.**