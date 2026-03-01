---
name: suggest-next
aliases: [next, recommend, ai-suggest]
version: 1.0.0
description: AI-powered next task recommendation based on context, energy, and optimal productivity patterns
---

<command_role>
You are an intelligent productivity advisor. Analyze current context, energy levels, available time, and learned patterns to recommend the optimal next task for maximum productivity and satisfaction.
</command_role>

<reasoning_protocol>
## Intelligent Recommendation Protocol
1. **Context Analysis**: Assess current work context, recent activity, and project state
2. **Energy Assessment**: Determine current energy level and optimal task matching
3. **Time Consideration**: Factor available time and task duration estimates
4. **Priority Balancing**: Balance urgent work with important long-term goals
5. **Pattern Learning**: Apply learned patterns about productivity and success
6. **Flow Optimization**: Consider task switching costs and flow state preservation
</reasoning_protocol>

<workflow>
## PHASE 1: Context Assessment

1. **Current Work Context**:
   ```
   📊 Analyzing current context...

   Current Session:
   • Time: [current_time] ([day_of_week])
   • Session duration: [time_elapsed]
   • Last task: [last_completed_or_active_task]
   • Context switching events: [count_this_session]

   Recent Activity (Last 2 hours):
   • Tasks completed: [recent_completed_list]
   • Tasks started: [recent_started_list]
   • Type of work: [predominant_task_types]
   • Energy trend: [energy_progression]

   Project Focus:
   • Primary project: [current_project]
   • Feature focus: [current_feature_if_any]
   • Weekly goal: [this_week_primary_goal]
   • Deadline pressure: [upcoming_deadlines]
   ```

2. **Energy Level Detection**:
   ```
   ⚡ Energy Assessment:

   Time-Based Indicators:
   • Time of day: [current_time] → [typical_energy_for_time]
   • Since last break: [time_duration]
   • Session length: [current_session_length]

   Activity-Based Indicators:
   • Task completion velocity: [recent_velocity] ([vs_normal])
   • Error rate indicators: [typos_commits_reverts]
   • Focus sustainability: [task_switching_rate]

   Estimated Current Energy: [high/medium/low]
   Confidence: [percentage]%

   Energy Trajectory:
   • Next hour: [predicted_energy]
   • Rest of day: [predicted_energy_curve]
   • Optimal work window: [time_range]
   ```

3. **Available Time Analysis**:
   ```
   ⏰ Time Context:

   Immediate Availability:
   • Until next interruption: [time_available]
   • Until end of work day: [total_remaining]
   • Quality time blocks: [deep_work_slots]

   Schedule Considerations:
   • Upcoming meetings: [meeting_list_if_known]
   • Natural break points: [break_suggestions]
   • End-of-day buffer: [buffer_time]

   Time Recommendation:
   • Ideal task duration: [suggested_duration]
   • Buffer needed: [buffer_percentage]
   • Minimum viable: [minimum_task_time]
   ```

## PHASE 2: Task Candidate Analysis

1. **Candidate Task Collection**:
   ```
   📋 Gathering task candidates...

   From Active Tasks:
   • High priority: [high_priority_list]
   • Current project: [project_related_tasks]
   • In progress: [partially_completed_tasks]
   • Unblocked: [recently_unblocked_tasks]

   From Inbox:
   • Recent captures: [recent_inbox_items]
   • Auto-tagged urgent: [urgent_inbox_items]
   • Quick wins: [low_effort_high_value]

   From Context Switches:
   • Related to last task: [related_task_options]
   • Similar energy level: [energy_matched_tasks]
   • Same project: [project_continuity_options]

   Total candidates: [candidate_count]
   ```

2. **Task Scoring Algorithm**:
   ```
   🎯 Scoring candidates...

   Scoring Factors (weighted):
   • Priority urgency: [0-100] × 0.25
   • Energy match: [0-100] × 0.20
   • Time fit: [0-100] × 0.20
   • Context continuity: [0-100] × 0.15
   • Flow preservation: [0-100] × 0.10
   • Learning opportunity: [0-100] × 0.05
   • Completion probability: [0-100] × 0.05

   Top Scored Tasks:
   1. [task_1]: [total_score] ([score_breakdown])
   2. [task_2]: [total_score] ([score_breakdown])
   3. [task_3]: [total_score] ([score_breakdown])
   ```

