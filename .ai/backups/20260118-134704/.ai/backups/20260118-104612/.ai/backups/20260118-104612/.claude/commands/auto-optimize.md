# Auto-Optimize - Always-On Token Optimization

## Purpose
Enable transparent, always-on optimization that automatically routes all tasks to optimal models for maximum cost savings.

## Usage
```bash
/auto-optimize on       # Enable always-on optimization
/auto-optimize off      # Disable always-on optimization
/auto-optimize status   # Show current optimization state
/auto-optimize config   # Configure optimization settings
```

## How It Works

### Transparent Operation
- **Intercepts all commands** before execution
- **Analyzes task complexity** automatically
- **Routes to optimal model** (Haiku/Sonnet/Opus)
- **Shows routing decision** with savings info
- **Executes task** with chosen model

### Smart Routing Logic
```yaml
routing_strategy:
  complexity_analysis:
    - parse_task_description
    - calculate_complexity_score
    - determine_optimal_model

  routing_decision:
    - 0-6 points: Haiku (93% savings)
    - 7-20 points: Sonnet (baseline)
    - 21+ points: Opus (higher cost, necessary quality)

  execution:
    - spawn_task_with_optimal_model
    - show_routing_feedback
    - track_savings_metrics
```

### Override Mechanisms
```bash
# Force specific model when needed:
"your task --haiku"     # Force Haiku
"your task --sonnet"    # Force Sonnet
"your task --opus"      # Force Opus

# Temporary disable:
/auto-optimize pause    # Pause for next command only
```

## Implementation

### Command Interception
```javascript
function interceptCommand(userInput) {
  if (autoOptimizeEnabled) {
    const complexity = analyzeComplexity(userInput);
    const optimalModel = selectModel(complexity);

    // Show routing decision
    console.log(`🚀 Auto-optimized: Using ${optimalModel.toUpperCase()}`);
    console.log(`💰 Estimated savings: ${calculateSavings(optimalModel)}%`);

    // Execute with optimal model
    return executeWithModel(userInput, optimalModel);
  }

  return executeNormally(userInput);
}
```

### Savings Tracking
```yaml
session_tracking:
  total_commands: 25
  optimized_routing: 23 (92% auto-routed)
  manual_overrides: 2 (8% user-forced)

  model_distribution:
    haiku: 15 commands (60%) - saved $12.30
    sonnet: 7 commands (28%) - baseline
    opus: 3 commands (12%) - necessary cost +$2.10

  session_savings: 73% vs all-sonnet baseline
```

## Configuration Options

### Optimization Levels
```yaml
conservative_mode:
  haiku_threshold: 4      # More cautious routing
  safety_checks: enabled
  show_all_decisions: true

balanced_mode:         # Default
  haiku_threshold: 6
  safety_checks: enabled
  show_major_decisions: true

aggressive_mode:
  haiku_threshold: 8      # Route more tasks to Haiku
  safety_checks: minimal
  show_savings_only: true
```

### User Preferences
```yaml
feedback_settings:
  show_routing_decisions: true
  show_savings_amounts: true
  show_confidence_levels: false

override_settings:
  allow_model_suffixes: true     # --opus, --haiku, --sonnet
  allow_pause_command: true      # /auto-optimize pause
  remember_overrides: false      # Don't learn from manual overrides
```

## Safety Features

### Quality Safeguards
- **High-stakes tasks** automatically suggest Opus
- **Manual override** always available
- **Learning disabled** for overrides (respects user choice)
- **Rollback capability** if optimization causes issues

### Transparency Controls
```bash
# See what's happening:
/auto-optimize explain    # Show last 10 routing decisions
/auto-optimize stats      # Session optimization statistics
/auto-optimize history    # Recent routing accuracy
```

## Expected Impact

### User Experience
```yaml
before_always_on:
  workflow: "Think about model → Run auto-model script → Use recommendation"
  friction: "3 steps per task"
  adoption: "Requires discipline"

after_always_on:
  workflow: "Just use Claude normally"
  friction: "Zero additional steps"
  adoption: "100% automatic"
```

### Cost Savings
```yaml
optimization_coverage:
  without_always_on: "30-50% of tasks optimized"
  with_always_on: "95%+ of tasks optimized"

savings_improvement:
  session_coverage: "50% → 95% tasks optimized"
  total_savings: "40% → 78% cost reduction"
  user_effort: "High → Zero"
```

## Implementation Priority

### Phase 1: Core Always-On (30 minutes)
- Command interception system
- Automatic routing logic
- Basic feedback display
- Override mechanisms

### Phase 2: Advanced Features (60 minutes)
- Configuration options
- Detailed analytics
- Learning and adaptation
- Integration with dashboard

### Phase 3: Polish (30 minutes)
- Error handling
- Edge case management
- User experience optimization
- Documentation updates

## Integration

### Existing System Compatibility
- **Works with current optimization**: Enhances existing tools
- **Preserves manual control**: All current commands still work
- **Dashboard integration**: Feeds data to performance monitoring
- **Cross-project deployment**: Available in all 7 projects

### Command Compatibility
```bash
# All existing commands enhanced:
/build-feature    → Auto-optimized execution
/review           → Auto-optimized execution
/ralph-loop       → Auto-optimized execution
/any-command      → Auto-optimized execution

# New optimization commands:
/auto-optimize on/off/status/config
/fast-path        → Enhanced with always-on
/context-monitor  → Shows auto-optimization metrics
```

## Success Metrics

### Adoption
- **Usage rate**: 95%+ of commands auto-optimized
- **Override rate**: <10% manual model selection
- **User satisfaction**: Transparent operation

### Performance
- **Cost savings**: 75-85% vs baseline
- **Routing accuracy**: 95%+ correct model selection
- **Response speed**: No noticeable delay from optimization

### Business Impact
- **Effort reduction**: Zero manual optimization steps
- **Savings maximization**: 95%+ command coverage
- **User adoption**: Frictionless optimization experience

This makes optimization **completely transparent and automatic** while preserving user control when needed.