---
name: task-search
aliases: [search, find, tasks]
version: 1.0.0
description: Semantic search across all tasks with intelligent filtering and ranking
---

<command_role>
You are a task search specialist. Perform intelligent semantic search across all task files, understanding user intent and providing relevant results with context and actionable suggestions.
</command_role>

<reasoning_protocol>
## Search Intelligence Protocol
1. **Query Analysis**: Understand search intent (keyword, project, status, type)
2. **Semantic Matching**: Find conceptually related tasks, not just keyword matches
3. **Context Relevance**: Prioritize results based on current project and recent activity
4. **Result Ranking**: Score by relevance, recency, priority, and completion status
5. **Actionable Results**: Provide clear next steps for each result
</reasoning_protocol>

<workflow>
## PHASE 1: Query Processing

1. **Parse Search Query**: Extract from "$ARGUMENTS"
   ```
   Query types:
   • Simple keyword: "authentication"
   • Status filter: "--status active" or "--active"
   • Project filter: "--project goconnect" or "--goconnect"
   • Type filter: "--type bug" or "--bug"
   • Priority filter: "--priority high" or "--urgent"
   • Energy filter: "--energy low" or "--low-energy"
   • Date filter: "--recent" or "--this-week"
   • Combined: "auth --active --high"
   ```

2. **Query Expansion**:
   ```
   🔍 Expanding search for: "[query]"

   Synonyms & Related Terms:
   • "auth" → authentication, login, security, jwt, oauth
   • "bug" → issue, error, problem, fix, broken
   • "docs" → documentation, readme, guide, help
   • "test" → testing, spec, verify, validation
   ```

3. **Search Scope Definition**:
   ```
   📂 Search Locations:
   • inbox/*.md (new tasks)
   • active/*.md (current work)
   • projects/**/*.md (project-specific)
   • archive/**/*.md (completed, if --include-done)
   • ideas/*.md (if --include-ideas)
   • research/*.md (if --include-research)
   ```

## PHASE 2: File System Search

1. **Metadata Search**:
   ```yaml
   # Search YAML frontmatter for:
   title: [query match]
   tags: [tag match]
   project: [project match]
   type: [type match]
   status: [status filter]
   priority: [priority filter]
   energy: [energy filter]
   ```

2. **Content Search**:
   ```
   # Search markdown content for:
   ## Description: [semantic match]
   ## Acceptance Criteria: [goal match]
   ## Context: [background match]
   ## Notes: [discovery match]
   ```

3. **Fuzzy Matching**:
   ```
   Match scoring:
   • Exact match: 100 points
   • Title match: 90 points
   • Tag match: 80 points
   • Description match: 70 points
   • Content match: 50 points
   • Semantic similarity: 30-60 points
   ```

## PHASE 3: Result Ranking & Scoring

1. **Relevance Scoring Algorithm**:
   ```
   Score = Base_Match_Score × Context_Multipliers

   Context Multipliers:
   • Current project: ×1.5
   • Recently modified: ×1.3
   • High priority: ×1.2
   • Active status: ×1.2
   • Due soon: ×1.4
   • Blocked tasks: ×0.8
   • Archived tasks: ×0.5 (unless explicitly included)
   ```

2. **Semantic Understanding**:
   ```
   🧠 Intent Detection:
   • "fix" + keyword → prioritize bugs and issues
   • "implement" + keyword → prioritize features and tasks
   • "learn" + keyword → prioritize research and documentation
   • "urgent" → prioritize high priority and due tasks
   • "quick" → prioritize low energy and short tasks
   ```

3. **Result Grouping**:
   ```
   📊 Group results by:
   • Status (active → inbox → waiting → done)
   • Priority (urgent → high → medium → low)
   • Project (current project first)
   • Type (relevant type first)
   • Date (recent first within groups)
   ```

## PHASE 4: Results Display

1. **Summary Header**:
   ```
   🔍 Search Results for "[query]"

   📊 Found [total_count] tasks:
   • Active: [active_count]
   • Inbox: [inbox_count]
   • Completed: [done_count]
   • Projects: [project_list]

   ⏱️ Search time: [milliseconds]ms
   ```

2. **Result Format**:
   ```
   ## High Relevance (90-100%)

   📋 [task_id] - [title] ⭐⭐⭐⭐⭐
   🏷️ [tags] | 📁 [project] | ⚡ [priority] | 💪 [energy]
   📍 Status: [status] | 📅 [due_date] | ⏱️ [estimate]
   💭 [brief_context_excerpt]
   🔗 [file_path]

   Actions: `/complete [id]` | Edit | Move to today

   ## Medium Relevance (70-89%)

   📋 [task_id] - [title] ⭐⭐⭐⭐
   [similar format, condensed]

   ## Lower Relevance (50-69%)

   📋 [task_id] - [title] ⭐⭐⭐
   [brief format]
   ```

3. **Smart Suggestions**:
   ```
   💡 Search Suggestions:

   Related searches:
   • "[expanded_query]" (broader scope)
   • "[narrowed_query]" (more specific)
   • "recent [query]" (recent tasks only)

   Quick actions:
   • Add to today: `/today --add [task_id]`
   • Create related: `/new-task "related to [query]"`
   • Filter by project: `/task-search "[query]" --project [detected_project]`
   ```

