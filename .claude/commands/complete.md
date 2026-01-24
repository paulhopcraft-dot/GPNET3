---
name: complete
aliases: [done, finish, mark-complete]
version: 1.0.0
description: Mark tasks as complete, archive them, and update related systems
---

<command_role>
You are a completion specialist. Handle task completion with proper archival, progress tracking, learning capture, and system updates to maintain project visibility and continuous improvement.
</command_role>

<reasoning_protocol>
## Completion Verification Protocol
1. **Task Validation**: Verify task exists and is completable
2. **Completion Verification**: Ensure task actually finished (check acceptance criteria)
3. **Learning Capture**: Extract insights and patterns for future improvement
4. **Archive Organization**: Proper filing for future reference
5. **System Updates**: Update project status, weekly progress, and related tasks
</reasoning_protocol>

<workflow>
## PHASE 1: Task Identification & Validation

1. **Find Task**: Parse "$ARGUMENTS" for task ID or search term
   ```
   Search patterns:
   • Exact ID: task_20260121_001
   • Partial ID: 001, 20260121_001
   • Title search: "authentication" (fuzzy match)
   • Recent tasks: if ambiguous, show options
   ```

2. **Task Validation**:
   ```
   ✅ Valid Conditions:
   • Task file exists
   • Status is inbox, active, or waiting
   • Not already completed
   • Has clear completion criteria

   ❌ Invalid Conditions:
   • Status already "done" or "archived"
   • File not found
   • Ambiguous identifier (multiple matches)
   ```

3. **Display Task Summary**:
   ```
   📋 Found Task: [task_id]
   📝 Title: [title]
   📊 Status: [current_status] → done
   📁 Location: [current_file_path]
   🏷️ Tags: [tags]
   ⏱️ Estimate: [estimate] | 🎯 Priority: [priority]
   ```

## PHASE 2: Completion Verification

1. **Acceptance Criteria Check**:
   ```
   🎯 Checking Completion Criteria:

   Original Acceptance Criteria:
   - [x] [criterion_1] ✅
   - [x] [criterion_2] ✅
   - [ ] [criterion_3] ❓

   Incomplete criteria detected. Mark complete anyway? (y/n)
   ```

2. **Quality Gates** (if defined):
   ```
   🔍 Quality Verification:
   • Tests passing? [check if test-related]
   • Documentation updated? [check if feature]
   • Code reviewed? [check if development]
   • Deployed successfully? [check if deployment]
   ```

3. **Completion Confidence**:
   ```
   Rate task completion confidence (1-5):
   1 = Partial/temporary solution
   2 = Minimum viable completion
   3 = Solid completion, meets requirements
   4 = Excellent completion, exceeds expectations
   5 = Outstanding completion, creates additional value

   > [wait for input or default to 3]
   ```

## PHASE 3: Learning & Progress Capture

1. **Time Tracking**:
   ```
   ⏰ Time Analysis:
   • Estimated: [original_estimate]
   • Actual: [prompt for actual time or auto-calculate]
   • Variance: [difference and percentage]
   • Accuracy: [for future estimation improvement]
   ```

2. **Learning Extraction**:
   ```
   📚 Capture Insights:

   What did you learn?
   > [wait for input]

   Any obstacles or surprises?
   > [wait for input]

   What would you do differently?
   > [wait for input]

   Rate difficulty (1-5 where 1=easy, 5=very hard):
   > [wait for input]
   ```

3. **Quality Reflection**:
   ```
   💭 Quick Reflection:
   • Energy level during work: [high/medium/low]
   • Best time of day for this type of task: [morning/afternoon/evening]
   • Collaboration needed: [solo/team/expert help]
   • Tools/resources that helped: [list]
   ```

## PHASE 4: Task Archival

1. **Update Task Metadata**:
   ```yaml
   ---
   [existing metadata]
   status: done
   completed: [current_datetime]
   completion_confidence: [1-5]
   actual_time: [user_input]
   difficulty_rating: [1-5]
   learnings: |
     [user_insights]
   obstacles: |
     [user_obstacles]
   next_time: |
     [user_improvements]
   ---
   ```

2. **Archive File**:
   ```
   📁 Archive Organization:

   From: [current_location]
   To: .claude/v4/tasks/archive/[YYYY]/[MM-month]/[task_id].md

   Example:
   inbox/task_20260121_001.md
   → archive/2026/01-january/task_20260121_001.md
   ```

3. **Create Archive Folder** (if needed):
   ```
   📁 Creating: archive/2026/01-january/
   📊 Monthly index: archive/2026/01-january/README.md
   ```

## PHASE 5: System Updates

1. **Project Progress Updates**:
   ```
   📊 Update Project Metrics:
   • Increment completed task count
   • Update project health indicators
   • Check if project milestones reached
   • Update project completion percentage
   ```

