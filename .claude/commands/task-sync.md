---
name: task-sync
aliases: [sync-tasks, integrate-tasks]
version: 1.0.0
description: Synchronize task system with handoff, status, and memory systems
---

<command_role>
You are a system integrator. Ensure seamless synchronization between the task management system and existing Claude Code toolkit systems (handoff, status, memory, project tracking).
</command_role>

<reasoning_protocol>
## Integration Protocol
1. **Status Assessment**: Evaluate current task and project states
2. **Context Preservation**: Prepare task data for handoff and memory storage
3. **Health Integration**: Incorporate task metrics into project health
4. **Memory Sync**: Update structured memory with task patterns and insights
5. **Cross-System Consistency**: Ensure data consistency across all systems
</reasoning_protocol>

<workflow>
## PHASE 1: Task System Assessment

1. **Collect Task Statistics**:
   ```
   📊 Scanning task system...

   Locations scanned:
   • .claude/v4/tasks/inbox/*.md
   • .claude/v4/tasks/active/*.md
   • .claude/v4/tasks/projects/**/*.md
   • .claude/v4/tasks/archive/**/*.md

   Task Summary:
   • Total tasks: [count]
   • Active tasks: [active_count]
   • Inbox tasks: [inbox_count]
   • Completed today: [completed_today]
   • Overdue tasks: [overdue_count]
   • Blocked tasks: [blocked_count]
   ```

2. **Current Session Analysis**:
   ```
   📋 Current Session Context:
   • Primary focus: [active_agenda_task or "none"]
   • Tasks completed this session: [session_completed]
   • Tasks created this session: [session_created]
   • Time worked: [estimated_session_time]
   • Energy level: [current_energy_assessment]
   ```

3. **Project Task Health**:
   ```
   🏗️ Project Analysis:
   • [project_name]: [task_count] tasks ([active]/[total])
   • Task completion velocity: [tasks_per_week]
   • Average completion time: [avg_completion_time]
   • Quality confidence: [avg_confidence_rating]/5
   ```

## PHASE 2: Enhanced Handoff Integration

1. **Generate Task Context for Handoff**:
   ```
   ## Task System State

   ### Active Tasks
   - [task_id]: [title] (Priority: [priority], Energy: [energy])
     Status: [current_status] | Estimate: [time_remaining]
     Context: [brief_context]

   ### Today's Progress
   - Completed: [completed_task_list]
   - In Progress: [partially_completed_tasks]
   - Blocked: [blocked_tasks_with_reasons]

   ### Task Metrics
   - Completion rate: [daily_completion_rate]
   - Time accuracy: [estimation_accuracy]%
   - Energy matching: [energy_match_success]%

   ### Next Session Priorities
   1. [highest_priority_task]
   2. [next_logical_task]
   3. [quick_win_option]

   ### Task System Health
   - Total active tasks: [active_count]
   - Overdue items: [overdue_count]
   - Blocked items: [blocked_count]
   - System status: [healthy/needs_attention/critical]
   ```

2. **Save Task Context to Session File**:
   ```
   📁 Writing to: .claude/v4/tasks/active/session-context.md

   Session Context Format:
   ---
   session_id: [current_session_id]
   date: [current_date]
   primary_focus: [main_task]
   energy_level: [session_energy]
   completion_count: [tasks_completed]
   creation_count: [tasks_created]
   next_priority: [highest_priority_next]
   ---

   # Session [ID] - [Date] Task Context

   [Detailed task context for next session]
   ```

3. **Update Memory System**:
   ```
   🧠 Updating .claude/v3/memory/ with task insights:

   decisions.json:
   • Task prioritization approach
   • Energy level assignments
   • Project categorization choices

   learnings.json:
   • Task completion patterns
   • Time estimation accuracy improvements
   • Energy-task type correlations

   project.json:
   • Task-related project context
   • Current task focus areas
   ```

## PHASE 3: Enhanced Status Integration

1. **Generate Task Health Metrics**:
   ```
   📊 Task Health Dashboard:

   Task Velocity:
   • This week: [tasks_completed_week]/[tasks_created_week]
   • Average completion time: [avg_time] vs [avg_estimate]
   • Quality score: [avg_confidence]/5.0

   Current Load:
   • Active: [active_count] tasks
   • Overdue: [overdue_count] ([overdue_percentage]%)
   • Blocked: [blocked_count]
   • Quick wins available: [quick_win_count]

   Energy Distribution:
   • High energy tasks: [high_count] ([high_hours]h)
   • Medium energy tasks: [medium_count] ([medium_hours]h)
   • Low energy tasks: [low_count] ([low_hours]h)
   ```

2. **Task-Feature Integration**:
   ```
   🔗 Task-Feature Correlation:

   Features with tasks:
   • [feature_id]: [related_task_count] tasks
     - Active: [active_task_count]
     - Completed: [completed_task_count]
     - Blocked: [blocked_task_count]

   Untracked work:
   • [count] tasks not linked to features
   • Suggest creating features for major task groups
   ```

