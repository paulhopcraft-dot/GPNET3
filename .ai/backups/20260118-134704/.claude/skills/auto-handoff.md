# Auto-Handoff at Context Threshold

Automatically trigger handoff when context usage reaches configurable threshold.

## Usage
```bash
/auto-handoff --enable           # Enable auto-handoff for session
/auto-handoff --threshold 70     # Set threshold to 70%
/auto-handoff --config          # View current settings
/auto-handoff --disable         # Disable auto-handoff
```

## How It Works

### 1. Context Monitoring
- Continuously tracks context usage as percentage
- Warns at warning threshold (default: 65%)
- Auto-triggers handoff at main threshold (default: 70%)

### 2. Smart Handoff Strategy
```yaml
auto_handoff:
  enabled: false                 # Enable automatic handoff
  threshold: 70                  # Context % to trigger handoff
  warning_threshold: 65          # Context % to show warning
  preserve_state: true           # Save state before handoff
  auto_reload: true              # Auto-reload in new session
```

### 3. State Preservation
Before handoff, automatically:
- Update `claude-progress.txt` with current session
- Commit any uncommitted work
- Save task context to structured memory
- Update features.json with progress
- Create handoff summary

### 4. Seamless Transition
After handoff:
- Clear context window
- Immediately run `/reload`
- Resume from saved state
- Show next recommended action

## Context Calculation

Uses token estimation based on:
- Conversation history length
- Code files read/referenced
- Memory context loaded
- Tool results accumulated

**Estimation Formula:**
```javascript
function estimateContextPercentage() {
    const factors = {
        messageCount: messages.length * 150,        // ~150 tokens per message
        codeContext: filesRead.length * 800,        // ~800 tokens per file
        toolResults: toolResults.length * 200,      // ~200 tokens per result
        memoryContext: memoryItems.length * 100     // ~100 tokens per memory
    };

    const estimatedTokens = Object.values(factors).reduce((a,b) => a+b, 0);
    const maxTokens = 200000; // Approximate context window

    return (estimatedTokens / maxTokens) * 100;
}
```

## Warning System

### 65% Warning (Yellow Zone)
```
⚠️  Context Usage: 65%
    Consider using /handoff or /clear soon
    Estimated tokens: 130K / 200K
```

### 70% Auto-Handoff (Red Zone)
```
🚨 Context Usage: 70% - AUTO-HANDOFF TRIGGERED

    Saving session state...
    ✅ Progress saved to claude-progress.txt
    ✅ Uncommitted work committed
    ✅ Memory updated

    Executing handoff... /handoff then /clear then /reload
```

## Configuration Options

### Global Settings (toolkit-config.yaml)
```yaml
# Auto-Handoff Settings
auto_handoff:
  enabled: false                 # Enable by default
  threshold: 70                  # Main threshold percentage
  warning_threshold: 65          # Warning threshold percentage
  preserve_uncommitted: true     # Commit work before handoff
  auto_reload: true              # Reload after handoff
  show_estimates: true           # Show token usage estimates
  emergency_threshold: 90        # Force handoff (safety)
```

### Per-Project Override
```yaml
# In project-specific config
projects:
  - name: gpnet3
    auto_handoff:
      threshold: 60              # Lower threshold for complex project
      preserve_todos: true       # Always save todo state
```

## Integration with Existing Systems

### Works With Smart Context
- Complements existing smart-context thresholds
- Uses same token monitoring infrastructure
- Coordinates with refresh/emergency thresholds

### Status Display Enhancement
All status commands now show:
```
Context Usage: 42% (Safe) | Next handoff: 70%
```

### Command Recommendations
Each response includes context awareness:
```
[Context: 45%] Next: /continue | /status | /handoff
```

## Benefits

✅ **Prevents Context Overflow** - Never hit context limits unexpectedly
✅ **Seamless Workflow** - Auto-handoff preserves all work
✅ **Customizable** - Set thresholds per project/preference
✅ **Proactive Management** - Warnings before problems occur
✅ **Zero Data Loss** - All progress preserved during transition

## Usage Examples

```bash
# Enable for current session with 70% threshold
/auto-handoff --enable --threshold 70

# Check current context usage
Context: 67% ⚠️  (Warning zone - consider handoff soon)

# Auto-handoff triggers at 70%:
🚨 AUTO-HANDOFF TRIGGERED
Session state preserved. Reloading...
[Context cleared and reloaded]
Ready to continue from: [last task]
```

## Always-On Mode

```bash
# Enable globally in toolkit-config.yaml
auto_handoff:
  enabled: true
  threshold: 70

# Or per-session
/auto-handoff --always-on
```

## Safety Features

- **Emergency Stop**: Hard stop at 90% if auto-handoff fails
- **State Validation**: Verify state saved before clearing
- **Rollback**: Can undo handoff if issues occur
- **Manual Override**: User can disable mid-session

Ready to integrate into toolkit with these settings!