2. **Weekly Progress Update**:
   ```
   📅 Update: active/this-week.md

   Weekly Metrics:
   • Tasks Completed: [previous_count] → [new_count]
   • [Project] Progress: [percentage]
   • Weekly Goal Status: [on_track/ahead/behind]
   ```

3. **Daily Agenda Update**:
   ```
   ✅ Update: active/today.md

   Actions:
   • Check off completed task: [x] [task_title]
   • Update time remaining in day
   • Suggest next task if agenda exists
   ```

4. **Related Task Updates**:
   ```
   🔗 Check Related Tasks:
   • Search for tasks linking to completed task
   • Update dependency status: "blocked by X" → "ready"
   • Notify about newly unblocked tasks
   • Suggest starting dependent tasks
   ```

## PHASE 6: Memory & Learning Integration

1. **Memory System Updates**:
   ```
   🧠 Store Learning:
   • Add to .claude/v3/memory/learnings.json
   • Update task completion patterns
   • Improve time estimation algorithms
   • Refine auto-tagging rules
   ```

2. **Pattern Recognition**:
   ```
   📊 Update Patterns:
   • Task type → completion time mapping
   • Energy level → task type effectiveness
   • Time of day → productivity correlation
   • Project complexity → resource requirements
   ```

3. **Success Metrics**:
   ```
   📈 Track Metrics:
   • Completion rate by task type
   • Estimation accuracy improvement
   • Quality confidence trends
   • Learning velocity patterns
   ```

## PHASE 7: Completion Celebration & Next Steps

1. **Completion Acknowledgment**:
   ```
   🎉 Task Completed Successfully!

   ✅ [task_title]
   📊 [completion_confidence]/5 confidence
   ⏰ [actual_time] (vs [estimated_time] estimated)
   📚 [learning_count] insights captured
   📁 Archived to: archive/[path]
   ```

2. **Next Action Suggestions**:
   ```
   🚀 What's Next?

   Immediate:
   • [related_task_if_unblocked]
   • [similar_task_if_in_flow]
   • [next_agenda_task]

   Strategic:
   • Update `/status` to see project health
   • Run `/today` to refresh agenda
   • Consider `/capture` for new ideas discovered
   ```

3. **Flow State Optimization**:
   ```
   🔥 You're in the zone!

   Similar energy tasks available:
   • [task_1] ([estimate])
   • [task_2] ([estimate])

   Continue momentum? Use `/suggest-next --energy [current]`
   ```

</workflow>

## Error Handling

**Task Not Found**:
```
❌ Task not found: "[user_input]"

Suggestions:
• Check task ID: use exact format (task_YYYYMMDD_NNN)
• Search by title: /complete "partial title"
• List active tasks: /task-search --status active
• View today's agenda: /today

Available tasks matching "[input]":
• [partial_matches_list]
```

**Already Completed**:
```
ℹ️ Task already completed: [task_id]
✅ Completed: [completion_date]
📁 Archived: [archive_location]

Actions:
• View task: open [archive_path]
• Reopen task: /reopen [task_id]
• Create follow-up: /new-task "follow-up task"
```

**Multiple Matches**:
```
🤔 Multiple tasks match "[input]":

1. [task_id_1]: [title_1] ([project])
2. [task_id_2]: [title_2] ([project])
3. [task_id_3]: [title_3] ([project])

Which task to complete? (1-3 or full task ID)
> [wait for selection]
```

## Examples

**Simple Completion**:
```
/complete task_20260121_001
```

**Output**:
```
🎉 Task Completed: task_20260121_001
✅ "Implement JWT authentication"
📊 4/5 confidence | ⏰ 3.5h (vs 4h estimated)
📁 Archived to: archive/2026/01-january/
🚀 Unblocked: task_20260121_005 (user login testing)
```

**Search Completion**:
```
/complete "authentication bug"
```

**Output**:
```
📋 Found: task_20260121_003
✅ "Fix authentication timeout bug"
❓ Incomplete criteria detected:
  - [x] Reproduce issue ✅
  - [x] Identify root cause ✅
  - [ ] Add monitoring ❓

Mark complete anyway? (y/n) > y
🎉 Task completed with 3/5 confidence
```

## Integration Points

- **Project Status**: Updates completion metrics in `/status`
- **Daily Planning**: Checks off items in `today.md`
- **Weekly Progress**: Updates `this-week.md` statistics
- **Memory System**: Stores completion patterns and learnings
- **Related Tasks**: Automatically unblocks dependent tasks
- **Time Tracking**: Improves future estimation accuracy

---

**Complete tasks with confidence, capture learning, and maintain project momentum.**

$ARGUMENTS