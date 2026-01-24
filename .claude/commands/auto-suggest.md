---
description: Autonomous suggestion agent - proactively recommends optimal commands after each task
---

# Auto-Suggest Agent

Continuously monitors task completion and proactively suggests the most optimal next commands, skills, and agents.

## Usage

```bash
/auto-suggest start     # Begin continuous monitoring
/auto-suggest stop      # Stop monitoring
/auto-suggest once      # Single analysis and suggestion
/auto-suggest config    # Configure suggestion preferences
```

## How It Works

The auto-suggest agent **runs automatically after every completed task** and performs comprehensive analysis:

### 🔍 **Post-Task Analysis**
1. **Git State Analysis** - Changes, branch status, commits
2. **File System Monitoring** - Modified files, new files, deletions
3. **Project State Assessment** - Features, PRDs, tests, dependencies
4. **Context Health Check** - Token usage, performance metrics
5. **Workflow Phase Detection** - What stage of development you're in
6. **Error Pattern Recognition** - Recent failures, warnings, issues

### 🎯 **Multi-Dimensional Evaluation**

#### **Available Tools Assessment**
```
Commands (52): Evaluates all slash commands for relevance
Skills (15+): Considers specialized skills like /ralph-loop, /voice
Agents (8+): Evaluates Task tool agents (Explore, Plan, Bash, etc.)
Integrations: GitHub, browser automation, external tools
```

#### **Optimization Scoring**
```python
def calculate_optimization_score(task_context):
    factors = {
        'time_efficiency': 0.3,      # How much time saved
        'accuracy_improvement': 0.25, # Better results
        'automation_potential': 0.2,  # Can automate repetitive work
        'learning_value': 0.15,       # Teaches better patterns
        'context_preservation': 0.1   # Saves mental overhead
    }
    return weighted_score(available_tools, factors)
```

## Suggestion Categories

### 🚀 **Immediate Next Steps**
```
High confidence, ready to execute immediately
Example: "Just committed changes → /verify to run tests"
```

### ⚡ **Workflow Optimization**
```
Medium-term efficiency improvements
Example: "Repetitive file operations → /smart-batch to optimize"
```

### 🤖 **Automation Opportunities**
```
Long-term automation suggestions
Example: "Complex feature work → /ralph-loop for overnight development"
```

### 🧠 **Strategic Recommendations**
```
Higher-level workflow improvements
Example: "Large codebase → /autonomous for systematic development"
```

## Advanced Intelligence Features

### **Pattern Learning**
```python
class SuggestionLearner:
    def __init__(self):
        self.user_patterns = {}
        self.success_history = {}
        self.context_preferences = {}

    def learn_from_usage(self, suggestion, user_action, outcome):
        # Track what suggestions user follows
        # Measure success rates
        # Adapt future recommendations

    def detect_workflow_patterns(self):
        # Identify user's preferred development flow
        # Suggest tools that fit their style
        # Recommend optimizations for their specific patterns
```

### **Context-Aware Suggestions**
```python
def analyze_development_context():
    context = {
        'project_type': detect_project_type(),     # React, Python, etc.
        'team_size': detect_collaboration_level(), # Solo vs team
        'urgency': detect_deadline_pressure(),     # Quick fix vs thorough
        'complexity': assess_task_complexity(),    # Simple vs complex
        'user_skill': infer_user_expertise()       # Beginner vs expert
    }
    return tailor_suggestions(context)
```

## Proactive Monitoring Examples

### **After Code Changes**
```
✅ Detected: 3 files modified in src/components/
🔍 Analysis: React components updated, no tests run yet
💡 Suggestions:
   1. /tdd - Run tests for modified components (High Priority)
   2. /verify - Full test suite validation
   3. /review - Code quality check
   4. /fast-path - Use Haiku for simple follow-up tasks

🎯 Recommended Action: /tdd (90% confidence)
Reasoning: Testing new component changes prevents bugs downstream
```