3. **Enhanced Status Output Format**:
   ```
   ## Project Status with Task Health

   ### Feature Progress
   [existing feature status display]

   ### Task System Health
   ```
   Task Status: [healthy|attention|critical]
   • Active Tasks: [count] ([estimated_hours]h total)
   • Today's Progress: [completed]/[planned] completed
   • Energy Match: [percentage]% optimal allocation

   Quick Actions:
   • [urgent_task_count] urgent tasks require attention
   • [quick_win_count] quick wins available for low energy
   • [blocked_count] tasks need unblocking
   ```
   ```

## PHASE 4: Memory System Enhancement

1. **Task Pattern Analysis**:
   ```
   🧠 Learning from Task Patterns:

   Completion Patterns:
   • Most productive time: [time_range]
   • Best task types per energy level: [patterns]
   • Average time per task type: [type_time_map]

   Estimation Accuracy:
   • Overall accuracy: [percentage]%
   • Most accurate task types: [types]
   • Improvement trend: [trend]

   Energy Effectiveness:
   • High energy → [most_effective_types]
   • Medium energy → [most_effective_types]
   • Low energy → [most_effective_types]
   ```

2. **Update Learning Database**:
   ```
   📊 Storing Insights:

   learnings.json additions:
   • "Task energy matching improves completion by [X]%"
   • "Breaking tasks <2h increases success rate"
   • "Research tasks best scheduled for [time]"

   decisions.json additions:
   • "Use [task_type] tagging for [project_type] projects"
   • "Energy estimation methodology: [approach]"
   • "Task archival policy: [policy]"
   ```

## PHASE 5: Automated Maintenance

1. **Task Health Monitoring**:
   ```
   🔧 Automated Cleanup:

   Actions taken:
   • Archived [count] completed tasks >30 days old
   • Moved [count] stale inbox tasks to ideas/
   • Updated [count] task statuses based on progress
   • Flagged [count] tasks for review (overdue >1 week)

   Recommendations:
   • Review [overdue_count] overdue tasks
   • Consider breaking down [large_count] large tasks
   • Archive [old_completed_count] old completed tasks
   ```

2. **System Optimization**:
   ```
   ⚡ Performance Optimization:

   Statistics:
   • Total task files: [count]
   • Average search time: [milliseconds]ms
   • Disk usage: [size] MB
   • Index freshness: [last_update]

   Optimizations available:
   • Archive tasks older than [threshold]
   • Rebuild search index
   • Compress old archives
   ```

</workflow>

## Integration Commands

### Handoff Enhancement
Add to existing `/handoff` command:
```
## 7. Sync Task Context
Run `/task-sync --handoff` to save task state:
• Current task focus and progress
• Task completion metrics
• Next session priorities
• Task system health status
```

### Status Enhancement
Add to existing `/status` command:
```
### Task System Health
[task health metrics]

Next Actions (Enhanced):
💡 Recommended: [command] - [reason]
🎯 High Priority Tasks: [count] ([total_hours]h)
⚡ Quick Wins Available: [count] tasks for low energy
```

### Reload Enhancement
Add to `/reload` command:
```
## Task Context Restoration
Restoring task context from last session:
• Primary focus: [last_focus]
• Progress: [completion_summary]
• Next priorities: [priority_list]
```

## Command Examples

**Handoff Integration**:
```
/handoff

[existing handoff steps...]

## 7. Task Context Sync
✅ Task state saved to session-context.md
📊 Session metrics: 3 completed, 1 in progress
🎯 Next session priority: task_20260121_005
📈 Task health: Healthy (87% completion rate)
```

**Status Integration**:
```
/status

[existing status output...]

### Task System Health ⚡ Healthy
• Active Tasks: 8 (12.5h total)
• Today's Progress: 3/5 completed
• Energy Distribution: Optimal

💡 Recommended: /continue task_20260121_005 - high priority auth work
🎯 3 urgent tasks, 4 quick wins available
```

**Sync Command**:
```
/task-sync

📊 Task System Sync Complete

System Health: ✅ Healthy
• 12 active tasks (18h estimated)
• 85% completion rate this week
• No overdue items

Integration Status:
✅ Handoff context prepared
✅ Status metrics updated
✅ Memory patterns learned
✅ Project health synchronized

Next: Use /status to see integrated view
```

## Error Handling

**Task Files Missing**:
```
⚠️ Task system not initialized

Run: /new-task "first task" to get started
Or: Check .claude/v4/tasks/ folder exists
```

**Integration Conflicts**:
```
❌ Memory system write conflict detected

Resolution:
• Manual merge required in .claude/v3/memory/
• Or use --force to overwrite
• Or use --backup to save current first
```

## Integration Points

- **Enhanced Handoff**: Preserves complete task context across sessions
- **Enhanced Status**: Shows task health alongside feature progress
- **Memory Learning**: Continuously improves task management through pattern analysis
- **Project Tracking**: Correlates tasks with feature development progress
- **Session Continuity**: Enables seamless task context restoration

---

**Bridge the task management system with existing toolkit infrastructure for seamless workflow integration.**

$ARGUMENTS