---
name: status-enhanced
aliases: [status-tasks, project-status]
version: 1.0.0
description: Enhanced project status with integrated task management health
---

<command_role>
You are a comprehensive project health analyst. Provide unified visibility into both feature development progress and task management health, with intelligent recommendations for optimal productivity.
</command_role>

<reasoning_protocol>
## Enhanced Status Protocol
1. **Standard Status**: Execute existing project status checks
2. **Task Integration**: Analyze task system health and correlations
3. **Unified Health**: Combine feature and task metrics for overall project health
4. **Productivity Insights**: Provide actionable intelligence for next steps
5. **Recommendation Engine**: Suggest optimal next actions based on complete context
</reasoning_protocol>

<workflow>
## PHASE 1: Standard Project Status

Execute all standard status functionality with enhancements:

1. **Feature Progress Analysis**:
   ```
   📊 Feature Status (Enhanced):

   Total Features: X
   Completed: Y (Z%) ✅
   In Progress: A 🔄
   Remaining: B 📋

   Feature-Task Correlation:
   • Features with active tasks: [count]
   • Untracked work (tasks only): [count]
   • Feature completion velocity: [features_per_week]
   ```

2. **Current Development State**:
   ```
   🎯 Current Development Focus:

   Last completed: [feature_name] ✅
   Currently working on: [feature_name or task_name] 🔄
   Primary task focus: [task_id] - [task_title]
   Secondary tasks: [count] active

   Blockers:
   • Feature blockers: [feature_blocker_list]
   • Task blockers: [task_blocker_list]
   • System blockers: [system_blocker_list]
   ```

3. **Next Development Priorities**:
   ```
   📈 Next Up (Feature + Task Integrated):

   1. [Next_feature] 🎯
      Related tasks: [task_count] ([total_hours]h)
      Blocking factors: [any_blockers]

   2. [Following_feature] 📋
      Preparation needed: [prep_tasks]
      Dependencies: [dependencies]

   3. [Third_feature] 🔮
      Research required: [research_tasks]
      Risk factors: [risks]
   ```

## PHASE 2: Task System Health Integration

1. **Task Health Dashboard**:
   ```
   📋 Task Management Health:

   Overall Status: [🟢 Healthy | 🟡 Attention Needed | 🔴 Critical]

   Active Load:
   • Active tasks: [count] ([total_hours]h estimated)
   • Inbox tasks: [count] (need processing)
   • Overdue tasks: [count] ⚠️
   • Blocked tasks: [count] 🚫

   This Week's Metrics:
   • Tasks completed: [weekly_completed]
   • Completion rate: [percentage]% ([vs_target])
   • Average confidence: [confidence]/5 ⭐
   • Time accuracy: [accuracy]% 🎯
   ```

2. **Energy and Capacity Analysis**:
   ```
   ⚡ Energy & Capacity Status:

   Current Load Distribution:
   • High energy tasks: [count] ([hours]h) 🧠
   • Medium energy tasks: [count] ([hours]h) ⚙️
   • Low energy tasks: [count] ([hours]h) 📝

   Capacity Assessment:
   • Estimated work available: [hours]h this week
   • Current commitment: [committed_hours]h
   • Capacity utilization: [percentage]%
   • Buffer available: [buffer_hours]h

   Energy Optimization:
   • Best performing time: [time_slot]
   • Recommended focus: [energy_type] tasks
   • Quick wins available: [quick_win_count] tasks
   ```

3. **Task-Feature Correlation Matrix**:
   ```
   🔗 Work Correlation Analysis:

   Features with Task Support:
   • [feature_1]: [task_count] tasks ([active]/[completed])
     Status: [on_track/behind/ahead] ([percentage]% task completion)
   • [feature_2]: [task_count] tasks ([active]/[completed])
     Status: [on_track/behind/ahead] ([percentage]% task completion)

   Untracked Task Categories:
   • Infrastructure: [count] tasks
   • Documentation: [count] tasks
   • Research: [count] tasks
   • Administrative: [count] tasks

   Recommendations:
   • Consider creating features for [category] (> 5 tasks)
   • [feature_name] needs more task breakdown
   ```

## PHASE 3: Unified Health Assessment

1. **Integrated Project Health**:
   ```
   🏥 Comprehensive Project Health:

   Development Velocity:
   • Feature completion: [features_per_week] per week
   • Task throughput: [tasks_per_week] per week
   • Quality score: [quality]/5 ⭐
   • Velocity trend: [increasing/stable/decreasing] 📈

   Risk Factors:
   • [risk_count] high-risk items identified:
     - [risk_1]: [description] ([mitigation])
     - [risk_2]: [description] ([mitigation])

   Productivity Indicators:
   • Focus quality: [focus_score]/5 🎯
   • Task switching: [switch_count]/day ([optimal_range])
   • Completion confidence: [confidence_trend]
   • Time estimation: [accuracy_trend]
   ```

2. **System Performance Metrics**:
   ```
   ⚙️ System Performance:

   Workflow Efficiency:
   • Average task completion time: [avg_time]
   • Time from capture to start: [avg_delay]
   • Context switching overhead: [overhead_percentage]%
   • Handoff effectiveness: [handoff_score]/5

   Quality Metrics:
   • Feature test pass rate: [pass_rate]%
   • Task completion confidence: [confidence_avg]/5
   • Rework frequency: [rework_percentage]%
   • Documentation coverage: [doc_coverage]%
   ```

## PHASE 4: Intelligent Recommendations

