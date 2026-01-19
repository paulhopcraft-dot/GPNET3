# Evaluation Check

Run 3-layer evaluation check for current module or specified project.

## Quick Start

```bash
/eval                    # Evaluate current project
/eval gomemory          # Evaluate specific project
/eval --all             # Evaluate all ecosystem projects
```

## What It Does

Runs the 3-layer evaluation framework from `eval-framework.md`:

**Layer 1: Component Metrics**
- Runs test suite
- Counts passing/failing tests
- Checks for performance baselines
- Identifies missing tests

**Layer 2: Integration Metrics**
- Checks for integration tests
- Verifies cross-module contracts
- Checks audit trail implementation
- Validates multi-tenant isolation

**Layer 3: Business Metrics**
- Checks if business metrics are defined
- Looks for cost tracking
- Checks for performance monitoring
- Validates success criteria

## Usage

### Basic Evaluation
```bash
/eval
```

Evaluates the current project directory.

### Specific Project
```bash
/eval gpnet3
/eval gomemory
/eval GoAgent
```

Evaluates a specific project from the registry.

### All Projects
```bash
/eval --all
```

Runs evaluation on all 7 ecosystem projects.

### Detailed Mode
```bash
/eval --detailed
/eval gomemory --detailed
```

Shows full breakdown with specific test failures and recommendations.

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVALUATION: GoMemory
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Layer 1: Component Metrics
✅ Tests: 78/87 passing (89.7%)
❌ Performance baselines: Not set
❌ Cost tracking: Not implemented
⚠️  Hallucination detection: Missing

Status: ⚠️ INCOMPLETE

Layer 2: Integration Metrics
❌ Integration tests: Not found
❌ Multi-tenant isolation: Not verified
⚠️  Audit trail: Partial (no persistence)
❌ Error recovery: Not tested

Status: ❌ CRITICAL GAPS

Layer 3: Business Metrics
❌ Success criteria: Not defined
❌ Cost per operation: Not tracked
❌ User satisfaction: Not measured
❌ Performance monitoring: Not implemented

Status: ❌ NOT MEASURED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERALL: ⚠️ NOT READY TO SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommendations:
1. Fix 8 failing tests (CRITICAL)
2. Set performance baselines for recall operations
3. Implement cost tracking per tenant
4. Add integration test suite
5. Define business success metrics

Blockers:
- 8 test failures must be resolved
- No integration tests (Layer 2 completely missing)
- No business metrics (cannot measure success)

Next Steps:
- Run: cd gomemory && pytest -v (to see test failures)
- Create: test/integration/ folder with cross-module tests
- Define: What success looks like for this module
```

## Instructions

When `/eval` is invoked:

### Step 1: Determine Target Project

1. If argument provided (e.g., `/eval gomemory`):
   - Look up project in `toolkit-config.yaml` projects registry
   - Use that project's path

2. If `--all` flag:
   - Evaluate all projects from registry
   - Show summary table at end

3. If no argument:
   - Use current working directory
   - Detect project type (node/python) from files

### Step 2: Run Layer 1 Evaluation (Component)

**For Node.js projects:**
```bash
cd <project-path>
npm test 2>&1
```

**For Python projects:**
```bash
cd <project-path>
.venv\Scripts\activate
pytest --tb=short 2>&1
```

Parse output to extract:
- Total tests
- Passing tests
- Failing tests
- Test coverage % (if available)

**Check for baselines:**
- Look for `metrics.json`, `baselines.json`, or `.metrics/` folder
- Check if latency, accuracy, or cost are tracked

**Check for cost tracking:**
- Search for "cost", "price", "usage" tracking in codebase
- Look for Anthropic API usage tracking
- Check for database/storage cost monitoring

### Step 3: Run Layer 2 Evaluation (Integration)

**Check for integration tests:**
- Look for `test/integration/` or `tests/integration/` folder
- Look for files named `*integration*.test.*` or `*integration*.spec.*`
- Count integration test files found

**Check module boundaries:**
- Read `eval-framework.md` section for this project
- Look for specific integration requirements
- Examples:
  - GoMemory: Read-only access from GoAgent
  - GoControl: Audit persistence implemented
  - GoConnect vs GoMemory: Boundary documented

**Verify multi-tenant isolation:**
- Search codebase for "tenant_id", "tenantId", or "multi-tenant"
- Check if isolation is tested
- Look for tenant leakage tests

### Step 4: Run Layer 3 Evaluation (Business)

**Check for business metrics:**
- Look for `METRICS.md`, `KPI.md`, or `SUCCESS-CRITERIA.md`
- Search for "success criteria", "KPI", "business metrics"
- Check if metrics are defined in eval-framework.md for this project

**Check for monitoring:**
- Look for Prometheus, Datadog, or CloudWatch integration
- Check for logging of performance metrics
- Look for cost tracking dashboards

**Check for user feedback:**
- Look for CSAT, NPS, or user satisfaction tracking
- Check for feedback forms or surveys
- Look for usage analytics

### Step 5: Generate Report

**Status Indicators:**
- ✅ Passing: All criteria met
- ⚠️  Warning: Some criteria met, gaps exist
- ❌ Critical: Major gaps, not ready

**Overall Readiness:**
- ✅ READY TO SHIP: All 3 layers passing
- ⚠️  NEEDS WORK: Layer 1 passing, Layer 2-3 have gaps
- ❌ NOT READY: Layer 1 has failures or Layer 2 missing

**Recommendations:**
- Prioritized list of actions (CRITICAL → HIGH → MEDIUM → LOW)
- Specific next steps with commands to run
- Blockers that prevent shipping

### Step 6: Save Report (Optional)

If `--save` flag:
- Write report to `eval-reports/YYYY-MM-DD-<project>.md`
- Append summary to `eval-reports/index.md`

## Example Invocations

### Scenario 1: Quick Check Before Commit
```
User: /eval
Claude: [Runs tests, checks basics, shows quick summary]
Output: ✅ READY - All tests passing, baselines set
```

### Scenario 2: Pre-Deployment Review
```
User: /eval --detailed
Claude: [Full 3-layer evaluation with breakdown]
Output: ⚠️ NEEDS WORK - Tests pass, but no integration tests
```

### Scenario 3: Ecosystem Health Check
```
User: /eval --all
Claude: [Runs eval on all 7 projects]
Output: Summary table showing each project's Layer 1/2/3 status
```

## Integration with Other Commands

**Before `/verify`:**
- Run `/eval` to see what needs verification
- Fix any Layer 1 failures first

**Before `/review`:**
- Run `/eval` to check test coverage
- Ensure new code has tests

**Before commit:**
- Run `/eval` as sanity check
- All Layer 1 tests should pass

**With `/status`:**
- `/status` shows TODO progress
- `/eval` shows quality/readiness

## Edge Cases

**No tests found:**
```
❌ Layer 1: No test suite found
Recommendation: Add tests before evaluating
```

**Project not in registry:**
```
Project 'foo' not found in toolkit-config.yaml
Available: gpnet3, goconnect, govertical, GoAgent, gocontrol, gomemory, goassist3
```

**Test command fails:**
```
⚠️  Could not run tests: [error message]
Attempting fallback: npm run test:unit
```

## Dependencies

- `toolkit-config.yaml` - Project registry
- `eval-framework.md` - Evaluation specs per module
- Test runners: `npm test`, `pytest`
- PowerShell script: `eval.ps1` (handles automation)

## Notes

- This command is READ-ONLY (doesn't modify code or run builds)
- Fast execution (uses cached test results if recent)
- Can be run frequently without side effects
- Designed for quick feedback loop

$ARGUMENTS
