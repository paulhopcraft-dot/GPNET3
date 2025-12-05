#!/bin/bash
# =============================================================================
# AGENTIC HARNESS - INITIALIZATION SCRIPT
# =============================================================================
# This script should be run at the START of every coding agent session.
# It provides context about the current state of the project.
#
# Based on Anthropic's research: "Effective Harnesses for Long-running Agents"
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "============================================================================="
echo "AGENTIC HARNESS - SESSION INITIALIZATION"
echo "============================================================================="
echo ""

# 1. Verify working directory
echo "1. WORKING DIRECTORY"
echo "   Current: $(pwd)"
echo "   Project: $PROJECT_ROOT"
if [ "$(pwd)" != "$PROJECT_ROOT" ]; then
    echo "   WARNING: Not in project root! cd to $PROJECT_ROOT"
fi
echo ""

# 2. Git status
echo "2. GIT STATUS"
echo "   Branch: $(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo 'Not a git repo')"
echo "   Status:"
git -C "$PROJECT_ROOT" status --short 2>/dev/null || echo "   Unable to get git status"
echo ""

# 3. Recent commits
echo "3. RECENT COMMITS (last 5)"
git -C "$PROJECT_ROOT" log --oneline -5 2>/dev/null || echo "   Unable to get git log"
echo ""

# 4. Read progress file
echo "4. PROGRESS FILE"
PROGRESS_FILE="$SCRIPT_DIR/claude_progress.json"
if [ -f "$PROGRESS_FILE" ]; then
    echo "   Last updated: $(jq -r '.last_updated // "unknown"' "$PROGRESS_FILE" 2>/dev/null || echo 'unknown')"
    echo "   Tests passing: $(jq -r '.global_state.tests_passing // "unknown"' "$PROGRESS_FILE" 2>/dev/null || echo 'unknown')"
    echo "   Build passing: $(jq -r '.global_state.build_passing // "unknown"' "$PROGRESS_FILE" 2>/dev/null || echo 'unknown')"
    echo "   Last commit: $(jq -r '.global_state.last_successful_commit // "unknown"' "$PROGRESS_FILE" 2>/dev/null || echo 'unknown')"
else
    echo "   WARNING: Progress file not found at $PROGRESS_FILE"
fi
echo ""

# 5. Feature status
echo "5. FEATURE STATUS"
FEATURES_FILE="$SCRIPT_DIR/features.json"
if [ -f "$FEATURES_FILE" ]; then
    TOTAL=$(jq '.summary.total_features' "$FEATURES_FILE" 2>/dev/null || echo '?')
    PASSING=$(jq '.summary.passing' "$FEATURES_FILE" 2>/dev/null || echo '?')
    FAILING=$(jq '.summary.failing' "$FEATURES_FILE" 2>/dev/null || echo '?')
    PCT=$(jq '.summary.completion_percentage' "$FEATURES_FILE" 2>/dev/null || echo '?')
    echo "   Total: $TOTAL | Passing: $PASSING | Failing: $FAILING | Complete: $PCT%"
    echo ""
    echo "   Pending features (priority order):"
    jq -r '.features | sort_by(.priority) | .[] | select(.passes == false) | "   - [\(.id)] \(.name) (priority: \(.priority))"' "$FEATURES_FILE" 2>/dev/null || echo "   Unable to read features"
else
    echo "   WARNING: Features file not found at $FEATURES_FILE"
fi
echo ""

# 6. Quick environment check
echo "6. ENVIRONMENT CHECK"
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "   Node project detected"
    echo "   Node: $(node --version 2>/dev/null || echo 'not found')"
    echo "   npm: $(npm --version 2>/dev/null || echo 'not found')"
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        echo "   node_modules: exists"
    else
        echo "   node_modules: MISSING - run 'npm install'"
    fi
fi
echo ""

# 7. Instructions
echo "============================================================================="
echo "AGENT INSTRUCTIONS"
echo "============================================================================="
echo "1. Read .claude/harness/claude_progress.json for session history"
echo "2. Read .claude/harness/features.json for feature requirements"
echo "3. Work on ONE feature at a time, in priority order"
echo "4. Run tests BEFORE starting: npm run test"
echo "5. Commit frequently with clear messages"
echo "6. ONLY mark features as passes:true after verification"
echo "7. Update progress file before ending session"
echo "============================================================================="
