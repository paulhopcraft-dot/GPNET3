# Context Optimizer - Real-Time Token Management

## Purpose
Monitor context usage and automatically optimize for token efficiency.

## Usage
```bash
/context-optimizer          # Show current status
/context-optimizer --refresh # Smart refresh with state preservation
/context-optimizer --analyze # Analyze optimization opportunities
```

## Features

### Real-Time Monitoring
```yaml
current_context:
  estimated_tokens: 67500
  percentage_full: 67.5%
  status: "healthy"
  projected_refresh: "in 3-4 commands"
```

### Smart Refresh Engine
```yaml
state_preservation:
  - project_context: "claude-code-toolkit"
  - active_todos: 3
  - recent_files: ["token-optimization.md", "smart-context.md"]
  - session_discoveries:
    - "Ralph system operational"
    - "Token optimization framework designed"
  - optimization_settings: "model routing active"
```

### Optimization Analytics
```yaml
session_efficiency:
  total_tokens_used: 145000
  model_distribution:
    haiku: "45% (65K tokens)"
    sonnet: "50% (72K tokens)"
    opus: "5% (8K tokens)"
  estimated_cost: "$4.25"
  savings_vs_all_sonnet: "$18.75 (82%)"

optimization_opportunities:
  - "12 git operations could use fast path (save 8K tokens)"
  - "5 file reads could batch together (save 3K tokens)"
  - "Context refresh in 2 commands will reset efficiently"
```

### Auto-Optimization Suggestions
```bash
💡 Optimization Opportunities:

1. BATCH OPERATIONS: Next 3 git commands → use /smart-commit
   Savings: ~9K tokens (60% reduction)

2. FAST PATH: File operations → auto-route to Haiku
   Savings: ~4K tokens per operation

3. CONTEXT REFRESH: Approaching 85K limit
   Optimal timing: After current task completion
```

## Integration with Existing Commands

### Automatic Integration
- Monitors all command token usage
- Suggests batching opportunities
- Auto-routes simple operations
- Tracks savings in real-time

### Manual Optimization
```bash
/context-optimizer --batch-next 3  # Batch next 3 operations
/context-optimizer --fast-path on  # Enable automatic fast routing
/context-optimizer --refresh-now   # Force smart refresh
```

## Expected Impact

### Token Usage Reduction
- **Context monitoring**: 10-15% reduction
- **Smart refresh timing**: 5-10% reduction
- **Operation batching**: 20-30% reduction on workflows
- **Fast path routing**: 15-25% reduction on simple ops

### Combined Savings: 35-50% additional optimization
Stacks with model routing for total 70-85% savings