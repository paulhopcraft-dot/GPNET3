---
name: today
aliases: [agenda, daily, plan]
version: 1.0.0
description: Generate intelligent daily agenda based on tasks, energy, and priorities
---

<command_role>
You are an intelligent daily planner. Analyze available tasks, consider energy patterns, time constraints, and priorities to create an optimal daily agenda that maximizes productivity while respecting human cognitive limits.
</command_role>

<reasoning_protocol>
## Agenda Generation Logic
1. **Task Collection**: Gather from inbox/, active/, projects/ based on status and priority
2. **Time Assessment**: Estimate available time based on day of week and context
3. **Energy Mapping**: Match high/medium/low energy tasks to typical daily patterns
4. **Priority Balancing**: Mix urgent items with important long-term work
5. **Cognitive Load**: Ensure varied task types to prevent fatigue
</reasoning_protocol>

<workflow>
## PHASE 1: Data Collection

1. **Scan Task Sources**:
   ```
   📂 Inbox: .claude/v4/tasks/inbox/*.md (status: inbox)
   📂 Active: .claude/v4/tasks/active/*.md (status: active)
   📂 Projects: .claude/v4/tasks/projects/**/*.md (status: active, waiting)
   📂 Urgent: .claude/v4/tasks/active/urgent/*.md (priority: urgent)
   ```

2. **Parse Task Metadata**:
   - Extract: id, title, priority, type, energy, estimate, due, tags, project
   - Filter: Include only inbox, active, waiting status
   - Sort: By due date, priority, energy requirements

3. **Context Assessment**:
   ```
   📅 Day: [current_day_of_week]
   ⏰ Time: [current_time]
   💪 Expected Energy Pattern:
     Morning (8-11): High energy
     Midday (11-14): Medium energy
     Afternoon (14-17): Medium energy
     Evening (17-20): Low energy
   ```

## PHASE 2: Intelligent Scheduling

1. **Priority Classification**:
   ```
   🔥 Must Do Today:
   - priority: urgent
   - due: today or overdue
   - type: bug (if critical)

   ⬆️ Should Do Today:
   - priority: high
   - due: within 3 days
   - blocking other tasks

   ➡️ Could Do Today:
   - priority: medium
   - fits energy/time profile
   - contributes to weekly goals

   💡 Quick Wins:
   - energy: low
   - estimate: <30min
   - type: admin, documentation
   ```

2. **Energy-Time Matching**:
   ```
   🌅 Morning High Energy (2-4h):
   - Complex features
   - Architecture decisions
   - Research and learning
   - Creative work

   ☀️ Midday Medium Energy (2-3h):
   - Implementation tasks
   - Code reviews
   - Testing and debugging
   - Meetings and communication

   🌆 Afternoon/Evening Low Energy (1-2h):
   - Documentation
   - Admin tasks
   - Email and messages
   - Quick fixes
   ```

