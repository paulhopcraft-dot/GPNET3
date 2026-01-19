# Smart Context Management
**Target: 15-25% additional token savings**

## Purpose
Intelligent context lifecycle management to prevent bloat and optimize token usage.

## Implementation

### 1. Context Size Monitoring
```yaml
context_thresholds:
  warning: 75000    # Warn at 75K tokens
  refresh: 85000    # Auto-refresh at 85K tokens
  emergency: 95000  # Force refresh at 95K tokens
```

### 2. Smart Refresh Strategy
```bash
# Preserve critical state during refresh:
- Current project context
- Active todo lists
- Recent file changes
- Important discoveries
- Session goals
```

### 3. Scoped Operation Router
```yaml
fast_path_operations:  # Skip orchestrator (Haiku-friendly)
  - git status
  - git log
  - git diff
  - file reads (cat, head, tail)
  - search operations (grep, find)
  - test status checks
  - npm list / pip list
  - simple informational commands

orchestrated_operations:  # Apply full governance
  - code writing/editing
  - file creation/deletion
  - feature implementation
  - architecture changes
  - dependency installation
  - deployment operations
```

### 4. Batched Workflow Engine
```yaml
common_workflows:
  git_workflow:
    - git add .
    - git commit -m "message"
    - git push
    - run tests
    batch_as: "/commit message"

  feature_workflow:
    - read requirements
    - write tests
    - implement feature
    - verify tests pass
    - update documentation
    batch_as: "/build-feature"

  deploy_workflow:
    - run tests
    - build project
    - check deployment health
    - deploy to staging
    - verify deployment
    batch_as: "/deploy staging"
```

## Usage

### Automatic Context Management
```bash
# Monitors context size automatically
# Suggests refresh when approaching limits
# Preserves state during refresh
```

### Fast Path Routing
```bash
# These commands auto-route to Haiku fast path:
git status              # Skip orchestrator
ls src/                # Skip orchestrator
grep -r "function"     # Skip orchestrator

# These commands use full orchestrator:
edit src/app.js        # Apply governance
create new-feature.js  # Apply governance
```

### Batched Operations
```bash
# Instead of multiple commands:
/smart-commit "feat: add user auth"
# Automatically: git add + commit + push + test

/smart-deploy "staging"
# Automatically: test + build + deploy + verify
```

## Expected Savings

### Context Optimization: 15-20%
- Prevent context bloat
- Smart refresh timing
- State preservation efficiency

### Fast Path Routing: 5-10%
- Skip orchestrator for simple ops
- Route to Haiku for file operations
- Batch related commands

### Combined Impact: 20-30% additional savings
- Stacks with model routing savings
- Compounds across entire workflow