# Auto Model Selection

Automatically route tasks to optimal models based on complexity analysis.

## Usage
```bash
/auto-model "Your task description"
```

## How It Works
1. **Complexity Analysis** - Scores task across multiple dimensions
2. **Model Selection** - Routes to Sonnet/Opus/Haiku based on score
3. **Automatic Execution** - Spawns appropriate model agent
4. **Result Integration** - Returns output seamlessly

## Complexity Scoring

### 🔴 **High Complexity (Opus 4.5)**
- Architectural decisions
- Library/framework choices
- Complex debugging (>30min)
- Ambiguous requirements
- Performance optimization trade-offs
- "Should we use X or Y" questions

**Examples:**
- "Design authentication system architecture"
- "Debug performance issues in production"
- "Choose between Redis vs PostgreSQL for caching"

### 🟡 **Medium Complexity (Sonnet 4)**
- Feature implementation
- CRUD operations
- API endpoint creation
- Test writing
- Refactoring existing code
- UI/UX development

**Examples:**
- "Add user registration endpoint"
- "Create dashboard component"
- "Write tests for payment system"

### 🟢 **Low Complexity (Haiku)**
- File operations
- Simple status checks
- Documentation updates
- Quick fixes
- Basic information requests

**Examples:**
- "Check git status"
- "Update README"
- "Fix typo in comments"

## Implementation

**Complexity Dimensions:**
1. **Decision Weight** (0-10) - How many choices involved?
2. **Technical Depth** (0-10) - How deep is the technical knowledge required?
3. **Scope Impact** (0-10) - How many files/systems affected?
4. **Ambiguity Level** (0-10) - How unclear are the requirements?
5. **Time Estimation** (0-10) - How long will this take?

**Scoring:**
- **0-20 points**: Haiku (Fast & Cheap)
- **21-35 points**: Sonnet (Balanced)
- **36-50 points**: Opus (Deep Thinking)

## Auto-Routing Logic

```javascript
function analyzeComplexity(task) {
    const scores = {
        decision: scoreDecisionComplexity(task),
        technical: scoreTechnicalDepth(task),
        scope: scoreScopeImpact(task),
        ambiguity: scoreAmbiguity(task),
        time: scoreTimeEstimate(task)
    };

    const total = Object.values(scores).reduce((a,b) => a+b, 0);

    if (total <= 20) return 'haiku';
    if (total <= 35) return 'sonnet';
    return 'opus';
}
```

## Benefits

✅ **Optimal Resource Usage** - Right model for right task
✅ **Cost Efficiency** - Use Haiku for simple tasks
✅ **Quality Assurance** - Use Opus for complex decisions
✅ **Speed Optimization** - Fast routing for urgent tasks
✅ **Transparent Process** - Shows why each model was chosen

## Example Workflow

```bash
User: "/auto-model Design a scalable microservices architecture"

Auto-Model Analysis:
├── Decision Weight: 9/10 (many architectural choices)
├── Technical Depth: 8/10 (deep systems knowledge needed)
├── Scope Impact: 9/10 (affects entire system)
├── Ambiguity: 7/10 (requirements need interpretation)
└── Time Estimate: 8/10 (multi-hour task)

Total Score: 41/50 → OPUS 4.5 Selected

Spawning Opus agent for architecture design...
```

## Integration with Existing Commands

All toolkit commands can be prefixed with auto-routing:
- `/auto-model /eval` - Auto-select model for evaluation
- `/auto-model /review` - Auto-select model for code review
- `/auto-model /ralph-loop` - Auto-select model for Ralph execution

## Always-On Mode

Optional persistent mode that intercepts ALL commands:
```bash
/auto-model --always-on   # Enable for session
/auto-model --configure   # Set complexity thresholds
/auto-model --status      # Show current routing stats
```