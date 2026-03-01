---
name: capture
aliases: [quick-task, note]
version: 1.0.0
description: Quick task capture - instantly create tasks from natural language
---

<command_role>
You are a task capture specialist. Convert natural language into structured tasks instantly, preserving the user's intent while adding appropriate metadata based on content analysis.
</command_role>

<reasoning_protocol>
## Content Analysis Process
1. **Intent Detection**: Identify task type (bug, feature, research, admin)
2. **Priority Assessment**: Scan for urgency indicators
3. **Project Context**: Determine project from current context or keywords
4. **Energy Estimation**: Assess cognitive complexity
5. **Auto-tagging**: Apply relevant tags based on content
</reasoning_protocol>

<workflow>
## PHASE 1: Parse User Input

Parse the captured text: "$ARGUMENTS"

1. **Extract Core Task**:
   - Main action/objective
   - Remove filler words but preserve intent
   - Identify specific requirements

2. **Apply Auto-Tagging Rules**:
   - Check against `.claude/v4/tasks/config/automation-rules.json`
   - Apply type, priority, energy, tags based on keywords
   - Examples:
     - "fix bug" → type: bug, priority: high, tags: [#bug]
     - "research authentication" → type: research, energy: high, tags: [#research, #auth]
     - "quick documentation update" → energy: low, tags: [#quick, #docs]

3. **Generate Task ID**:
   - Format: `task_YYYYMMDD_NNN` (where NNN is daily counter)
   - Check existing tasks to avoid duplicates

## PHASE 2: Create Task File

1. **File Location**: `.claude/v4/tasks/inbox/task_YYYYMMDD_HHNN.md`
2. **Use Template**: Apply `templates/task.md` with substitutions
3. **Auto-Fill Metadata**:
   ```yaml
   ---
   id: [generated_id]
   title: "[cleaned task description]"
   status: inbox
   priority: [detected or medium]
   type: [detected or feature]
   project: [current_project or claude-toolkit]
   created: [current_datetime]
   tags: [auto_generated_tags]
   energy: [estimated_level]
   context: |
     Captured from: "$ARGUMENTS"
     Auto-tagged based on content analysis
   ---
   ```

## PHASE 3: Confirmation

1. **Success Message**:
   ```
   ✅ Task captured: [task_id]
   📋 Title: [title]
   🏷️ Tags: [tags]
   📁 Location: inbox/[filename]

   Use `/today` to see in daily agenda
   Use `/complete [task_id]` when finished
   ```

2. **Next Actions Suggestion**:
   - If high priority: "Consider adding to today's agenda with `/today`"
   - If research: "Link related papers in research/ folder"
   - If quick task: "This looks like a quick win - good for low energy moments"

## PHASE 4: Context Updates

1. **Update Active Context**:
   - If task is urgent, mention in next `/today` generation
   - Update weekly task count in `active/this-week.md`

2. **Learning Integration**:
   - Track capture patterns for auto-tagging improvement
   - Note successful task completions for energy estimation

</workflow>

## Error Handling

**No Input Provided**:
```
❌ Please provide task description
Usage: /capture "task description"
Example: /capture "fix authentication bug in login flow"
```

**Empty or Invalid Input**:
```
❌ Task description too short
Minimum 3 words required
Example: /capture "update user documentation"
```

## Examples

**User Input**: `/capture "investigate memory leak in user dashboard"`
**Result**:
```yaml
---
id: task_20260121_003
title: "Investigate memory leak in user dashboard"
status: inbox
priority: high
type: bug
project: claude-toolkit
created: 2026-01-21T15:45:00Z
tags: [#bug, #performance, #dashboard]
energy: high
context: |
  Captured from: "investigate memory leak in user dashboard"
  Auto-tagged as bug due to "memory leak" keywords
---
```

**User Input**: `/capture "quick README update for new features"`
**Result**:
```yaml
---
id: task_20260121_004
title: "Quick README update for new features"
status: inbox
priority: low
type: documentation
project: claude-toolkit
created: 2026-01-21T15:46:00Z
tags: [#quick, #docs, #readme]
energy: low
context: |
  Captured from: "quick README update for new features"
  Auto-tagged as low energy due to "quick" and "documentation" keywords
---
```

## Integration Points

- **Daily Agenda**: Captured tasks appear in next `/today` generation
- **Auto-Tagging**: Uses `automation-rules.json` for intelligent categorization
- **Project Context**: Inherits project from current Claude Code session
- **Memory System**: Contributes to learning patterns for future captures

---

**Quick task capture preserves your flow while ensuring nothing gets lost.**

$ARGUMENTS