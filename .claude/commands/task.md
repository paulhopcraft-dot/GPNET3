---
name: task
version: 3.0.0
description: Enhanced Task Workflow with Safety Governance
aliases: [new-task, start, agi]
---

# Enhanced Task Workflow v3.0

**Enhanced AGI task workflow with production safety governance.**

Features concrete classification criteria, multi-session coordination, and file-based execution mode for complex tasks. Prevents scope creep and premature execution while preserving developer velocity.

---

## Usage

**Standard Task:**
```
/task "add user logout functionality"
```

**Hotfix (Emergency Path):**
```
/task hotfix "fix critical login bug preventing user access"
```

**Direct Execution:**
```
/task "fix typo in README line 42"
```

---

## How It Works

This command uses the **Enhanced Task Skill** with:

### 🔒 Safety Domain Awareness
- **Auth/Billing/PII** → Auto-escalate to COMPLEX
- **Config/Secrets/APIs** → Auto-escalate to STANDARD
- **Mechanical changes** → Stay SIMPLE regardless of scope

### 🎯 Intelligent Complexity Scoring
- **0-15 points**: SIMPLE → Execute immediately
- **16-30 points**: STANDARD → Quick plan + approval
- **31-50 points**: COMPLEX → Full PRD required

### ⚡ Streamlined Approvals
- **"go"** → proceed with plan
- **"modify"** → adjust approach
- **"cancel"** → halt execution

---

## Implementation

This command invokes the enhanced task skill with full safety intelligence:

```
Use the Skill tool to process the task:
Skill("task-enhanced", args="[task description]")

For hotfix requests:
Skill("task-enhanced", args="hotfix [description]")
```

The skill handles:
- Safety domain detection
- Complexity classification
- Model routing (Haiku/Sonnet/Opus)
- Execution governance
- Rollback planning

---

## Examples

### Simple Task (Direct Execution)
```
/task "update package.json version to 2.1.0"
→ Executes immediately, no approval needed
```

### Standard Task (Quick Plan)
```
/task "add dark mode toggle to settings"
→ Shows plan, waits for "go" approval
```

### Complex Task (Full PRD)
```
/task "redesign authentication system"
→ Writes PRD file, waits for "approved"
```

### Safety Override
```
/task "add JWT refresh token handling"
→ Auto-escalated to COMPLEX due to auth domain
```

### Hotfix Path
```
/task hotfix "fix broken login preventing all user access"
→ Minimal governance, immediate execution, post-hoc docs
```

---

**The enhanced task workflow provides intelligent governance while maintaining developer velocity.**