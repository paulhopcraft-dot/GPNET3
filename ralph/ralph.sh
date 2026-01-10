#!/bin/bash
set -e

# Ralph Autonomous Agent Loop v1.0
# Executes user stories autonomously with fresh Claude context per iteration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT" # Move to project root

# Configuration
MAX_ITERATIONS=${1:-10}
FEATURES_FILE="features.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"  # Use absolute path to ralph directory
PROMPT_FILE="$SCRIPT_DIR/prompt.md"      # Use absolute path to ralph directory
APPROVAL_FILE=".ralph-approved.json"
SERVER_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log() {
    echo -e "${BLUE}[Ralph]${NC} $1" | tee -a "$PROGRESS_FILE"
}

error() {
    echo -e "${RED}[Ralph ERROR]${NC} $1" | tee -a "$PROGRESS_FILE"
}

success() {
    echo -e "${GREEN}[Ralph SUCCESS]${NC} $1" | tee -a "$PROGRESS_FILE"
}

warning() {
    echo -e "${YELLOW}[Ralph WARNING]${NC} $1" | tee -a "$PROGRESS_FILE"
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."

    # Check for required dependencies
    command -v jq >/dev/null || {
        error "jq is required for JSON processing"
        error "Install with: sudo apt-get install jq (Linux) or brew install jq (macOS)"
        exit 1
    }

    # Check for Claude Code CLI availability
    if ! command -v claude >/dev/null; then
        error "Claude Code CLI not found in PATH"
        error "Make sure Claude Code is installed and accessible"
        exit 1
    fi

    # CRITICAL: Check for PRD approval
    if [ ! -f "$APPROVAL_FILE" ]; then
        error "PRD not approved for Ralph execution"
        error "Run '/prd-harden' to validate and approve your PRD first"
        error "Ralph refuses to execute without validated PRD"
        exit 1
    fi

    # Check PRD approval is recent (within 24 hours)
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        approval_age=$(( $(date +%s) - $(stat -f %m "$APPROVAL_FILE") ))
    else
        # Linux
        approval_age=$(( $(date +%s) - $(stat -c %Y "$APPROVAL_FILE") ))
    fi

    if [ $approval_age -gt 86400 ]; then
        warning "PRD approval is older than 24 hours"
        warning "Consider re-running '/prd-harden' to ensure PRD is still valid"
    fi

    # Check features.json exists and has user stories
    if [ ! -f "$FEATURES_FILE" ]; then
        error "features.json not found"
        error "Run '/prd-generator' to create your PRD first"
        exit 1
    fi

    local story_count=$(jq '[.features[]?.userStories[]? | select(.passes==false)] | length' "$FEATURES_FILE" 2>/dev/null || echo "0")
    if [ "$story_count" -eq 0 ]; then
        success "All user stories already complete!"
        log "No pending user stories found"
        exit 0
    fi

    log "Found $story_count incomplete user stories"

    # Check if dev server is running
    if command -v curl >/dev/null; then
        if curl -s --fail "$SERVER_URL" >/dev/null 2>&1; then
            success "Development server is running at $SERVER_URL"
        else
            warning "Cannot reach development server at $SERVER_URL"
            warning "Make sure your dev server is running before Ralph starts"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "Ralph execution cancelled by user"
                exit 0
            fi
        fi
    fi

    success "Pre-flight checks passed"
}

# Initialize Ralph execution
initialize_ralph() {
    log "Initializing Ralph autonomous execution..."

    # Create progress log
    cat > "$PROGRESS_FILE" << EOF
# Ralph Autonomous Execution Log
Started: $(date)
Max Iterations: $MAX_ITERATIONS
Server URL: $SERVER_URL

## Execution Summary
EOF

    # Verify browser testing capability
    if [ -f "skills/dev-browser/browser-test.js" ]; then
        log "Browser testing capability available"

        # Test browser installation
        if cd skills/dev-browser && npm list puppeteer >/dev/null 2>&1; then
            success "Puppeteer is installed and ready"
        else
            warning "Puppeteer not installed in dev-browser skill"
            warning "Ralph will attempt to install dependencies"

            log "Installing browser testing dependencies..."
            npm install || {
                error "Failed to install browser testing dependencies"
                exit 1
            }
            success "Browser testing dependencies installed"
        fi
        cd - > /dev/null
    else
        error "dev-browser skill not found"
        error "Browser verification will not be available"
        exit 1
    fi

    success "Ralph initialization complete"
}

