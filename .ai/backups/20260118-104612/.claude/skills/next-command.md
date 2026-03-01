# Smart Next Command Recommendations

Intelligently recommend the most relevant slash command for each response based on project state and task context.

## Usage

Automatically active - no manual invocation needed. Each response includes:
```
[Context: 45%] Next: /continue | /status | /commit
```

Manual control:
```bash
/next-command --enable           # Enable recommendations
/next-command --disable          # Disable recommendations
/next-command --suggest          # Get recommendation now
/next-command --explain          # Show why command recommended
```

## Smart Recommendation Engine

### Context Analysis
Analyzes current state to recommend optimal next action:

```javascript
function recommendNextCommand(context) {
    const factors = {
        hasUncommittedChanges: git.status.hasChanges,
        testsModified: git.diff.includes('test'),
        featuresModified: git.diff.includes('feature'),
        hasFailingTests: testRunner.lastResult.failures > 0,
        contextUsage: context.percentage,
        sessionDuration: Date.now() - session.startTime,
        lastCommand: history.last,
        projectType: project.type,
        workingState: determineWorkingState()
    };

    return analyzeAndRecommend(factors);
}
```

### Recommendation Logic

**🔄 Development Flow**
- After code changes → `/review` then `/commit`
- After tests pass → `/continue` or `/status`
- Features complete → `/verify` then `/commit`

**🐛 Problem States**
- Tests failing → `/review` or `/tdd`
- Build broken → `/recover` or `/anticipate`
- Stuck >30min → `/decide` or `/think`

**📝 Project Management**
- Task complete → `/status` then next task
- Session ending → `/handoff`
- Need context → `/recall` or `/status`

**⚡ Context Management**
- Context >65% → `/handoff` recommended
- Context >80% → `/handoff` urgent
- After `/clear` → `/reload`

## Recommendation Categories

### 🚀 **Flow Commands** (Continue Momentum)
```yaml
continue_flow:
  - /continue      # Next logical task
  - /status        # Check progress
  - /autonomous    # Auto-work mode
  - /commit        # Save progress
```

### 🛠️ **Quality Commands** (Improve/Fix)
```yaml
quality_focus:
  - /review        # Code review
  - /test          # Run tests
  - /verify        # Verify features
  - /tdd           # Test-driven dev
```

### 🎯 **Planning Commands** (Decide Direction)
```yaml
planning_mode:
  - /decide        # Make decisions
  - /think         # Complex reasoning
  - /anticipate    # Risk analysis
  - /constraints   # Define limits
```

### 📋 **Management Commands** (Project Control)
```yaml
project_management:
  - /handoff       # End session
  - /recall        # Get context
  - /remember      # Save context
  - /branch        # Manage features
```

## State-Based Recommendations

### Fresh Start
```
Session State: New
Next: /status | /continue | /recall
Reasoning: Get oriented with project state
```

### Active Development
```
Session State: Coding
Last: Modified 3 files
Next: /review | /test | /commit
Reasoning: Verify changes before continuing
```

### Problem Solving
```
Session State: Debugging
Issue: Tests failing for 20 minutes
Next: /think | /recall similar-issues | /anticipate
Reasoning: Need deeper analysis approach
```

### Context Management
```
Session State: High Context (75%)
Next: /handoff | /clear | /remember
Reasoning: Context approaching limits
```

## Display Formats

### Compact (Default)
```
Next: /continue | /status | /commit
```

### Detailed Mode
```
📋 Recommended Next Actions:
├── 🚀 /continue (Resume development workflow)
├── 📊 /status (Check project health)
└── 💾 /commit (Save recent changes)
```

### Priority Mode
```
🎯 Primary: /commit (3 files changed)
🔄 Secondary: /test (verify changes)
📋 Later: /status (check progress)
```

## Configuration

### In toolkit-config.yaml
```yaml
# Next Command Recommendations
next_command:
  enabled: true                  # Show recommendations
  format: compact               # compact | detailed | priority
  max_suggestions: 3            # How many to show
  explain_reasoning: false      # Show why recommended
  context_aware: true           # Factor in context usage
  project_adaptive: true        # Adapt to project patterns
  learning_mode: true           # Learn from user choices

# Per-project customization
projects:
  - name: gpnet3
    next_command:
      prefer_quality: true       # Emphasize /review, /test
      development_style: tdd     # Suggest TDD workflow
```

## Learning Algorithm

Tracks user command patterns to improve recommendations:

```javascript
class CommandLearning {
    trackUsage(recommended, actual) {
        this.patterns.push({
            context: getCurrentContext(),
            recommended: recommended,
            chosen: actual,
            effectiveness: measureOutcome()
        });

        this.updateModel();
    }

    improveRecommendations() {
        // Learn user preferences
        // Adapt to project patterns
        // Weight successful outcomes
    }
}
```

## Integration Examples

### With Status Command
```bash
/status

PROJECT STATUS: gpnet3
[Context: 45%] ✅ Clean | 165/165 tests passing

Next: /continue | /add-feature | /handoff
```

### With Auto-Handoff
```bash
[Context: 68% ⚠️] Next: /handoff (recommended) | /continue (risky)
```

### With Error States
```bash
❌ 3 failing tests detected

Next: /review (fix tests) | /tdd (test-first) | /recover (reset)
```

## Benefits

✅ **Guided Workflow** - Always know what to do next
✅ **Context Awareness** - Recommendations match current state
✅ **Learning System** - Gets better over time
✅ **Flow Optimization** - Maintains momentum
✅ **Risk Prevention** - Warns about context/time issues

## Smart Patterns Detected

### Common Workflows
- **Feature Development**: `/continue` → `/review` → `/test` → `/commit` → `/status`
- **Debugging Session**: `/think` → `/recall` → `/test` → `/recover` → `/commit`
- **Session Transition**: `/status` → `/handoff` → `/clear` → `/reload` → `/continue`

### Context Patterns
- Morning start → `/morning-brief` then `/status`
- High context → `/handoff` or `/remember` + `/clear`
- Task complete → `/commit` then `/continue` or `/handoff`

Ready to integrate with automatic recommendations!