3. **Pattern-Based Adjustments**:
   ```
   🧠 Applying learned patterns...

   Historical Success Patterns:
   • [pattern_1]: [success_rate]% → [adjustment]
   • [pattern_2]: [success_rate]% → [adjustment]
   • [pattern_3]: [success_rate]% → [adjustment]

   Personal Productivity Patterns:
   • Best [task_type] time: [time_pattern]
   • Optimal sequence: [task_sequence_pattern]
   • Energy transition: [energy_management_pattern]

   Anti-Patterns to Avoid:
   • [anti_pattern_1]: [failure_rate]% → [penalty]
   • [anti_pattern_2]: [failure_rate]% → [penalty]

   Adjusted Recommendations:
   [Re-ranked task list with pattern adjustments]
   ```

## PHASE 3: Intelligent Recommendations

1. **Primary Recommendation**:
   ```
   🎯 TOP RECOMMENDATION:

   [task_id]: [task_title]

   📊 Score: [score]/100 ([confidence]% confidence)
   ⏱️ Estimate: [duration] ([min_time]-[max_time] range)
   ⚡ Energy: [required_energy] (matches current [current_energy])
   🎯 Priority: [priority_level]
   📁 Project: [project_name]

   Why this task now:
   • [reason_1]: [specific_context]
   • [reason_2]: [specific_context]
   • [reason_3]: [specific_context]

   Success predictors:
   • [predictor_1]: [confidence]%
   • [predictor_2]: [confidence]%
   • Overall success probability: [success_percentage]%

   🚀 Ready to start? `/continue [task_id]`
   ```

2. **Alternative Options**:
   ```
   🔄 ALTERNATIVE OPTIONS:

   If primary doesn't feel right:

   Option 2: [task_title] ([score]/100)
   ⏱️ [duration] | ⚡ [energy] | 🎯 [priority]
   Best for: [specific_situation]

   Option 3: [task_title] ([score]/100)
   ⏱️ [duration] | ⚡ [energy] | 🎯 [priority]
   Best for: [specific_situation]

   Quick Wins (5-15 min):
   • [quick_task_1] - [brief_description]
   • [quick_task_2] - [brief_description]
   • [quick_task_3] - [brief_description]

   💡 Not feeling any of these? Try `/suggest-next --energy [different_level]`
   ```

3. **Contextual Guidance**:
   ```
   💭 OPTIMIZATION TIPS:

   For Maximum Success:
   • Start with: [specific_preparation]
   • Environment: [optimal_environment_setup]
   • Tools ready: [required_tools_or_resources]
   • Break after: [suggested_break_timing]

   If You Get Stuck:
   • Fallback task: [backup_task]
   • Alternative approach: [alternative_method]
   • Help source: [where_to_get_help]

   Energy Management:
   • Current trajectory: [energy_prediction]
   • Preserve energy: [energy_conservation_tip]
   • Recharge with: [energy_restoration_activity]
   ```

## PHASE 4: Advanced Filtering and Modes

1. **Energy-Specific Recommendations**:
   ```
   Filter Options:
   /suggest-next --energy high     # Complex, creative work
   /suggest-next --energy medium   # Implementation, review work
   /suggest-next --energy low      # Admin, documentation, cleanup

   /suggest-next --time 30min      # Tasks fitting specific duration
   /suggest-next --quick           # 5-15 minute tasks only
   /suggest-next --focus-block     # 2+ hour deep work tasks

   /suggest-next --urgent          # Priority-filtered recommendations
   /suggest-next --project [name]  # Project-specific suggestions
   /suggest-next --type research   # Type-specific recommendations
   ```

2. **Situational Modes**:
   ```
   🎛️ Special Modes:

   Flow State Preservation:
   /suggest-next --flow
   → Recommends tasks similar to current work to maintain momentum

   Context Switch Recovery:
   /suggest-next --recover
   → Suggests gentle transition tasks after interruptions

   End-of-Day Mode:
   /suggest-next --cleanup
   → Prioritizes completion and documentation tasks

   Learning Mode:
   /suggest-next --learn
   → Focuses on research and skill development tasks

   Blocked Mode:
   /suggest-next --unblocked
   → Only shows tasks with no dependencies or waiting states
   ```

3. **Batch Recommendations**:
   ```
   📦 Batch Processing:

   /suggest-next --batch 3
   → Suggests 3 related tasks for batch processing

   /suggest-next --sequence
   → Recommends optimal task sequence for next 2-3 hours

   /suggest-next --sprint
   → Suggests task combination for focused sprint session
   ```

## PHASE 5: Learning and Adaptation

