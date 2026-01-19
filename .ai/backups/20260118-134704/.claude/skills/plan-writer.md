# Plan Writer Skill

Transforms the planning phase of development into a structured, systematic process that produces clear execution contracts. Focuses exclusively on THINK sessions - analyze the request, create a detailed plan, write it to a file, and stop.

## Usage

```bash
/plan "task description"              # Create plan for task
/plan "task" --feature=name           # Create feature-specific plan
/plan --list                          # Show existing plans
/plan --lint                          # Validate current plan
/plan --template                      # Show plan template
```

## How It Works

### 1. Planning Workflow

When you run `/plan "Add logout button"`, the system:

1. **Analyzes the request** for scope and complexity
2. **Asks clarifying questions** if needed
3. **Creates structured plan** following strict schema
4. **Writes plan to file** using auto-detected naming
5. **Validates plan quality** with linting rules
6. **STOPS** - no implementation, just planning

### 2. Plan File Strategy

**Auto-Detection Logic:**
```javascript
// Get git repository name
repoName = git rev-parse --show-toplevel | basename

// Generate plan filename
if (feature) {
  filename = `.ai/${repoName}-${feature}-plan.md`
} else {
  filename = `.ai/${repoName}-plan.md`
}

// Fallback for single-project workflows
fallback = `.ai/plan.md`
```

**Examples:**
- `claude-code-toolkit` repo → `.ai/claude-code-toolkit-plan.md`
- `gosera` repo → `.ai/gosera-plan.md`
- Feature-specific: `.ai/claude-code-toolkit-auth-plan.md`

### 3. Plan Structure Enforcement

**Required Sections:**
```md
# Plan: [Descriptive Title]

## Goal
[Single sentence describing concrete outcome]

## Constraints
- Do not [specific limitation]
- Keep [specific boundary]

## Steps
1. [Specific actionable step]
2. [Another measurable action]
3. [Final concrete step]

## Done When
- [Binary testable condition]
- [Verifiable outcome]
```

**Quality Gates:**
- No vague language ("optimize", "improve", "enhance")
- Numbered steps with concrete actions
- Single-sentence goal
- Testable "Done When" criteria

## Command Implementation

### Basic Planning
```bash
/plan "Add logout button"
```

**Process:**
1. Analyze task scope and requirements
2. Ask clarifying questions if needed:
   - Where should the button appear?
   - What should happen after logout?
   - Any confirmation dialogs needed?
3. Create structured plan following schema
4. **SHOW PLAN TO USER FOR REVIEW**
5. Ask for confirmation: "Does this plan look good? Should I save it?"
6. Wait for user approval before saving
7. Write to `.ai/claude-code-toolkit-plan.md` only after confirmation
8. Run automatic linting validation
9. Display plan summary and next steps
10. **STOP** - no implementation

**Example Output:**
```
PLAN ANALYSIS
=============
Task: "Add logout button"
Complexity: Low
Scope: Single component + handler

CLARIFICATION
=============
I need to understand a few details:

1. Where should the logout button appear?
   a) Navigation bar (recommended)
   b) User menu dropdown
   c) Settings page
   d) Other location

2. What should happen after logout?
   a) Redirect to login page (recommended)
   b) Redirect to home page
   c) Show confirmation message
   d) Other action

[User provides answers]

PLAN CREATION
=============
✅ Plan created: .ai/claude-code-toolkit-plan.md
✅ Linting passed - plan is valid
✅ Ready for execution

PLAN SUMMARY
============
Goal: Add logout button to navigation that clears session and redirects to login
Steps: 4 specific implementation steps
Constraints: 3 clear boundaries defined
Success Criteria: 3 testable conditions

NEXT STEPS
==========
To execute this plan:
1. Start fresh Claude session: /clear
2. Run: "Read .ai/claude-code-toolkit-plan.md and implement exactly"

Planning complete. Do not proceed with implementation in this session.
```

### Feature-Specific Planning
```bash
/plan "Redesign authentication flow" --feature=auth
```

**Process:**
1. Creates `.ai/claude-code-toolkit-auth-plan.md`
2. Allows parallel feature development
3. Isolates complex features from main plans
4. Supports multiple concurrent workstreams

### Plan Management

#### List Existing Plans
```bash
/plan --list
```