1. **Context-Aware Next Actions**:
   ```
   💡 Intelligent Recommendations:

   Based on current state analysis:

   Immediate (Next 2 hours):
   • Priority: [specific_action] ([time_estimate])
     Reason: [context_based_reasoning]
     Energy needed: [energy_level]

   Today:
   • Focus block: [recommended_task] ([duration])
   • Quick wins: [task_list] (between meetings)
   • Cleanup: [maintenance_tasks] (low energy periods)

   This Week:
   • Feature milestone: [target_completion]
   • Task reduction: [backlog_management]
   • System improvement: [optimization_opportunity]
   ```

2. **Productivity Optimization Suggestions**:
   ```
   🚀 Productivity Optimization:

   Energy Management:
   • Schedule [high_energy_tasks] for [optimal_time_slot]
   • Batch [similar_task_types] for efficiency
   • Use [low_energy_periods] for [maintenance_tasks]

   Focus Improvement:
   • Block [time_duration] for [deep_work_task]
   • Minimize context switching between [conflicting_tasks]
   • Prepare [context_materials] in advance

   System Optimization:
   • Archive [old_completed_count] completed tasks
   • Break down [large_tasks_count] oversized tasks
   • Create features for [untracked_categories]
   ```

3. **Risk Mitigation Recommendations**:
   ```
   ⚠️ Risk Management:

   Immediate Attention Required:
   • [overdue_count] overdue tasks need resolution
   • [blocked_count] blocked tasks need unblocking
   • [critical_feature] missing test coverage

   Preventive Actions:
   • Set up [monitoring_for_X] to catch issues early
   • Schedule [regular_review] for task backlog health
   • Implement [process_improvement] based on recent patterns
   ```

## PHASE 5: Enhanced Status Display

1. **Board View Enhancement** (if --board specified):
   ```
   📋 Enhanced Project Board:

   ┌─────────────────────────────────────────────────────┐
   │  Project: [project-name] - Task-Integrated View     │
   └─────────────────────────────────────────────────────┘

   ┌──────────────────┬──────────────────┬──────────────────┐
   │   TODO (3)       │  IN PROGRESS (2) │    DONE (5)      │
   ├──────────────────┼──────────────────┼──────────────────┤
   │ F010: API Auth   │ F009: Login UI   │ F001: Setup      │
   │  └ 3 tasks (6h)  │  └ 2 tasks (3h)  │  └ 8 tasks ✅    │
   │                  │  🎯 task_001     │                  │
   │ F011: Dashboard  │                  │ F002: Database   │
   │  └ 5 tasks (8h)  │ F012: Reports    │  └ 12 tasks ✅   │
   │                  │  └ 1 task (2h)   │                  │
   │ F013: Tests      │                  │ F003: Models     │
   │  └ 2 tasks (4h)  │                  │  └ 6 tasks ✅    │
   └──────────────────┴──────────────────┴──────────────────┘

   Progress: [====●=====-----] 5/10 features (50%)
   Tasks: [========●●=-----] 26/40 tasks (65%)

   🎯 Current Focus: task_20260121_001 (JWT authentication)
   ⚡ Energy Status: [medium] - Good for implementation tasks
   📊 Weekly Velocity: On track (8 tasks completed)
   ```

2. **Compact View Enhancement** (if --compact specified):
   ```
   📊 [project]: 5/10 features (50%) | 26/40 tasks (65%) | Focus: JWT auth | Energy: medium | Health: 🟢
   ```

## PHASE 6: Next Actions Menu Enhancement

Enhanced version of the existing Next Actions menu:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT ACTIONS - INTELLIGENT RECOMMENDATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 OPTIMAL NOW: /continue task_20260121_001 - complete JWT auth (1h, high energy)
⚡ QUICK WIN: /complete task_20260121_003 - fix documentation typo (5min)
🔄 ALTERNATIVE: /today - generate optimized agenda for current energy level

Other Actions:
  [C] Continue - focused work on prioritized task
  [A] Autonomous - batch execution mode
  [T] Today - task-optimized daily agenda
  [S] Search - find specific tasks: /task-search [query]
  [H] Handoff - enhanced save with task context

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Recommended: /continue task_20260121_001 - highest impact, matches current energy
📊 Today's Capacity: 4.5h available | Current load: 3.5h | Buffer: 1h
🎯 Weekly Goal: Complete authentication system (67% done)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Enhanced Recommendation Logic

**Context-Aware Recommendations**:

| Condition | Enhanced Recommendation |
|-----------|-------------------------|
| High energy available | `/continue [high_energy_task]` - tackle complex work |
| Low energy period | `/task-search --quick` - find quick wins |
| Many urgent tasks | `/today` - optimize daily agenda |
| Blocked tasks present | `/task-search --blocked` - unblock workflow |
| Feature near completion | `/verify [feature]` - quality check |
| High task switching | `/today --focus-block` - schedule deep work |
| Overdue items | `/complete [overdue_task]` - clear backlog |
| Research needed | `/new-task "research [topic]"` - knowledge work |

## Error Handling

**Task System Unavailable**:
```
⚠️ Task system not initialized - showing standard status only

Standard Project Status:
[existing status display]

💡 Initialize task management: /new-task "first task"
   Enhanced status will include task health and recommendations
```

**Data Inconsistency**:
```
⚠️ Task-feature correlation issues detected:
   • [count] tasks reference non-existent features
   • [count] features have no associated tasks

Status displayed with available data.
Run /task-sync to resolve inconsistencies.
```

## Integration Points

- **Feature Tracking**: Task progress correlated with feature completion
- **Project Health**: Unified health score incorporating both systems
- **Recommendation Engine**: Intelligent next actions based on complete context
- **Capacity Planning**: Task load balanced with feature development goals
- **Quality Metrics**: Combined quality indicators from both systems

---

**Comprehensive project visibility with intelligent task-feature integration for optimal productivity.**

$ARGUMENTS