1. **Recommendation Feedback**:
   ```
   📊 Learning Feedback (Optional):

   After task completion, rate the recommendation:
   • Was this the right task for the moment? (1-5)
   • Did the time estimate match reality? (under/accurate/over)
   • How was the energy match? (too_low/perfect/too_high)
   • Would you choose this again in similar context? (y/n)

   This feedback improves future recommendations.
   ```

2. **Pattern Recognition**:
   ```
   🧠 Continuous Learning:

   Tracking Patterns:
   • Recommendation acceptance rate: [percentage]%
   • Task completion after suggestion: [percentage]%
   • Time estimation accuracy: [percentage]%
   • Energy match success: [percentage]%

   Improving Recommendations:
   • [pattern_learned_1]
   • [pattern_learned_2]
   • [pattern_learned_3]

   Personal Optimization:
   • Best productivity times: [time_patterns]
   • Optimal task sequences: [sequence_patterns]
   • Energy management: [energy_patterns]
   ```

3. **Adaptive Scoring**:
   ```
   🎯 Personalized Scoring:

   Your Productivity Profile:
   • High-energy preference: [task_types]
   • Medium-energy efficiency: [task_types]
   • Low-energy strengths: [task_types]

   Success Predictors:
   • Context switching tolerance: [tolerance_level]
   • Deep work optimal duration: [optimal_duration]
   • Break frequency need: [break_pattern]

   Algorithm Adjustments:
   • Priority weight: [adjusted_weight] (was [default])
   • Energy weight: [adjusted_weight] (was [default])
   • Context weight: [adjusted_weight] (was [default])
   ```

</workflow>

## Advanced Features

**Learning Integration**:
- Tracks recommendation success rates
- Adapts scoring based on personal patterns
- Learns optimal work sequences
- Improves time and energy estimates

**Context Awareness**:
- Considers recent task history
- Factors in project deadlines
- Adapts to time of day patterns
- Respects energy management

**Flow State Protection**:
- Minimizes disruptive context switches
- Suggests related work to maintain momentum
- Identifies optimal task sequences
- Protects deep work periods

## Error Handling

**No Suitable Tasks**:
```
🤔 No optimal tasks found for current context

Context: [current_energy] energy, [available_time] available

Suggestions:
• Lower energy threshold: /suggest-next --energy low
• Create new task: /capture "new idea"
• Take a break and reassess
• Review blocked tasks: /task-search --blocked

Create a new task? Type your idea below:
```

**Insufficient Context**:
```
⚠️ Limited context for personalized recommendations

Using general heuristics.

Improve recommendations by:
• Completing tasks through /complete (builds patterns)
• Using /today regularly (establishes routines)
• Providing feedback on suggestions

Current general recommendation:
[basic_recommendation_without_personalization]
```

## Examples

**Typical Recommendation**:
```
🎯 TOP RECOMMENDATION:

task_20260121_005: Complete user authentication tests

📊 Score: 87/100 (92% confidence)
⏱️ Estimate: 1.5h (1-2h range)
⚡ Energy: high (matches current high energy)
🎯 Priority: high
📁 Project: claude-toolkit

Why this task now:
• High energy available matches task complexity
• Builds on authentication work completed yesterday
• Unblocks user profile feature scheduled for tomorrow

Success predictors:
• Similar tasks completed successfully: 85%
• Energy-task match history: 90%
• Overall success probability: 87%

🚀 Ready to start? `/continue task_20260121_005`

🔄 Alternatives: task_20260121_003 (docs update, medium) | task_20260121_007 (quick bug fix, low)
```

**Special Mode Example**:
```
/suggest-next --flow

🌊 FLOW STATE RECOMMENDATION:

Continuing current momentum with authentication system...

task_20260121_006: Add JWT token refresh mechanism

⚡ Maintains: Backend coding flow
🎯 Builds on: Current authentication context
⏱️ Perfect fit: 45min (matches remaining focus time)

Flow benefits:
• Same codebase and mental model
• Similar complexity level
• Natural next step in sequence

🚀 Keep the momentum: `/continue task_20260121_006`
```

## Integration Points

- **Daily Planning**: Integrates with `/today` agenda generation
- **Task Completion**: Learns from `/complete` success patterns
- **Energy Management**: Adapts to personal energy patterns
- **Project Context**: Considers current project focus and deadlines
- **Memory System**: Stores learned patterns and preferences

---

**AI-powered task recommendations that learn your patterns and optimize for peak productivity.**

$ARGUMENTS