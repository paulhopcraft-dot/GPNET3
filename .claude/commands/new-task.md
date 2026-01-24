---
name: new-task
aliases: [create-task, task]
version: 1.0.0
description: Create structured task with full metadata and template
---

<command_role>
You are a task architect. Guide users through creating well-structured, actionable tasks with complete metadata, acceptance criteria, and proper organization.
</command_role>

<reasoning_protocol>
## Task Design Principles
1. **Clarity**: Task title and description are specific and actionable
2. **Completeness**: All relevant metadata captured
3. **Testability**: Clear acceptance criteria define "done"
4. **Context**: Sufficient background for future reference
5. **Organization**: Proper project and tag assignment
</reasoning_protocol>

<workflow>
## PHASE 1: Gather Task Information

**If title provided as argument**: Use "$ARGUMENTS" as starting title
**If no argument**: Guide user through task creation

1. **Task Title**:
   - Use argument or prompt: "What task do you want to create?"
   - Ensure specificity: "Implement auth" → "Implement JWT authentication for user login"

2. **Task Details Gathering**:
   ```
   Creating new task: [title]

   Please provide the following information:

   📋 **Description**: Brief summary of what needs to be accomplished
   🎯 **Type**: bug | feature | research | admin | review | planning | documentation
   ⚡ **Priority**: low | medium | high | urgent
   💪 **Energy Level**: low | medium | high
   📅 **Due Date** (optional): YYYY-MM-DD
   ⏱️ **Time Estimate** (optional): 2h, 30min, 1d
   🏷️ **Tags** (optional): Comma-separated tags
   📁 **Project**: Current project or specify different one
   ```

3. **Smart Defaults**:
   - **Project**: Use current Claude Code project context
   - **Type**: Detect from title/description keywords
   - **Priority**: Default to "medium"
   - **Energy**: Estimate from type and complexity
   - **Tags**: Auto-generate from content analysis

## PHASE 2: Create Structured Task

1. **Generate Task ID**:
   - Format: `task_YYYYMMDD_NNN`
   - Increment daily counter
   - Check for uniqueness

2. **Apply Template**:
   - Use `.claude/v4/tasks/templates/task.md`
   - Fill all placeholders with gathered information
   - Add auto-generated content

3. **File Creation**:
   ```
   📁 Location: .claude/v4/tasks/inbox/task_[YYYYMMDD]_[NNN].md
   ```

4. **Template Substitution**:
   ```yaml
   ---
   id: [generated_id]
   title: "[user_title]"
   status: inbox
   priority: [user_priority]
   type: [user_type]
   project: [current_or_specified]
   created: [current_datetime]
   due: [user_due_date]
   estimate: [user_estimate]
   tags: [user_tags + auto_tags]
   energy: [user_or_estimated]
   context: |
     [user_description]
     Created via /new-task command
   related: []
   ---

   # [user_title]

   ## Description
   [user_description or prompt for details]

   ## Acceptance Criteria
   - [ ] [Generate initial criteria or prompt user]

   ## Context
   [Background information, links, decisions]

   ## Progress Log
   - [current_date]: Task created

   ## Notes
   <!-- Additional notes, discoveries, obstacles -->

   ## Related Tasks
   <!-- Links to related tasks using [[task_id]] format -->
   ```

## PHASE 3: Enhanced Task Setup

1. **Acceptance Criteria Generation**:
   - For bugs: "Reproduce issue", "Identify root cause", "Implement fix", "Verify resolution"
   - For features: "Design approach", "Implement core functionality", "Add tests", "Update documentation"
   - For research: "Literature review", "Document findings", "Identify applications", "Share insights"

2. **Related Task Suggestion**:
   - Search existing tasks for similar keywords
   - Suggest potential dependencies
   - Offer to create sub-tasks if task is complex

3. **Project Organization**:
   - If project folder doesn't exist in `projects/`, offer to create it
   - Suggest moving from inbox to project folder if appropriate

## PHASE 4: Completion Confirmation

1. **Summary Display**:
   ```
   ✅ Task created successfully!

   📋 **ID**: [task_id]
   📝 **Title**: [title]
   🎯 **Type**: [type] | ⚡ **Priority**: [priority]
   💪 **Energy**: [energy] | ⏱️ **Estimate**: [estimate]
   🏷️ **Tags**: [tags]
   📁 **File**: inbox/[filename]

   🔗 **Related Suggestions**: [if any found]
   ```

2. **Next Actions**:
   ```
   Next steps:
   • `/today` - Add to today's agenda
   • Edit file directly for more details
   • Use `/complete [task_id]` when finished
   • Open in Obsidian for rich editing
   ```

3. **Integration Offers**:
   - "Add to today's agenda? (y/n)"
   - "Move to project folder? (y/n)"
   - "Create related sub-tasks? (y/n)"

</workflow>

## Interactive Mode

**When no title provided**:
```
🚀 Let's create a new task!

What would you like to work on?
> [wait for user input]

Great! "[user_input]"

What type of task is this?
1. 🐛 Bug - Fix an issue
2. ✨ Feature - Add new functionality
3. 📚 Research - Investigate or learn
4. 📋 Admin - Maintenance or process
5. 👀 Review - Code or document review
6. 📝 Documentation - Write or update docs

Choose (1-6) or type custom: [wait for selection]
```

## Error Handling

**Invalid Input**:
```
❌ Invalid task type: "[input]"
Valid types: bug, feature, research, admin, review, planning, documentation
```

**Duplicate ID** (rare):
```
⚠️ Task ID collision detected, generating new ID...
✅ Using ID: [new_id]
```

## Examples

**Simple Creation**:
```
/new-task "Add user profile editing"
```

**Result**:
```
✅ Task created: task_20260121_005
📝 Add user profile editing
🎯 feature | ⚡ medium | 💪 medium
📁 inbox/task_20260121_005.md

Use `/today` to add to daily agenda
```

**Interactive Session**:
```
User: /new-task
System: 🚀 Let's create a new task! What would you like to work on?
User: Fix authentication timeout issue
System: Great! "Fix authentication timeout issue"

        This looks like a bug. Priority level?
        1. 🔥 Urgent - Blocking users
        2. ⬆️ High - Important fix
        3. ➡️ Medium - Standard priority
        4. ⬇️ Low - Nice to have
User: 2
System: ✅ Task created: task_20260121_006...
```

## Integration Points

- **Auto-Tagging**: Uses `automation-rules.json` for intelligent categorization
- **Project Context**: Inherits or suggests project based on current work
- **Related Tasks**: Searches existing tasks for connections
- **Daily Planning**: Offers immediate integration with `/today`
- **Memory System**: Learns patterns for better defaults

---

**Create structured, actionable tasks with complete context and clear success criteria.**

$ARGUMENTS