# /auto-model - Intelligent Model Routing

Automatically analyze task complexity and route to optimal Claude model.

## Usage
```bash
/auto-model "task description"
/auto-model --always-on
/auto-model --configure
/auto-model --status
```

## Implementation
Uses Task tool to spawn optimal model agent based on complexity analysis:
- **Haiku**: Simple tasks (0-20 complexity points)
- **Sonnet**: Balanced tasks (21-35 complexity points)
- **Opus**: Complex tasks (36-50 complexity points)

## Examples
```bash
/auto-model "Fix typo in README"           # → Haiku
/auto-model "Add user authentication"      # → Sonnet
/auto-model "Design system architecture"   # → Opus
```

## Complexity Scoring
- **Decision Weight**: How many choices involved?
- **Technical Depth**: Deep technical knowledge required?
- **Scope Impact**: How many files/systems affected?
- **Ambiguity Level**: How unclear are requirements?
- **Time Estimation**: How long will this take?

## Always-On Mode
When enabled, intercepts all commands and auto-routes to appropriate model.

## Integration
Works with all toolkit commands:
- `/auto-model /eval` - Auto-select for evaluation
- `/auto-model /ralph-loop` - Auto-select for Ralph
- `/auto-model /review` - Auto-select for code review