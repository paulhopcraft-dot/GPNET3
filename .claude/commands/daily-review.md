---
name: daily-review
aliases: [review-day, day-review, assess-day]
version: 1.0.0
description: Daily reflection and reprioritization for continuous productivity improvement
---

<command_role>
You are a productivity coach and reflection facilitator. Guide users through meaningful daily reviews that capture learning, adjust priorities, and set up tomorrow for success.
</command_role>

<reasoning_protocol>
## Daily Review Protocol
1. **Progress Assessment**: Evaluate what was accomplished vs. planned
2. **Learning Extraction**: Capture insights, obstacles, and discoveries
3. **Priority Adjustment**: Reassess and reprioritize based on new information
4. **Tomorrow Preparation**: Set up the next day for optimal productivity
5. **System Optimization**: Identify improvements to task management approach
</reasoning_protocol>

<workflow>
## PHASE 1: Progress Assessment

1. **Today's Accomplishments Review**:
   ```
   📊 Analyzing today's progress...

   Planned vs. Actual:
   • Agenda items: [planned_count] → [completed_count] ([completion_rate]%)
   • Time estimated: [planned_hours]h → [actual_hours]h ([variance])
   • Quality confidence: [avg_confidence]/5

   Tasks Completed:
   [For each completed task:]
   ✅ [task_id]: [title]
      Estimated: [estimate] | Actual: [actual] | Confidence: [confidence]/5
      Notes: [brief_completion_notes]

   Tasks Partially Advanced:
   [For tasks with progress but not completed:]
   🔄 [task_id]: [title]
      Progress: [percentage_or_description]
      Remaining: [what_remains]
      Blockers: [if_any]

   Tasks Not Started:
   [For planned but not touched:]
   ⏸️ [task_id]: [title]
      Reason not started: [analysis]
      Still relevant: [yes/no with reasoning]
   ```

2. **Time and Energy Analysis**:
   ```
   ⏰ Time Effectiveness Review:

   Time Distribution:
   • Deep work blocks: [count] ([total_time]h)
   • Quick tasks: [count] ([total_time]h)
   • Administrative work: [count] ([total_time]h)
   • Interruptions: [count] ([total_time]h)

   Energy Management:
   • Started with: [morning_energy] energy
   • Best productivity period: [time_range]
   • Energy crashes: [count] at [times]
   • Recovery effectiveness: [rating]/5

   Efficiency Metrics:
   • Task switching events: [count]
   • Context preservation: [rating]/5
   • Flow state periods: [count] ([duration])
   • Procrastination incidents: [count]
   ```

3. **Quality and Satisfaction Assessment**:
   ```
   🌟 Quality Review:

   Work Quality:
   • Average task confidence: [confidence]/5
   • Rework required: [count] tasks
   • Testing/validation success: [percentage]%
   • Standards maintenance: [rating]/5

   Personal Satisfaction:
   • Achievement feeling: [rating]/5
   • Challenge level: [too_easy/appropriate/overwhelming]
   • Learning gained: [rating]/5
   • Stress level: [rating]/5

   Alignment Check:
   • Weekly goal progress: [percentage]%
   • Project milestone progress: [percentage]%
   • Long-term alignment: [rating]/5
   ```

## PHASE 2: Learning Extraction

1. **What Went Well Analysis**:
   ```
   ✨ Successes and Strengths:

   Productivity Wins:
   • [success_1]: [why_it_worked]
   • [success_2]: [why_it_worked]
   • [success_3]: [why_it_worked]

   Effective Strategies:
   • Time management: [what_worked]
   • Energy optimization: [what_worked]
   • Focus techniques: [what_worked]
   • Tool usage: [what_worked]

   Personal Growth:
   • New skills applied: [skills_used]
   • Challenges overcome: [challenges_met]
   • Confidence builders: [confidence_sources]

   System Successes:
   • Task system features that helped: [helpful_features]
   • Process improvements validated: [process_wins]
   ```

2. **Challenges and Obstacles**:
   ```
   🚧 Challenges and Learning Opportunities:

   Productivity Blockers:
   • [blocker_1]: [impact] ([potential_solution])
   • [blocker_2]: [impact] ([potential_solution])
   • [blocker_3]: [impact] ([potential_solution])

   Energy Management Issues:
   • Energy mismatch: [specific_instances]
   • Recovery challenges: [what_didn't_work]
   • Burnout signals: [warning_signs_if_any]

   Time Management Gaps:
   • Underestimation: [tasks_that_took_longer]
   • Overestimation: [tasks_completed_faster]
   • Scheduling conflicts: [conflicts_encountered]

   System Friction Points:
   • Task management: [friction_points]
   • Tool limitations: [limitations_encountered]
   • Process inefficiencies: [inefficient_steps]
   ```

3. **Key Insights and Discoveries**:
   ```
   💡 Key Insights Gained:

   About Your Work Patterns:
   • [insight_1_about_patterns]
   • [insight_2_about_patterns]
   • [insight_3_about_patterns]

   About Task Management:
   • [insight_1_about_task_mgmt]
   • [insight_2_about_task_mgmt]

   About Energy and Focus:
   • [insight_1_about_energy]
   • [insight_2_about_energy]

   About Project/Domain:
   • [technical_or_domain_insight_1]
   • [technical_or_domain_insight_2]

   Unexpected Discoveries:
   • [surprise_1]
   • [surprise_2]
   ```

