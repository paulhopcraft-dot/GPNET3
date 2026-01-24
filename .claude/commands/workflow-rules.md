---
description: Clear rule-based workflow suggestions - when to use what tool
---

# Workflow Rules Engine

Simple, explicit rules for when to use which commands. No guesswork - clear triggers and actions.

## Core Rules

### 🔄 **After Code Changes**
```
IF: Files modified AND not committed yet
→ SUGGEST: /review (code quality) → /smart-commit (clean commits)

IF: Major feature implemented (>10 files changed)
→ REQUIRE: /review → /verify → /security-scan
Reason: Big changes need thorough validation

IF: Tests exist AND code changed
→ AUTO: /tdd (run relevant tests)
Reason: Catch regressions immediately
```

### 🎯 **After Task Completion**
```
IF: Feature marked complete in features.json
→ WORKFLOW: /verify → /review → /branch merge
Reason: Quality gate before integration

IF: Bug fix completed
→ SUGGEST: /tdd (regression test) → /verify
Reason: Ensure fix works and doesn't break anything

IF: Large refactoring done
→ REQUIRE: /security-scan → /verify → /review
Reason: Refactoring can introduce subtle issues
```

### 🚀 **Project Phase Rules**
```
IF: New project OR empty features.json
→ START: /prd-generator → /init-project → /index
Reason: Proper foundation prevents issues later

IF: Multiple pending features AND overnight available
→ SUGGEST: /prd-harden → /ralph-loop
Reason: Autonomous development for large backlogs

IF: Deadline approaching AND multiple tasks pending
→ SUGGEST: /autonomous → /smart-batch
Reason: Maximize efficiency under time pressure
```

### ⚡ **Performance Rules**
```
IF: Context usage > 70%
→ AUTO: /context-monitor → warn user
→ IF: Context usage > 85% → /fresh (reset context)
Reason: Prevent performance degradation

IF: Repetitive commands detected (>3 similar tasks)
→ SUGGEST: /smart-batch OR /autonomous
Reason: Automate repetitive work

IF: Simple tasks mixed with complex
→ AUTO: /fast-path (route simple to Haiku)
Reason: Optimize for speed where possible
```

### 🛠️ **Problem Resolution Rules**
```
IF: Command failed OR error detected
→ IMMEDIATE: /recover (diagnose) → context-specific fix
Reason: Fast problem resolution

IF: Merge conflicts detected
→ AUTO: /resolve (AI-assisted resolution)
Reason: Faster than manual conflict resolution

IF: Tests failing after changes
→ AUTO: /tdd → /review (if still failing)
Reason: Systematic debugging approach
```

### 📈 **Quality Assurance Rules**
```
IF: Before committing to main
→ MANDATORY: /verify → /review → /security-scan
Reason: Quality gate for main branch

IF: Pre-production deployment
→ MANDATORY: /verify → /security-scan → /handoff
Reason: Production readiness checklist

IF: Code review requested
→ SUGGEST: /perspectives (multi-viewpoint analysis)
Reason: Thorough review from different angles
```

## Rule Implementation

### **Automatic Rule Triggers**
```python
# After every command completion
@post_command_hook
def check_workflow_rules(command_result, current_state):
    applicable_rules = evaluate_rules(current_state)

    for rule in applicable_rules:
        if rule.priority == "MANDATORY":
            prompt_required_action(rule.action)
        elif rule.priority == "AUTO":
            execute_automatic_action(rule.action)
        elif rule.priority == "SUGGEST":
            display_suggestion(rule.action, rule.reason)
```

### **Rule Categories by Priority**

#### **MANDATORY** (Must do - blocks workflow)
- Quality gates before main branch
- Security scans before production
- Verification before major merges

#### **AUTO** (Automatic execution)
- Test runs after code changes
- Context monitoring at thresholds
- Simple task routing to Haiku

#### **SUGGEST** (Recommended but optional)
- Code review after large changes
- Automation for repetitive tasks
- Optimization opportunities

## Specific Rule Examples

### **File Change Rules**
```
RULE: "Review Large Changes"
TRIGGER: >10 files modified in single session
ACTION: /review → /verify → /smart-commit
PRIORITY: MANDATORY
REASON: Large changes have high bug risk

RULE: "Test After Logic Changes"
TRIGGER: .py/.js/.ts files modified AND tests exist
ACTION: /tdd (run relevant tests)
PRIORITY: AUTO
REASON: Catch regressions immediately
```

### **Branch Management Rules**
```
RULE: "Feature Branch Quality Gate"
TRIGGER: Ready to merge feature branch
ACTION: /verify → /review → /branch merge
PRIORITY: MANDATORY
REASON: Ensure quality before integration

RULE: "Isolated Development"
TRIGGER: High-risk changes needed
ACTION: /worktree create → develop safely
PRIORITY: SUGGEST
REASON: Protect main branch during risky work
```

### **Performance Optimization Rules**
```
RULE: "Context Health Check"
TRIGGER: Context usage > 70%
ACTION: /context-monitor → warn if needed
PRIORITY: AUTO
REASON: Prevent performance issues

RULE: "Batch Optimization"
TRIGGER: >5 similar file operations in session
ACTION: /smart-batch (optimize workflow)
PRIORITY: SUGGEST
REASON: Save time on repetitive operations
```

### **Automation Opportunity Rules**
```
RULE: "Overnight Development"
TRIGGER: >5 pending features AND PRD validated
ACTION: /ralph-loop (autonomous development)
PRIORITY: SUGGEST
REASON: Maximize development time efficiency

RULE: "Repetitive Task Detection"
TRIGGER: Same command pattern >3 times
ACTION: /autonomous OR /smart-batch
PRIORITY: SUGGEST
REASON: Automate repetitive workflows
```

## Rule Configuration

### **User Customization**
```bash
/workflow-rules config --strict      # Enforce all MANDATORY rules
/workflow-rules config --permissive  # Only suggest, don't enforce
/workflow-rules config --auto        # Enable automatic actions
/workflow-rules disable review       # Disable specific rule category
```

### **Project-Specific Rules**
```bash
# In .claude/project-rules.json
{
  "rules": {
    "production_ready": ["verify", "security-scan", "review"],
    "feature_complete": ["verify", "review", "smart-commit"],
    "emergency_fix": ["tdd", "verify", "immediate-merge"]
  }
}
```

## Benefits of Rule-Based System

### **Predictable**
- You always know what happens when
- No mysterious AI decisions
- Clear cause and effect

### **Learnable**
- Rules are explicit and documented
- You can understand and modify them
- Builds good development habits

### **Reliable**
- Same situation = same suggestion
- No AI randomness or hallucination
- Consistent workflow enforcement

### **Customizable**
- Add your own rules
- Disable rules you don't like
- Project-specific configurations

**This gives you the optimal tool selection you want, but with clear, understandable rules instead of black-box AI magic.**

Which specific rules would you like me to implement first?