**Output:**
```
EXISTING PLANS
==============
📁 .ai/claude-code-toolkit-plan.md (Main plan)
   Goal: Add logout button to navigation
   Status: Ready for execution
   Created: 2 hours ago

📁 .ai/claude-code-toolkit-auth-plan.md (Auth feature)
   Goal: Redesign authentication flow with OAuth
   Status: Ready for execution
   Created: 1 day ago

📁 .ai/gosera-plan.md (GoSera project)
   Goal: Implement rate limiting for API endpoints
   Status: Ready for execution
   Created: 3 hours ago

Total: 3 plans ready for execution
```

#### Validate Plan Quality
```bash
/plan --lint
```

**Process:**
1. Auto-detects current plan file
2. Runs comprehensive validation
3. Reports quality issues and suggestions

**Output:**
```
PLAN VALIDATION
===============
File: .ai/claude-code-toolkit-plan.md

✅ Structure: All required sections present
✅ Goal: Single sentence, concrete outcome
✅ Constraints: Clear boundaries defined
✅ Steps: Numbered, specific actions
⚠️  Done When: Could be more testable

SUGGESTIONS
===========
- Consider adding "tests pass" to success criteria
- Specify exact UI elements in steps

Overall: Plan is valid and ready for execution
Quality Score: 85/100
```

#### Show Plan Template
```bash
/plan --template
```

**Output:**
```
PLAN TEMPLATE
=============

# Plan: [Descriptive Title]

## Goal
[Single sentence describing concrete, measurable outcome]

## Constraints
- Do not modify unrelated code
- Keep changes minimal and focused
- Avoid [specific thing to avoid]

## Steps
1. [Specific action with file names if known]
2. [Measurable step with clear outcome]
3. [Another concrete action]
4. [Final verification step]

## Done When
- [Binary condition that can be tested]
- [UI behavior that can be verified]
- [Test outcome that proves success]

GUIDELINES
==========
❌ Avoid: optimize, improve, enhance, refactor, etc.
✅ Use: add, create, remove, update, fix, implement

❌ Avoid: "Make it better", "Clean up code"
✅ Use: "Add logout button", "Fix memory leak in UserService"

❌ Avoid: "Should work well", "Looks good"
✅ Use: "Tests pass", "Button appears in nav", "API returns 200"
```

## Integration Points

### Existing Toolkit Integration
- **Works with `/status`**: Shows planning recommendations
- **Connects to `/review`**: Reviews plans before execution
- **Links to `/commit`**: Standard workflow after implementation
- **Uses `/handoff`**: Transfers context between planning and execution

### Quality System Integration
- **Automatic linting**: Every plan validated on creation
- **Schema enforcement**: Consistent plan structure across projects
- **Warning system**: Highlights potential issues before execution

### Multi-Project Support
- **Git repo detection**: Automatic project identification
- **Isolated planning**: Each project has separate plan files
- **Feature branching**: Support for concurrent feature development
- **Context separation**: Plans don't interfere across projects

## Example Workflows

### Example 1: Simple Feature Planning
```
User: /plan "Add dark mode toggle"

PLAN ANALYSIS
=============
Task: "Add dark mode toggle"
Complexity: Medium (UI + state management)
Scope: Component creation + theme system

CLARIFICATION
=============
This looks like a well-defined UI feature. I'll create a plan for:
- Toggle component in navigation
- Theme state management
- CSS variable system for dark/light modes
- Local storage persistence

PLAN CREATION
=============
Creating plan at .ai/claude-code-toolkit-plan.md...

# Plan: Add Dark Mode Toggle

## Goal
Add a toggle switch in the navigation bar that switches between light and dark themes with state persistence.

## Constraints
- Do not modify existing color schemes in components
- Keep toggle simple without animations initially
- Avoid theme system refactoring beyond what's needed

## Steps
1. Create DarkModeToggle component in components/DarkModeToggle.tsx
2. Add useDarkMode hook for theme state management
3. Create CSS variables for light/dark theme colors
4. Add toggle to Navigation component
5. Implement localStorage persistence for theme preference
6. Update existing components to use CSS variables
7. Add basic toggle functionality test

## Done When
- Toggle switch appears in navigation bar
- Clicking toggle switches between light and dark themes
- Theme preference persists across browser sessions
- All existing functionality works in both themes
- Tests pass

✅ Plan created and validated
✅ Ready for execution

NEXT STEPS
==========
Execute with: /clear → "Read .ai/claude-code-toolkit-plan.md and implement exactly"
```