3. **Cognitive Load Balancing**:
   - Mix task types (don't batch all bugs together)
   - Alternate high/low energy tasks
   - Include buffer time between complex tasks
   - Add "palate cleansers" (quick wins)

## PHASE 3: Agenda Generation

1. **Create Daily File**:
   ```
   📁 Location: .claude/v4/tasks/active/today.md
   📅 Date: [current_date]
   🔄 Action: Overwrite existing or create new
   ```

2. **Apply Template**:
   Use `templates/daily-agenda.md` with intelligent substitutions:

   ```yaml
   # Daily Agenda - [current_date]
   *Generated at [current_timestamp]*

   ## Priority Focus
   **Primary Goal**: [highest_priority_task or weekly_goal]
   **Energy Level**: [estimated_energy_today]
   **Available Time**: [estimated_work_hours]

   ## High Priority Tasks
   [Sort by: urgent → high priority → due soon]
   - [ ] **[title]** ([estimate], [energy]) - [project]
     [brief_context_line]

   ## Medium Priority Tasks
   [Balance with energy and time constraints]
   - [ ] **[title]** ([estimate], [energy]) - [project]

   ## Quick Wins (Low Energy)
   [Perfect for afternoon or between meetings]
   - [ ] **[title]** ([estimate]) - [project]

   ## Waiting/Blocked
   [Show but don't include in day planning]
   - ⏸️ **[title]** - Blocked by: [reason]

   ## Research & Learning
   [Dedicate time for growth]
   - [ ] **[title]** ([estimate]) - [project]
   ```

3. **Smart Recommendations**:
   ```
   ## Today's Strategy
   🎯 **Focus Block** (9-11 AM): [primary_high_energy_task]
   🔄 **Implementation** (11 AM-2 PM): [medium_energy_batch]
   ⚡ **Quick Wins** (2-4 PM): [low_energy_tasks]
   📚 **Learning** (4-5 PM): [research_or_review]

   ## Energy Tips
   - Start with [task_type] while fresh
   - Switch to [different_type] if stuck
   - Use [quick_task] as transition
   ```

## PHASE 4: Intelligence & Learning

1. **Pattern Recognition**:
   - Track which time slots work best for different task types
   - Learn user's actual energy patterns from completion data
   - Adjust estimates based on historical performance

2. **Dependency Analysis**:
   ```
   🔗 Task Dependencies:
   - [task_A] → [task_B] (complete A before starting B)
   - [task_C] waiting for [external_factor]

   ⚠️ Potential Conflicts:
   - Both [task_X] and [task_Y] require high energy
   - [meeting_time] conflicts with focus block
   ```

3. **Weekly Goal Alignment**:
   - Reference `active/this-week.md` for weekly priorities
   - Ensure daily tasks contribute to weekly milestones
   - Balance urgent work with long-term goals

## PHASE 5: Output & Integration

1. **Display Summary**:
   ```
   📋 Today's Agenda Generated!

   🎯 **Primary Focus**: [main_goal]
   📊 **Task Summary**:
      • High Priority: [count] tasks ([total_time])
      • Medium Priority: [count] tasks ([total_time])
      • Quick Wins: [count] tasks ([total_time])
      • Research: [count] tasks ([total_time])

   ⏰ **Time Allocation**:
      • Total Scheduled: [scheduled_time]
      • Buffer Time: [buffer_time]
      • Available: [available_time]

   📁 **File**: active/today.md
   ```

2. **Actionable Suggestions**:
   ```
   💡 Suggestions:
   • Start with [first_task] (highest impact)
   • If stuck, switch to [backup_task]
   • [specific_energy_tip]
   • Review progress at [suggested_time]

   🔗 Next Steps:
   • `/complete [task_id]` when finished
   • `/task-search [topic]` to find related work
   • `/capture "note"` for new discoveries
   ```

3. **Integration Hooks**:
   - Update weekly progress in `this-week.md`
   - Create calendar entries if calendar integration enabled
   - Notify about potential schedule conflicts

</workflow>

## Contextual Variations

**Monday Morning**:
```
🌅 Fresh Week Energy!
Focus: Strategic work and planning
Recommendation: Tackle your most challenging task first
```

**Friday Afternoon**:
```
🏁 Week Wrap-Up Mode
Focus: Completion and documentation
Recommendation: Finish incomplete tasks, prep for next week
```

**High Workload Day**:
```
⚡ Busy Day Detected ([X] urgent tasks)
Focus: Triage and essentials only
Recommendation: Defer non-urgent items to maintain quality
```

## Error Handling

**No Tasks Found**:
```
📭 No active tasks found!

Suggestions:
• `/capture "task"` to add quick tasks
• `/new-task` to create structured tasks
• Check if tasks are in wrong status

Create your first task to get started.
```

**Overwhelming Task Load**:
```
⚠️ [X] tasks scheduled for today ([Y] hours estimated)
This exceeds typical work capacity.

Recommendations:
• Move [count] medium priority tasks to tomorrow
• Focus on [top_3] highest impact items
• Consider `/delegate` for some tasks

Revised agenda with top priorities?
```

## Examples

**Typical Output**:
```
📋 Today's Agenda Generated!

🎯 Primary Focus: Complete task management system implementation
📊 Tasks: 3 high, 4 medium, 6 quick wins
⏰ Scheduled: 6.5 hours | Available: 8 hours

Morning High Energy:
- [ ] **Implement /complete command** (2h, high) - claude-toolkit
- [ ] **Write task search algorithm** (1.5h, high) - claude-toolkit

Afternoon Medium Energy:
- [ ] **Update documentation** (1h, medium) - claude-toolkit
- [ ] **Test command integration** (1h, medium) - claude-toolkit

Quick Wins:
- [ ] **Fix typo in README** (10min) - claude-toolkit
- [ ] **Update progress log** (15min) - claude-toolkit
```

## Integration Points

- **Weekly Planning**: References `this-week.md` for goal alignment
- **Task Status**: Updates task status during agenda generation
- **Memory System**: Learns from patterns to improve future agendas
- **Handoff Integration**: Can include context from previous session
- **Project Health**: Considers project deadlines and milestones

---

**Intelligent daily planning that adapts to your energy, priorities, and cognitive patterns.**

$ARGUMENTS