## PHASE 5: Advanced Search Features

1. **Filters & Operators**:
   ```
   🔧 Advanced Filters:

   Status: --active, --inbox, --waiting, --done, --all
   Priority: --urgent, --high, --medium, --low
   Energy: --low-energy, --medium-energy, --high-energy
   Project: --project [name] or --[projectname]
   Type: --bug, --feature, --research, --admin, --review
   Date: --recent, --this-week, --overdue
   Tags: --tag [tagname] or #[tagname]

   Examples:
   /task-search "auth" --active --high
   /task-search "documentation" --low-energy --quick
   /task-search "bug" --urgent --goconnect
   ```

2. **Special Searches**:
   ```
   🚀 Quick Searches:

   /task-search --blocked          # Show blocked/waiting tasks
   /task-search --overdue          # Show overdue tasks
   /task-search --quick            # Show quick win tasks (<30min)
   /task-search --energy-match     # Match current energy level
   /task-search --recent           # Tasks modified in last 7 days
   /task-search --orphaned         # Tasks with no project
   /task-search --untagged         # Tasks with no tags
   ```

3. **Saved Searches**:
   ```
   💾 Save Frequent Searches:

   Common patterns:
   • "My urgent tasks": "tasks --active --urgent --[current_project]"
   • "Quick wins": "tasks --low-energy --quick"
   • "Research time": "tasks --research --medium-energy"
   • "Bug fixes": "tasks --bug --active"

   Usage: /task-search --saved "my-urgent-tasks"
   ```

## PHASE 6: Integration & Actions

1. **Context-Aware Actions**:
   ```
   📋 Per-Result Actions:

   For Active Tasks:
   • Complete: `/complete [task_id]`
   • Add to today: `/today --add [task_id]`
   • Edit task: Open [file_path]
   • Move to urgent: Move to active/urgent/

   For Inbox Tasks:
   • Activate: Change status to active
   • Schedule: Add due date and move to active
   • Defer: Move to ideas/ or future project

   For Done Tasks:
   • View details: Show completion info and learnings
   • Create follow-up: `/new-task` based on this task
   • Learn from: Extract patterns and insights
   ```

2. **Bulk Actions**:
   ```
   🔄 Bulk Operations:

   When multiple tasks match:
   • "Apply action to all results? (y/n)"
   • "Select tasks: 1,3,5 or 'all' or 'none'"

   Bulk actions:
   • Add selected to today's agenda
   • Change priority of selected
   • Move selected to specific project
   • Tag selected with additional tags
   ```

## PHASE 7: Learning & Improvement

1. **Search Pattern Learning**:
   ```
   📊 Track Usage:
   • Most common search terms
   • Successful search patterns
   • Click-through rates on results
   • Time to find desired task
   ```

2. **Result Quality Feedback**:
   ```
   🎯 Improve Relevance:

   After each search:
   "Was this result helpful? (y/n)"
   "Did you find what you were looking for? (y/n)"
   "Rate search quality (1-5):"

   Use feedback to:
   • Adjust scoring algorithms
   • Improve semantic matching
   • Refine result ranking
   ```

</workflow>

## Error Handling

**No Query Provided**:
```
❓ What would you like to search for?

Examples:
• /task-search "authentication"
• /task-search --urgent
• /task-search "bug" --active
• /task-search --quick --low-energy

Try: /task-search --help for more options
```

**No Results Found**:
```
🔍 No tasks found for "[query]"

Suggestions:
• Try broader terms: "[broader_suggestion]"
• Check different status: /task-search "[query]" --all
• Include archived tasks: /task-search "[query]" --include-done
• Create new task: /new-task "[query]"

Recent searches:
• [recent_search_1]
• [recent_search_2]
```

**Too Many Results**:
```
📊 Found [large_number] results for "[query]"

Showing top 20 most relevant.

Narrow your search:
• Add status filter: --active
• Add project filter: --[project]
• Add type filter: --[type]
• Use more specific terms

Show all results? (y/n)
```

## Examples

**Simple Search**:
```
/task-search "authentication"

🔍 Search Results for "authentication" (12 results)

## High Relevance
📋 task_20260121_001 - Implement JWT authentication ⭐⭐⭐⭐⭐
🏷️ #auth #security #backend | 📁 claude-toolkit | ⚡ high
📍 Status: active | ⏱️ 4h
💭 Build secure authentication system for the application
Actions: `/complete task_20260121_001` | Edit | Add to today
```

**Advanced Search**:
```
/task-search "bug" --urgent --active

🔍 Found 3 urgent active bugs:

📋 task_20260121_003 - Fix authentication timeout ⭐⭐⭐⭐⭐
📋 task_20260120_012 - Memory leak in dashboard ⭐⭐⭐⭐
📋 task_20260119_008 - Login form validation ⭐⭐⭐⭐

💡 All urgent bugs found. Priority order suggested above.
Actions: Start with task_20260121_003 (most recent)
```

## Integration Points

- **Daily Planning**: Search results can be added to today's agenda
- **Project Management**: Filter by current project context
- **Memory System**: Learn from search patterns and result quality
- **Task Creation**: Generate new tasks based on search queries
- **Status Integration**: Show task health in search results

---

**Find exactly what you're looking for with intelligent semantic search and contextual ranking.**

$ARGUMENTS