### Example 2: Complex Feature Planning
```
User: /plan "Implement real-time collaboration" --feature=collab

PLAN ANALYSIS
=============
Task: "Implement real-time collaboration"
Complexity: High (WebSockets + conflict resolution)
Scope: Real-time system architecture

CLARIFICATION NEEDED
====================
This is a complex feature that needs more definition:

1. What type of collaboration?
   a) Document editing (Google Docs style)
   b) Code editing (VS Code Live Share style)
   c) Design collaboration (Figma style)
   d) Other type

2. How many concurrent users?
   a) 2-5 users (simple)
   b) 10-20 users (medium)
   c) 50+ users (complex)

3. Conflict resolution approach?
   a) Last write wins (simple)
   b) Operational transforms (complex)
   c) CRDT-based (advanced)

[User answers: a, a, b]

PLAN CREATION
=============
Creating detailed plan at .ai/claude-code-toolkit-collab-plan.md...

# Plan: Implement Real-Time Document Collaboration

## Goal
Enable 2-5 users to simultaneously edit documents with live cursor tracking and conflict resolution using operational transforms.

## Constraints
- Do not modify existing document storage format
- Keep WebSocket connection overhead minimal
- Avoid complex CRDT implementation for v1
- Do not implement user management beyond basic identification

## Steps
1. Create WebSocket server with Socket.io in server/collaboration.js
2. Implement operational transform library for text operations
3. Add real-time document synchronization service
4. Create collaborative editor component with live cursors
5. Implement conflict resolution with operational transforms
6. Add user presence indicators (online/offline status)
7. Create collaboration session management
8. Add basic tests for text synchronization
9. Implement connection recovery and offline handling

## Done When
- Multiple users can edit same document simultaneously
- Changes appear in real-time for all connected users
- Text conflicts resolve automatically without data loss
- User cursors and selections visible to other users
- Connection drops don't lose user changes
- All collaboration tests pass

✅ Plan created for complex feature
✅ Feature-specific file: .ai/claude-code-toolkit-collab-plan.md
✅ Ready for execution

EXECUTION RECOMMENDATION
========================
This is a complex plan. Consider:
1. Execute in phases (WebSocket setup → text sync → conflict resolution)
2. Test each phase before proceeding
3. Use /review between phases for validation

Execute with: /clear → "Read .ai/claude-code-toolkit-collab-plan.md and implement exactly"
```

### Example 3: Multi-Project Day
```
Morning - Claude Toolkit:
User: /plan "Add voice transcription support"
→ Creates .ai/claude-code-toolkit-plan.md

Afternoon - Switch to GoSera:
User: cd ~/gosera && /plan "Implement API rate limiting"
→ Creates .ai/gosera-plan.md

Evening - Back to Claude Toolkit:
User: cd ~/claude-code-toolkit && /plan "Refactor auth system" --feature=auth
→ Creates .ai/claude-code-toolkit-auth-plan.md

Result: 3 isolated plans, no interference, clear project separation
```

## Success Metrics

### Planning Quality
- **Plan completion rate**: % of plans that execute successfully
- **Revision frequency**: How often plans need changes during execution
- **Clarity score**: Feedback on plan specificity and actionability

### Workflow Efficiency
- **Context separation**: Clean handoff between planning and execution
- **Time savings**: Reduced back-and-forth during implementation
- **Error reduction**: Fewer mid-implementation scope changes

### Multi-Project Support
- **Project isolation**: Plans don't interfere across repositories
- **Context switching**: Smooth transitions between different projects
- **Feature parallelism**: Concurrent development streams

## Error Handling

### Vague Task Requests
```
User: /plan "Make the app better"

ANALYSIS ERROR
==============
Task too vague for effective planning.

SUGGESTION
==========
Try more specific requests like:
- "Add loading states to all buttons"
- "Implement user profile editing"
- "Fix memory leak in chat component"
- "Add pagination to user list"

Please provide a more specific task description.
```

### Missing Context
```
User: /plan "Fix the bug"

CLARIFICATION REQUIRED
======================
I need more details to create an effective plan:

1. What bug are you referring to?
2. What is the expected vs actual behavior?
3. Which component or feature is affected?
4. Are there error messages or logs?

Please provide specific details about the issue to plan the fix.
```

## Configuration Integration

**In .claude/settings.json:**
```json
{
  "plan_writer": {
    "enabled": true,
    "auto_lint": true,
    "ask_clarification": true,
    "default_template": "standard",
    "quality_threshold": 80
  }
}
```

---

*The Plan Writer skill transforms ad-hoc development requests into structured, executable plans that serve as clear contracts between planning and implementation phases.*