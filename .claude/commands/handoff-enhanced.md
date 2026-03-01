---
name: handoff-enhanced
aliases: [handoff-tasks, task-handoff]
version: 1.0.0
description: Enhanced handoff with task management context preservation
---

<command_role>
You are a session handoff specialist with task management integration. Prepare comprehensive state for next session including task context, progress, and intelligent recommendations.
</command_role>

<reasoning_protocol>
## Enhanced Handoff Protocol
1. **Standard Handoff**: Execute existing handoff procedures
2. **Task Context**: Capture current task state and progress
3. **Session Analysis**: Analyze productivity and completion patterns
4. **Next Session Setup**: Prepare prioritized task list and context
5. **Learning Capture**: Store insights for continuous improvement
</reasoning_protocol>

<workflow>
## PHASE 1: Standard Handoff Procedures

Execute all standard handoff steps from existing `/handoff` command:

1. **Commit any uncommitted work**
   - Use conventional commit messages
   - Don't leave work in progress uncommitted

2. **Update features.json**
   - Ensure all "passes" values are accurate
   - Update "last_updated" timestamps

3. **Save to Structured Memory (v3.4)**
   - Store architectural decisions: `/remember decision`
   - Store session learnings: `/remember learning`
   - Store project context: `/remember context`

4. **Write to claude-progress.txt**
   ```
   ## Session [N] - [DATE]

   ### Completed
   - [What was accomplished]

   ### In Progress
   - [What's partially done]

   ### Next Steps
   - [What to work on next]

   ### Blockers
   - [Any issues preventing progress]

   ### Notes
   - [Important observations for next session]
   ```

5. **Check Active Worktrees (v3.4)**
   - List any active worktrees
   - Note worktree states in progress log

6. **Push to remote (if configured)**

## PHASE 2: Task System Context Capture

1. **Current Task Assessment**:
   ```
   📋 Analyzing current task state...

   Active Tasks:
   • Primary focus: [current_primary_task or "none"]
   • Secondary tasks: [list of active tasks]
   • Interruption tasks: [captured during session]

   Session Progress:
   • Tasks completed: [completed_task_list]
   • Tasks started: [newly_created_tasks]
   • Tasks moved forward: [progressed_tasks]
   • Time invested: [estimated_session_time]
   ```

2. **Task System Health Check**:
   ```
   🏥 Task System Health:

   Overall Status: [healthy/attention/critical]
   • Active tasks: [active_count]
   • Overdue tasks: [overdue_count]
   • Blocked tasks: [blocked_count]
   • Quick wins available: [quick_win_count]

   This Week's Metrics:
   • Completion rate: [completed]/[created] ([percentage]%)
   • Average completion confidence: [avg_confidence]/5
   • Energy matching accuracy: [energy_accuracy]%
   • Time estimation accuracy: [time_accuracy]%
   ```

3. **Session Productivity Analysis**:
   ```
   📊 Session Analysis:

   Focus Quality:
   • Deep work blocks: [count] ([total_time]h)
   • Task switching events: [count]
   • Context preservation: [quality_score]/5

   Energy Management:
   • Started with: [initial_energy] energy
   • Energy-task matching: [match_percentage]%
   • Optimal task types this session: [types]

   Completion Quality:
   • Tasks fully completed: [full_completion_count]
   • Tasks partially advanced: [partial_count]
   • Quality confidence average: [avg_confidence]/5
   ```

## PHASE 3: Next Session Preparation

1. **Priority Queue Generation**:
   ```
   🎯 Next Session Priorities:

   Immediate Actions (Start Here):
   1. [highest_priority_task] ([estimate], [energy])
      Context: [brief_context]
      Why first: [urgency_reason]

   2. [second_priority_task] ([estimate], [energy])
      Context: [brief_context]
      Dependency: [if_any]

   3. [third_priority_task] ([estimate], [energy])
      Context: [brief_context]
      Alternative if blocked: [backup_option]

   Quick Wins (Low Energy):
   • [quick_task_1] ([estimate])
   • [quick_task_2] ([estimate])
   • [quick_task_3] ([estimate])
   ```

2. **Context Bridge Creation**:
   ```
   🌉 Context Bridge for Next Session:

   Where you left off:
   • [primary_task]: [current_status and next_step]
   • [secondary_task]: [current_status and next_step]

   Key decisions made:
   • [decision_1]: [rationale]
   • [decision_2]: [rationale]

   Discoveries/Insights:
   • [insight_1]
   • [insight_2]

   Things to remember:
   • [important_context_1]
   • [important_context_2]
   ```

3. **Energy and Time Recommendations**:
   ```
   ⚡ Next Session Strategy:

   Optimal Start Time: [recommended_time]
   Recommended Duration: [session_length]
   Energy Level Needed: [energy_requirement]

   Session Plan:
   • First hour: [high_energy_recommendation]
   • Middle period: [sustained_work_recommendation]
   • Final period: [low_energy_cleanup_tasks]

   Preparation Needed:
   • [any_research_or_setup_required]
   • [tools_or_resources_to_prepare]
   ```

## PHASE 4: Enhanced Memory Integration

1. **Task Pattern Learning**:
   ```
   🧠 Updating Learning Database:

   Session Patterns Learned:
   • Best time for [task_type]: [time_pattern]
   • [task_type] completion improved by [factor]
   • Energy depletion pattern: [pattern]

   Estimation Improvements:
   • [task_type] typically takes [time_adjustment]
   • [complexity_indicator] suggests [time_multiplier]
   • [energy_type] tasks need [energy_buffer]
   ```

