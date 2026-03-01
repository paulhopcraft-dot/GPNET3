# Ralph Loop Command

## Metadata
```yaml
name: ralph-loop
description: Launch Ralph autonomous development loop v2.0
version: 2.0.0
category: ralph
requires_project: true
requires_validation: true
dangerous: false
```

## Purpose

Launches Ralph autonomous development system for overnight feature implementation.
Ralph executes user stories one by one with fresh Claude context per iteration,
verifying each implementation with browser automation.

**v2.0 Key Changes:**
- Outer harness verification (does not trust model self-reporting)
- Git operations handled by outer harness (deterministic commits)
- Direct spec injection (model doesn't need to read features.json)
- Token budget awareness
- New command-line flags for targeted execution

## Usage

```bash
/ralph-loop [options] [max_iterations]
```

**Options:**
- `--verify-only` - Run verification pass only (no implementation)
- `--story <id>` - Target specific story by ID
- `--reset` - Hard reset: revert Ralph commits, clear state
- `--dry-run` - Show what would execute without running
- `--max-iterations N` - Maximum iterations (default: 10)
- `--server URL` - Development server URL (default: http://localhost:3000)

**Legacy Arguments:**
- `max_iterations` (optional): Maximum iterations to run (default: 10)

## Prerequisites

### Required Before Execution:
1. **PRD Validation**: Must run `/prd-harden` first - Ralph checks for `.ralph-approved.json`
2. **Development Server**: Local dev server should be running (e.g., `npm run dev`)
3. **features.json**: Must exist with properly formatted user stories
4. **Git Repository**: Clean working directory (Ralph creates commits)

### Auto-Checked by Ralph:
- Browser testing dependencies (Puppeteer)
- Server connectivity at configured URL
- features.json format and content
- PRD approval file existence and age

## How Ralph v2.0 Works

### Execution Flow:
1. **Pre-flight Checks** - Validates all requirements
2. **Iteration Loop** - One user story per iteration:
   - Injects story JSON directly into prompt (no file reading needed)
   - Spawns fresh Claude context
   - Claude implements the story functionality
   - **Outer harness runs independent verification** (critical change)
   - Outer harness commits if verification passes
   - Outer harness updates features.json
3. **Final Report** - Generates execution summary

### Key v2.0 Architecture:

**Inner Harness (Claude):**
- Implements the story
- Runs browser verification for feedback
- Says "RALPH DONE" when complete
- Does NOT commit (outer harness does this)
- Does NOT update features.json (outer harness does this)

**Outer Harness (ralph.sh):**
- Injects story JSON into prompt
- Spawns Claude with fresh context
- Runs independent verification after Claude claims done
- Only commits if verification passes
- Updates features.json status
- Handles git operations deterministically

### Browser Verification:
Ralph uses the dev-browser skill to verify implementations:
```bash
# Element verification
browser_verify: exists #login-form

# Text content verification
browser_verify: text-contains .error-message 'Invalid email'

# Navigation verification
browser_verify: url-contains '/dashboard'

# Form interaction verification
browser_verify: fill #email-input 'test@example.com'
browser_verify: click #submit-button
```

## New Command-Line Flags

### Verification-Only Mode
```bash
/ralph-loop --verify-only
```
Runs verification pass on existing implementations without spawning Claude.
Useful for re-checking after manual fixes.

### Target Specific Story
```bash
/ralph-loop --story auth-01
```
Works on a single story by ID. Useful for retrying failed stories.

### Hard Reset
```bash
/ralph-loop --reset
```
Reverts all Ralph commits, clears state files, resets story statuses.
Interactive confirmation required.

### Dry Run
```bash
/ralph-loop --dry-run
```
Shows execution plan without running. Useful for debugging.

## Safety Features

### Validation Gates:
- **No PRD approval** → Ralph refuses to execute
- **No features.json** → Guides to run `/prd-generator`
- **Server unreachable** → Warns about dev server status
- **Dependencies missing** → Attempts installation or fails safely

### Execution Safety:
- **Fresh context per iteration** - Prevents state accumulation
- **One story per iteration** - Maintains focus and determinism
- **Independent verification** - Outer harness verifies, not model self-report
- **Deterministic commits** - Outer harness handles git with consistent messages
- **Token budget awareness** - Model instructed to stay within limits

### Error Handling:
- **Loud failures** - Clear error messages and debugging info
- **Verification before commit** - No commit unless tests pass
- **Detailed logging** - All actions logged to `ralph/progress.txt`
- **Safe exit** - Graceful shutdown on unrecoverable errors

## Output Files

### Generated by Ralph:
- **`ralph/progress.txt`** - Detailed execution log
- **Git commits** - Format: `feat(ralph): <story-id> - <description>`
- **Screenshots** - Debug images (as needed)

### Updated by Ralph:
- **`features.json`** - User story completion status (by outer harness)

## Configuration

### Default Settings:
```json
"ralphConfig": {
  "maxIterations": 10,
  "serverUrl": "http://localhost:3000",
  "browserTimeout": 30000,
  "rollbackOnFailure": true,
  "commitEachStory": true
}
```

### Override via Command Line:
```bash
/ralph-loop --max-iterations 20 --server http://localhost:8080
```

## Examples

### Basic Usage:
```bash
# Run with defaults (max 10 iterations)
/ralph-loop

# Run with custom max iterations
/ralph-loop 5
```

### Typical Workflow:
```bash
# 1. Generate PRD
/prd-generator "Add shopping cart functionality"

# 2. Validate PRD (mandatory)
/prd-harden

# 3. Start development server
npm run dev

# 4. Launch Ralph overnight
/ralph-loop
```

### Targeted Execution:
```bash
# Work on specific story only
/ralph-loop --story cart-01

# Verify existing work
/ralph-loop --verify-only

# Preview without executing
/ralph-loop --dry-run
```

### Recovery:
```bash
# Something went wrong - hard reset
/ralph-loop --reset

# Then restart fresh
/prd-harden
/ralph-loop
```

### Morning Review:
```bash
# Check execution results
cat ralph/progress.txt

# Review git history
git log --oneline | grep "feat(ralph)"

# See remaining work
jq '.features[]?.userStories[]? | select(.passes==false)' features.json
```

## Success Scenarios

### Complete Success:
```
[Ralph SUCCESS] ALL USER STORIES COMPLETE!
Feature implementation finished successfully.

Final Report:
- Stories Completed: 8/8
- All browser verifications passed (by outer harness)
```

### Partial Completion:
```
[Ralph WARNING] Execution stopped with 2 stories remaining
Check progress.txt for details on completed/failed stories.

Next Steps:
1. Review failed stories in features.json
2. Check browser verification issues
3. Run /ralph-loop --story <id> to retry specific story
4. Or use --verify-only to re-check existing implementations
```

## Error Scenarios

### Common Errors and Solutions:

**"PRD not approved for Ralph execution"**
```bash
# Solution: Run PRD hardening first
/prd-harden
```

**"features.json not found"**
```bash
# Solution: Create PRD first
/prd-generator "Your feature description"
```

**"Cannot reach development server"**
```bash
# Solution: Start your dev server
npm run dev
```

**"Verification failed"**
```bash
# The outer harness rejected the model's implementation
# Check ralph/progress.txt for which criteria failed
# Use --story to retry that specific story
/ralph-loop --story <failed-story-id>
```

## Integration with Toolkit

### Related Commands:
- **`/prd-generator`** - Create initial PRD
- **`/prd-harden`** - Validate PRD (required before Ralph)
- **`/status`** - Check project status and Ralph results
- **`/review`** - Review Ralph's implementations
- **`/continue`** - Continue incomplete Ralph work manually

## Best Practices

### For Optimal Results:
1. **Start with simple stories** - Test Ralph on basic functionality first
2. **Ensure dev server stability** - Reliable server improves success rate
3. **Use specific selectors** - Clear element IDs/classes work better
4. **Test acceptance criteria manually** - Verify they work before Ralph runs
5. **Keep stories atomic** - 30 minutes or less per story

### Monitoring Guidelines:
- Use `tail -f ralph/progress.txt` to monitor in real-time
- Check `--dry-run` before long executions
- Use `--verify-only` to re-check without re-implementing
- Use `--story` for targeted retries instead of full runs

This command launches the full Ralph autonomous development experience,
turning validated PRDs into working features through overnight execution.