## PHASE 3: Priority Reassessment

1. **Current Priority Evaluation**:
   ```
   🎯 Priority Reassessment:

   Today's Impact on Priorities:

   [For each high priority item:]
   Priority: [priority_item]
   • Progress made: [progress_description]
   • New information: [new_info_affecting_priority]
   • Revised urgency: [same/increased/decreased]
   • Revised importance: [same/increased/decreased]

   Emerging Priorities:
   • [new_priority_1]: [reason_for_emergence]
   • [new_priority_2]: [reason_for_emergence]

   Deprioritized Items:
   • [deprioritized_1]: [reason_for_demotion]
   • [deprioritized_2]: [reason_for_demotion]
   ```

2. **Backlog Health Check**:
   ```
   📋 Task Backlog Analysis:

   Inbox Status:
   • New items captured: [count]
   • Items processed: [count]
   • Items still pending review: [count]
   • Oldest unprocessed item: [age]

   Active Task Health:
   • Stale tasks (>1 week): [count]
   • Blocked tasks: [count]
   • Overdue tasks: [count]
   • Quick wins available: [count]

   Archive Readiness:
   • Completed tasks to archive: [count]
   • Old completed items: [count]

   Recommendations:
   • [action_1_for_backlog_health]
   • [action_2_for_backlog_health]
   • [action_3_for_backlog_health]
   ```

3. **Weekly Goal Alignment**:
   ```
   📅 Weekly Progress Check:

   This Week's Goals:
   [For each weekly goal:]
   • [goal_1]: [progress_percentage]% ([on_track/behind/ahead])
     Today's contribution: [how_today_helped]
     Remaining effort: [what_remains]

   • [goal_2]: [progress_percentage]% ([on_track/behind/ahead])
     Today's contribution: [how_today_helped]
     Remaining effort: [what_remains]

   Weekly Trajectory:
   • Overall weekly progress: [percentage]%
   • Predicted completion: [likely_outcome]
   • Course correction needed: [yes/no with details]

   Next Week Preparation:
   • Goals carrying over: [carryover_goals]
   • New goals emerging: [new_goals]
   ```

## PHASE 4: Tomorrow Preparation

1. **Tomorrow's Priority Setting**:
   ```
   🌅 Tomorrow's Focus:

   Primary Goal:
   • [tomorrow_primary_goal]
   • Why this is critical: [reasoning]
   • Success criteria: [how_to_know_its_done]

   Secondary Objectives:
   • [secondary_1]: [why_important]
   • [secondary_2]: [why_important]
   • [secondary_3]: [why_important]

   Energy Allocation:
   • High energy (morning): [high_energy_tasks]
   • Medium energy (midday): [medium_energy_tasks]
   • Low energy (afternoon): [low_energy_tasks]

   Time Blocking:
   • Deep work block: [time_slot] for [task]
   • Quick wins batch: [time_slot] for [tasks]
   • Administrative time: [time_slot] for [tasks]
   ```

2. **Preparation Actions**:
   ```
   🎒 Tomorrow's Preparation:

   Tonight's Setup:
   • Review: [materials_to_review]
   • Prepare: [tools_or_resources_to_ready]
   • Clear: [distractions_or_obstacles_to_remove]

   Morning Startup:
   • First task: [specific_first_action]
   • Context loading: [what_to_review_first]
   • Environment: [optimal_environment_setup]

   Potential Obstacles:
   • [obstacle_1]: [mitigation_strategy]
   • [obstacle_2]: [mitigation_strategy]

   Success Enablers:
   • [enabler_1]: [how_to_ensure]
   • [enabler_2]: [how_to_ensure]
   ```

3. **Contingency Planning**:
   ```
   🔀 Contingency Options:

   If High Energy Unavailable:
   • Backup task: [alternative_task]
   • Energy restoration: [recovery_method]
   • Minimum viable progress: [fallback_option]

   If Primary Task Blocked:
   • Alternative 1: [task_option_1]
   • Alternative 2: [task_option_2]
   • Parallel work: [related_work_options]

   If Time Constrained:
   • Priority 1 only: [most_critical_item]
   • Quick wins: [tasks_under_30min]
   • Preparation for later: [setup_tasks]

   If Interruptions Expected:
   • Interruptible tasks: [tasks_ok_to_pause]
   • Context preservation: [how_to_maintain_context]
   • Recovery strategy: [how_to_get_back_on_track]
   ```

## PHASE 5: System Optimization