2. **Decision Documentation**:
   ```
   📚 Session Decisions Captured:

   Task Management Decisions:
   • Priority framework: [approach_used]
   • Energy allocation strategy: [strategy]
   • Interruption handling: [method]

   Project Decisions:
   • [project_specific_decision_1]
   • [project_specific_decision_2]

   These will be available via /recall in next session.
   ```

## PHASE 5: Handoff File Generation

1. **Create Task Context File**:
   ```
   📁 Writing: .claude/v4/tasks/active/session-context.md

   ---
   session_id: [unique_session_id]
   date: [current_date]
   time: [session_end_time]
   duration: [session_duration]
   primary_focus: [main_task_worked_on]
   energy_level: [session_energy_assessment]
   completion_count: [tasks_completed]
   creation_count: [tasks_created]
   quality_score: [session_quality_1_to_5]
   next_priority: [highest_priority_next]
   next_energy_needed: [energy_for_next]
   ---

   # Session Context - [Date]

   ## Session Summary
   [Narrative description of what was accomplished]

   ## Task Progress
   [Detailed task progress information]

   ## Next Session Setup
   [Detailed next session preparation]

   ## Context to Remember
   [Important context that must be preserved]
   ```

2. **Update Enhanced Progress Log**:
   ```
   📝 Updating claude-progress.txt with task integration:

   ## Session [N] - [DATE]

   ### Completed
   - [Standard completed items]
   - [Task system: X tasks completed, Y tasks advanced]

   ### In Progress
   - [Standard in-progress items]
   - [Primary task: [task_id] - [current_status]]

   ### Next Steps
   - [Standard next steps]
   - [Next session: Start with [priority_task_id]]

   ### Task Metrics
   - Completion rate: [rate]
   - Energy efficiency: [percentage]
   - Time accuracy: [percentage]

   ### Blockers
   - [Standard blockers]
   - [Task blockers: [blocked_task_list]]

   ### Notes
   - [Standard notes]
   - [Task insights: [key_learnings]]
   ```

## PHASE 6: Handoff Verification

1. **Completeness Check**:
   ```
   ✅ Handoff Verification:

   Standard Handoff:
   • [✓] Work committed
   • [✓] Features updated
   • [✓] Memory saved
   • [✓] Progress documented
   • [✓] Worktrees noted
   • [✓] Remote pushed

   Task Enhancement:
   • [✓] Task context captured
   • [✓] Next priorities identified
   • [✓] Session metrics recorded
   • [✓] Learning patterns stored
   • [✓] Context bridge created
   ```

2. **Next Session Readiness**:
   ```
   🚀 Next Session Ready:

   Use `/reload` to restore full context, including:
   • Standard project context
   • Task management state
   • Priority recommendations
   • Energy optimization guidance
   • Context bridges for immediate productivity

   Quick Start Command:
   `/today` - Will incorporate handoff context automatically
   ```

</workflow>

## Integration with Existing Systems

**Memory System Updates**:
- Add task completion patterns to learnings.json
- Store task-related decisions in decisions.json
- Update project.json with task context

**Status Integration**:
- Next `/status` command will show task health
- Task metrics incorporated into project health

**Reload Preparation**:
- Session context will be automatically restored
- Priority recommendations will be available
- Energy optimization will be applied

## Output Example

```
🔄 Enhanced Handoff Starting...

✅ Standard handoff procedures completed:
   • Work committed: "feat: implement task capture system"
   • Features.json updated: 3 features completed
   • Memory saved: 2 decisions, 3 learnings stored
   • Progress documented in claude-progress.txt

📋 Task System Context:
   • Session focus: task_20260121_001 (JWT authentication)
   • Tasks completed: 2 (task_20260121_002, task_20260121_003)
   • Tasks advanced: 1 (task_20260121_001 - 70% complete)
   • Session quality: 4/5 (high focus, good progress)

🎯 Next Session Setup:
   • Priority 1: Complete task_20260121_001 (1h remaining, high energy)
   • Priority 2: Start task_20260121_005 (user testing, medium energy)
   • Quick wins: 3 tasks available for low energy periods

📁 Context saved to:
   • .claude/v4/tasks/active/session-context.md
   • Enhanced claude-progress.txt with task metrics

🚀 Ready for next session!
   Use `/reload` to restore full context
   Use `/today` for optimized daily agenda
```

## Error Handling

**Task System Not Available**:
```
⚠️ Task system not found, running standard handoff only
✅ Standard handoff completed
💡 Initialize task system with `/new-task` for enhanced handoffs
```

**Incomplete Task Context**:
```
⚠️ Some task context incomplete:
   • [specific_missing_items]

Handoff saved with available information.
Review task status in next session with `/task-search --recent`
```

## Integration Points

- **Standard Handoff**: Fully compatible with existing handoff procedure
- **Task Management**: Deep integration with task context and priorities
- **Memory System**: Enhanced learning and decision capture
- **Next Session**: Optimized startup with task-aware recommendations
- **Project Health**: Task metrics incorporated into overall project status

---

**Complete session handoff with intelligent task context preservation for seamless productivity.**

$ARGUMENTS