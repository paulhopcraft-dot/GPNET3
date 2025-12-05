#!/bin/bash
# =============================================================================
# AGENTIC HARNESS - SESSION END SCRIPT
# =============================================================================
# This script should be run at the END of every coding agent session.
# It helps verify the codebase is in a clean state.
#
# Based on Anthropic's research: "Effective Harnesses for Long-running Agents"
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "============================================================================="
echo "AGENTIC HARNESS - SESSION END CHECKLIST"
echo "============================================================================="
echo ""

# 1. Check for uncommitted changes
echo "1. UNCOMMITTED CHANGES"
CHANGES=$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null)
if [ -z "$CHANGES" ]; then
    echo "   OK: Working directory is clean"
else
    echo "   WARNING: Uncommitted changes detected:"
    echo "$CHANGES" | sed 's/^/   /'
    echo "   ACTION: Commit or stash these changes before ending session"
fi
echo ""

# 2. Run tests
echo "2. TEST STATUS"
echo "   Running tests..."
cd "$PROJECT_ROOT"
if npm run test --silent 2>/dev/null; then
    echo "   OK: Tests pass"
    TESTS_PASS="true"
else
    echo "   FAIL: Tests are failing"
    TESTS_PASS="false"
    echo "   ACTION: Fix failing tests before ending session"
fi
echo ""

# 3. Check build
echo "3. BUILD STATUS"
echo "   Running build check..."
if npm run build --silent 2>/dev/null; then
    echo "   OK: Build succeeds"
    BUILD_PASS="true"
else
    echo "   FAIL: Build is failing"
    BUILD_PASS="false"
    echo "   ACTION: Fix build errors before ending session"
fi
echo ""

# 4. Feature status
echo "4. FEATURE STATUS"
FEATURES_FILE="$SCRIPT_DIR/features.json"
if [ -f "$FEATURES_FILE" ]; then
    PASSING=$(jq '[.features[] | select(.passes == true)] | length' "$FEATURES_FILE" 2>/dev/null || echo '0')
    FAILING=$(jq '[.features[] | select(.passes == false)] | length' "$FEATURES_FILE" 2>/dev/null || echo '0')
    TOTAL=$(jq '.features | length' "$FEATURES_FILE" 2>/dev/null || echo '0')
    PCT=$(echo "scale=0; $PASSING * 100 / $TOTAL" | bc 2>/dev/null || echo '0')
    echo "   Passing: $PASSING / $TOTAL ($PCT%)"
    echo "   Remaining: $FAILING features"
fi
echo ""

# 5. Summary
echo "============================================================================="
echo "SESSION END SUMMARY"
echo "============================================================================="
echo "Working directory clean: $([ -z "$CHANGES" ] && echo 'YES' || echo 'NO')"
echo "Tests passing: $([ "$TESTS_PASS" = "true" ] && echo 'YES' || echo 'NO')"
echo "Build passing: $([ "$BUILD_PASS" = "true" ] && echo 'YES' || echo 'NO')"
echo ""
echo "REMINDER: Update .claude/harness/claude_progress.json with session summary"
echo "============================================================================="
