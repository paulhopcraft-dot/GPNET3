# Context Monitor - Token Usage Tracking

## Purpose
Monitor current context size and optimize token usage in real-time.

## Usage
```bash
/context                    # Show current usage
/context --refresh         # Smart refresh with state preservation
/context --optimize        # Show optimization opportunities
```

## Implementation
Uses Task tool to spawn lightweight Haiku agent for context analysis:

### Context Size Estimation
```javascript
function estimateTokens(messages) {
  // Rough token estimation: ~4 chars per token
  const totalChars = messages.join('').length;
  return Math.ceil(totalChars / 4);
}
```

### Smart Refresh Strategy
```yaml
preserve_state:
  - current_project_path
  - active_todos
  - recent_file_changes
  - session_discoveries
  - optimization_settings
  - progress_tracking

refresh_triggers:
  - context_size > 85000
  - user_requests_refresh
  - before_complex_task
```

### Optimization Detection
```yaml
analyze_opportunities:
  - batching_potential: "3 git commands → /smart-commit"
  - fast_path_routing: "5 file reads → route to Haiku"
  - context_bloat: "Refresh recommended in 2 commands"
  - model_optimization: "Current task suitable for Haiku"
```

## Example Output
```bash
📊 Context Usage Analysis

Current Status:
├── Estimated tokens: 67,500 / 100,000 (67.5%)
├── Status: Healthy (refresh in ~8 commands)
├── Model: Sonnet (consider Haiku for simple tasks)
└── Session cost: ~$3.25

💡 Optimization Opportunities:
├── 🔄 3 pending git operations → use /smart-commit (-60% tokens)
├── ⚡ Next file read → route to Haiku (-85% cost)
├── 🧹 Context refresh optimal after current task
└── 📈 Session savings: 73% vs baseline

Commands:
├── /context --refresh    # Smart refresh now
├── /context --optimize   # Detailed optimization analysis
└── /smart-commit "msg"   # Batch git operations
```

## Integration
- Automatic monitoring of all commands
- Suggestion engine for optimization
- Seamless integration with model routing
- Real-time savings calculation