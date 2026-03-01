# Fast Path Router - Automatic Haiku Routing

## Purpose
Automatically route simple operations to Haiku for 85% cost savings on routine tasks.

## Usage
```bash
/fast-path on              # Enable automatic routing
/fast-path off             # Disable automatic routing
/fast-path status          # Show routing statistics
/fast-path analyze "cmd"   # Analyze if command should use fast path
```

## Auto-Routing Criteria

### ✅ Haiku Fast Path (85% cheaper)
```yaml
file_operations:
  - git status
  - git log
  - git diff
  - ls / dir commands
  - cat / head / tail (file reads)
  - grep / find searches
  - simple file edits (typos, comments)

status_checks:
  - npm list / pip list
  - test status (no execution)
  - server health checks
  - dependency version checks

simple_tasks:
  - documentation updates
  - comment additions
  - typo fixes
  - basic information requests
```

### ⚠️ Sonnet Standard Path
```yaml
development_tasks:
  - feature implementation
  - code refactoring
  - test writing
  - API development
  - UI/UX work

complex_operations:
  - deployment commands
  - database operations
  - multi-file changes
  - architecture modifications
```

### 🚨 Opus Complex Path
```yaml
architectural_decisions:
  - system design
  - technology choices
  - performance optimization
  - complex debugging
  - ambiguous requirements
```

## Implementation

### Command Interception
```javascript
function routeCommand(command) {
  const complexity = analyzeComplexity(command);

  if (complexity.isFastPath) {
    return { model: 'haiku', reasoning: complexity.reason };
  }

  if (complexity.isComplex) {
    return { model: 'opus', reasoning: complexity.reason };
  }

  return { model: 'sonnet', reasoning: 'balanced approach' };
}
```

### Transparency Features
```yaml
routing_notifications:
  - show_model_choice: true
  - show_reasoning: true
  - show_cost_savings: true
  - allow_override: true

example_output:
  "🚀 Fast Path: Using Haiku for file operation (-85% cost)"
  "💰 Saved $0.12 vs Sonnet on this command"
  "📊 Session savings: 73% so far"
```

## Safety Features

### Override Capability
```bash
# Force specific model if needed
/fast-path override sonnet "git status"
/fast-path override opus "simple task"
```

### Learning System
```yaml
track_performance:
  - command_success_rate
  - user_override_frequency
  - cost_savings_actual
  - user_satisfaction_signals

adapt_routing:
  - increase_haiku_usage_if_successful
  - reduce_haiku_usage_if_overrides_frequent
  - optimize_thresholds_based_on_data
```

## Expected Impact

### Cost Savings
```yaml
typical_session_breakdown:
  file_operations: 40%    # Route to Haiku → 85% savings
  development_tasks: 50%  # Keep on Sonnet
  complex_decisions: 10%  # Route to Opus when needed

overall_savings: 70-85%
session_cost_reduction: "$25 → $4-8 typical session"
```

### User Experience
```yaml
transparency:
  - "Always show which model and why"
  - "Display real-time savings"
  - "Allow easy overrides"
  - "Learn from user preferences"

performance:
  - "Faster responses for simple tasks (Haiku speed)"
  - "Better quality for complex tasks (Opus depth)"
  - "Optimal cost for all operations"
```

## Integration with Toolkit
- Works with existing model routing
- Enhances auto-model-simple.ps1
- Integrates with context monitoring
- Feeds data to analytics dashboard (future Ralph feature)