### **After Feature Completion**
```
✅ Detected: Feature branch completed, all tests passing
🔍 Analysis: Ready for integration, clean state
💡 Suggestions:
   1. /verify - Final validation before merge (High Priority)
   2. /review - Code review and quality check
   3. /smart-commit - Optimize commit message and cleanup
   4. /branch merge - Integrate with main branch
   5. /handoff - Document completion and save state

🎯 Recommended Workflow: /verify → /review → /smart-commit → /branch merge
Reasoning: Systematic quality assurance before integration
```

### **After Error Detection**
```
❌ Detected: Command failed, error in logs
🔍 Analysis: Git merge conflict, working directory dirty
💡 Emergency Suggestions:
   1. /recover - Automated problem diagnosis (Immediate)
   2. /resolve - AI-assisted merge conflict resolution
   3. /worktree - Isolate problem in separate workspace
   4. /think - Extended problem analysis if complex

🚨 Priority Action: /recover (95% confidence)
Reasoning: Automated diagnosis faster than manual troubleshooting
```

### **After Performance Issues**
```
⚠️ Detected: Context usage >70%, slow responses
🔍 Analysis: Token optimization needed, performance degraded
💡 Optimization Suggestions:
   1. /auto-optimize - Enable automatic optimization (Immediate)
   2. /fast-path - Route simple tasks to Haiku
   3. /context-monitor - Set up continuous monitoring
   4. /fresh - Reset context if critical threshold reached

🎯 Recommended: /auto-optimize + /context-monitor
Reasoning: Prevent performance degradation before it becomes critical
```

## Integration Points

### **Automatic Triggers**
```python
# Runs after every command completion
@post_task_hook
def auto_suggest_analysis():
    if auto_suggest_enabled():
        context = gather_full_context()
        suggestions = generate_intelligent_suggestions(context)
        display_proactive_recommendations(suggestions)

        if high_confidence_suggestion(suggestions[0]):
            prompt_immediate_action()
```

### **Smart Interruptions**
```python
# Only interrupt when high-value suggestions available
def should_interrupt_with_suggestion(suggestion):
    return (
        suggestion.confidence > 0.85 and
        suggestion.time_savings > 60  # seconds
        and not user_in_flow_state()
    )
```

## Configuration Options

### **Suggestion Aggressiveness**
```bash
/auto-suggest config --mode=conservative  # Only high-confidence suggestions
/auto-suggest config --mode=balanced     # Moderate suggestion frequency
/auto-suggest config --mode=aggressive   # All potential optimizations
```

### **Focus Areas**
```bash
/auto-suggest config --focus=performance  # Prioritize speed/efficiency
/auto-suggest config --focus=quality      # Prioritize code quality
/auto-suggest config --focus=automation   # Prioritize automation opportunities
/auto-suggest config --focus=learning     # Prioritize skill development
```

### **Timing Preferences**
```bash
/auto-suggest config --timing=immediate   # Suggest right after each task
/auto-suggest config --timing=batched     # Batch suggestions every 5 tasks
/auto-suggest config --timing=session     # Suggest at session boundaries
```

## Learning and Adaptation

### **Success Tracking**
- Monitors which suggestions you follow
- Measures outcome quality (faster completion, fewer errors)
- Adapts confidence scoring based on your preferences
- Learns your workflow patterns and tool preferences

### **Personal Optimization**
- Identifies tools you use most effectively
- Suggests advanced features you haven't discovered
- Recommends automation for your repetitive tasks
- Optimizes for your specific development style

## Expected Outcomes

### **Short-term Benefits**
- 🎯 Always know the optimal next step
- ⚡ Discover powerful tools you didn't know existed
- 🚀 Reduce decision fatigue and mental overhead
- 🔧 Catch optimization opportunities immediately

### **Long-term Benefits**
- 🧠 Develop better development workflow habits
- 🤖 Gradually automate repetitive aspects of coding
- 📈 Continuous improvement in tool utilization
- 🎨 Focus more on creative problem-solving, less on tool selection

**The auto-suggest agent ensures you always use the most optimal commands, making the full power of the 52+ command toolkit accessible and actionable.**