# Get next incomplete user story
get_next_story() {
    local story=$(jq -r '[.features[]?.userStories[]? | select(.passes==false)] | first | "\(.id)|\(.story)"' "$FEATURES_FILE" 2>/dev/null)

    if [ "$story" = "null" ] || [ -z "$story" ]; then
        return 1
    fi

    echo "$story"
    return 0
}

# Execute single iteration
execute_iteration() {
    local iteration=$1
    local story_info="$2"
    local story_id=$(echo "$story_info" | cut -d'|' -f1)
    local story_text=$(echo "$story_info" | cut -d'|' -f2-)

    log "=== Iteration $iteration ==="
    log "Working on story: $story_id"
    log "Story: $story_text"

    # Create iteration-specific prompt
    cat > "$PROMPT_FILE" << EOF
# Ralph Autonomous Agent - Iteration $iteration

You are Ralph, an autonomous coding agent running in Claude Code toolkit.
You have ONE JOB: Complete the user story below and verify it works.

## Current User Story
ID: $story_id
Story: $story_text

## Your Process (MUST FOLLOW EXACTLY)

1. **Read the full user story** from features.json
2. **Implement the story** - write only the code needed for THIS story
3. **Verify with browser** - use dev-browser skill to check acceptance criteria
4. **Update features.json** - mark story as passes=true if all criteria pass
5. **Commit your work** - create descriptive commit message
6. **Exit** - do not continue to other stories

## Browser Verification Commands

Use the dev-browser skill for verification:
- Check element exists: \`node skills/dev-browser/browser-test.js exists $SERVER_URL "selector"\`
- Get element text: \`node skills/dev-browser/browser-test.js text $SERVER_URL "selector"\`
- Verify URL: \`node skills/dev-browser/browser-test.js url-contains $SERVER_URL "text"\`
- Take screenshot: \`node skills/dev-browser/browser-test.js screenshot $SERVER_URL debug.png\`

## Critical Rules

- **ONE STORY ONLY** - Do not work on multiple stories
- **VERIFY EVERYTHING** - All acceptance criteria must pass browser verification
- **COMMIT WHEN DONE** - Create commit with format "feat: \$story_description"
- **NO ASSUMPTIONS** - If something is unclear, make the simplest working implementation
- **FAIL FAST** - If you cannot complete the story, explain why and exit

## Rollback Procedure
If the story fails, use the rollback procedure from features.json to undo changes.

## Context
Project: $(basename "$(pwd)")
Iteration: $iteration/$MAX_ITERATIONS
Server: $SERVER_URL

START WORKING ON THE STORY NOW.
EOF

    # Execute with fresh Claude context using Task tool approach
    log "Spawning fresh Claude context for iteration $iteration..."

    # Create a temporary script that uses the existing toolkit's Skill system
    cat > "/tmp/ralph_iteration_${iteration}.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/../.." # Go to project root

# Use the existing Claude Code toolkit to execute with fresh context
# This ensures we get a clean context per iteration
claude "$(cat ralph/prompt.md)"
EOF

    chmod +x "/tmp/ralph_iteration_${iteration}.sh"

    # Execute the iteration
    if "/tmp/ralph_iteration_${iteration}.sh"; then
        success "Iteration $iteration completed"

        # Verify story was marked as complete
        local passes=$(jq -r ".features[]?.userStories[]? | select(.id==\"$story_id\") | .passes" "$FEATURES_FILE" 2>/dev/null)
        if [ "$passes" = "true" ]; then
            success "Story $story_id verified as complete"
            echo "- ✅ $story_id: $story_text" >> "$PROGRESS_FILE"
        else
            warning "Story $story_id not marked as complete"
            echo "- ⚠️ $story_id: $story_text (completion unclear)" >> "$PROGRESS_FILE"
        fi

        # Clean up temp script
        rm -f "/tmp/ralph_iteration_${iteration}.sh"

        return 0
    else
        error "Iteration $iteration failed"
        echo "- ❌ $story_id: $story_text (failed)" >> "$PROGRESS_FILE"

        # Clean up temp script
        rm -f "/tmp/ralph_iteration_${iteration}.sh"

        return 1
    fi
}

# Generate final report
generate_report() {
    local total_iterations=$1

    log "=== Ralph Execution Complete ==="

    # Count completed stories
    local completed=$(jq '[.features[]?.userStories[]? | select(.passes==true)] | length' "$FEATURES_FILE" 2>/dev/null || echo "0")
    local remaining=$(jq '[.features[]?.userStories[]? | select(.passes==false)] | length' "$FEATURES_FILE" 2>/dev/null || echo "0")

    cat >> "$PROGRESS_FILE" << EOF

## Final Report
Completed: $(date)
Total Iterations: $total_iterations
Stories Completed: $completed
Stories Remaining: $remaining

EOF

    if [ "$remaining" -eq 0 ]; then
        success "🎉 ALL USER STORIES COMPLETE!"
        success "Feature implementation finished successfully"
        cat >> "$PROGRESS_FILE" << EOF
## Status: SUCCESS ✅
All user stories have been implemented and verified.
Ralph autonomous execution completed successfully.

EOF
    else
        warning "⏸️ Execution stopped with $remaining stories remaining"
        warning "Check progress.txt for details on completed/failed stories"
        cat >> "$PROGRESS_FILE" << EOF
## Status: PARTIAL COMPLETION ⚠️
$remaining user stories remain incomplete.
Review failed iterations and continue manually if needed.

Next Steps:
1. Review failed stories in features.json
2. Check browser verification issues
3. Run /ralph-loop again to continue
4. Or implement remaining stories manually

EOF
    fi

    log "Full execution log saved to: $PROGRESS_FILE"
}

# Main execution loop
main() {
    log "🤖 Ralph Autonomous Agent Starting..."

    # Run pre-flight checks
    preflight_checks

    # Initialize Ralph
    initialize_ralph

    # Main iteration loop
    for ((i=1; i<=MAX_ITERATIONS; i++)); do
        # Get next story
        if ! story_info=$(get_next_story); then
            success "No more incomplete stories found"
            break
        fi

        # Execute iteration
        if ! execute_iteration "$i" "$story_info"; then
            error "Iteration $i failed - stopping execution"
            break
        fi

        # Brief pause between iterations
        sleep 2
    done

    # Generate final report
    generate_report "$i"

    if [ "$i" -gt "$MAX_ITERATIONS" ]; then
        warning "Reached maximum iterations ($MAX_ITERATIONS)"
        exit 1
    fi

    success "Ralph execution completed successfully"
    exit 0
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        cat << EOF
Ralph Autonomous Agent Loop

Usage: $0 [max_iterations]

Arguments:
  max_iterations    Maximum iterations to run (default: 10)

Requirements:
- PRD must be approved with /prd-harden
- features.json must exist with user stories
- Development server should be running
- Browser testing dependencies installed

Examples:
  $0              # Run with default 10 iterations
  $0 5            # Run maximum 5 iterations
  $0 --help       # Show this help

Ralph will:
1. Check PRD approval and prerequisites
2. Execute user stories one by one with fresh Claude context
3. Verify implementation with browser automation
4. Commit successful implementations
5. Generate execution report

For more information, see: README-ralph.md
EOF
        exit 0
        ;;
    *)
        # Run main execution
        main
        ;;
esac