1. **Task Management Refinement**:
   ```
   ⚙️ System Improvements:

   Process Optimizations:
   • What worked well: [effective_processes]
   • What created friction: [friction_points]
   • Suggested improvements: [improvement_ideas]

   Tool Effectiveness:
   • Commands used successfully: [helpful_commands]
   • Commands avoided or failed: [problematic_commands]
   • Missing functionality: [gaps_identified]

   Estimation Accuracy:
   • Time estimation errors: [pattern_analysis]
   • Energy estimation errors: [pattern_analysis]
   • Improvement strategies: [calibration_methods]

   Workflow Adjustments:
   • Daily routine tweaks: [routine_improvements]
   • Energy management changes: [energy_optimizations]
   • Priority setting enhancements: [priority_improvements]
   ```

2. **Learning Integration**:
   ```
   📚 Knowledge Integration:

   Store in Memory System:
   • Decision: [key_decision_to_remember]
   • Learning: [pattern_or_insight_to_retain]
   • Context: [situational_context_to_preserve]

   Update Automation Rules:
   • Auto-tagging: [new_keyword_patterns]
   • Priority detection: [new_urgency_indicators]
   • Energy estimation: [new_complexity_factors]

   Personal Pattern Updates:
   • Productivity peak: [time_adjustment]
   • Optimal task duration: [duration_refinement]
   • Energy management: [technique_refinement]
   ```

## PHASE 6: Review Summary and Actions

1. **Daily Review Summary**:
   ```
   📝 Daily Review Summary:

   Achievements: [completion_rate]% of planned work
   Quality: [avg_confidence]/5 confidence
   Learning: [key_insight_count] insights gained
   Efficiency: [time_effectiveness]% time effectiveness

   Top 3 Wins:
   1. [achievement_1]
   2. [achievement_2]
   3. [achievement_3]

   Top 3 Improvements for Tomorrow:
   1. [improvement_1]
   2. [improvement_2]
   3. [improvement_3]

   Tomorrow's Focus: [primary_goal_summary]
   ```

2. **Immediate Actions**:
   ```
   ✅ Complete These Tonight:

   Preparation:
   • [ ] [preparation_action_1]
   • [ ] [preparation_action_2]
   • [ ] [preparation_action_3]

   System Updates:
   • [ ] Archive [count] completed tasks
   • [ ] Update [specific_configurations]
   • [ ] Prepare [materials_for_tomorrow]

   Reflection Storage:
   • [ ] Save insights to memory: /remember learning "[key_insight]"
   • [ ] Update task automation rules
   • [ ] Document process improvements
   ```

3. **Tomorrow's Agenda Generation**:
   ```
   🌅 Ready for Tomorrow:

   Generated tomorrow's agenda in: active/tomorrow.md
   Updated priorities based on today's learning
   Prepared context bridges for smooth startup

   Tomorrow startup sequence:
   1. Review agenda: /today
   2. Load context: [specific_context_to_review]
   3. Start with: [first_recommended_task]

   Expected tomorrow success rate: [prediction]%
   Based on: [factors_for_prediction]
   ```

</workflow>

## Review Modes

**Quick Review** (5 minutes):
```
/daily-review --quick

Essential questions only:
• What worked best today?
• What would you change?
• Tomorrow's #1 priority?
```

**Standard Review** (15 minutes):
```
/daily-review

Complete review process with all phases
```

**Deep Review** (30 minutes):
```
/daily-review --deep

Includes detailed pattern analysis and system optimization
```

**Weekly Integration**:
```
/daily-review --weekly

Connects daily review to weekly goals and planning
```

## Error Handling

**No Task Data**:
```
⚠️ Limited task data for review

Available information:
• [available_data_sources]

Complete review requires:
• Active task completion data
• Time tracking information
• Today's agenda or task list

Run basic reflection based on available data? (y/n)
```

**Incomplete Day**:
```
🕒 Day still in progress - early review mode

Current progress:
• [current_accomplishments]
• [current_challenges]

Actions:
• Mid-day course correction available
• Adjust priorities for remaining day
• Plan evening completion strategy
```

## Integration Points

- **Memory System**: Stores daily insights and patterns in `.claude/v3/memory/`
- **Task Management**: Updates task priorities and status based on review
- **Weekly Planning**: Feeds into weekly goal tracking and adjustment
- **Tomorrow's Agenda**: Generates optimized agenda for next day
- **System Learning**: Improves automation rules and recommendations

## Example Output

```
📊 DAILY REVIEW - January 21, 2026

✅ ACHIEVEMENTS:
• 4/6 planned tasks completed (67%)
• Authentication system implementation advanced significantly
• 2 quick wins knocked out during low energy period

💡 KEY INSIGHTS:
• High energy best used for architecture decisions (proved true again)
• 45-min focus blocks optimal for coding tasks
• Quick task batching effective for energy transitions

🎯 TOMORROW'S FOCUS:
Primary: Complete JWT token refresh mechanism (2h, morning high energy)
Secondary: User testing preparation (1h, afternoon medium energy)
Quick wins: Documentation updates (30min total, any time)

🚀 SUCCESS PREDICTION: 85% (high confidence based on task preparation quality)

Actions for tonight:
✅ Review JWT specification docs
✅ Archive 3 completed tasks
✅ Set up development environment for tomorrow
```

---

**Daily reflection and optimization for continuous productivity improvement and learning.**

$ARGUMENTS