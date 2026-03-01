#!/usr/bin/env bash
set -e

# Plan linting script - enforces strict plan quality gates
# Usage: ./scripts/lint-plan.sh [plan-file]

# Auto-detect plan file if not provided
if [ -z "$1" ]; then
  # Get git repo name for auto-detection
  REPO_NAME=$(git rev-parse --show-toplevel 2>/dev/null | xargs basename 2>/dev/null || echo "unknown")

  # Try repo-specific plan first, then default
  if [ -f ".ai/${REPO_NAME}-plan.md" ]; then
    PLAN_FILE=".ai/${REPO_NAME}-plan.md"
  elif [ -f ".ai/plan.md" ]; then
    PLAN_FILE=".ai/plan.md"
  else
    echo "❌ No plan file found. Expected .ai/${REPO_NAME}-plan.md or .ai/plan.md"
    exit 1
  fi
else
  PLAN_FILE="$1"
fi

echo "🔍 Linting plan: $PLAN_FILE"

# Check if plan file exists
if [ ! -f "$PLAN_FILE" ]; then
  echo "❌ Plan file not found: $PLAN_FILE"
  exit 1
fi

# Required sections check
required_sections=("## Goal" "## Constraints" "## Steps" "## Done When")
for section in "${required_sections[@]}"; do
  if ! grep -q "^$section" "$PLAN_FILE"; then
    echo "❌ Missing required section: $section"
    exit 1
  fi
done

# Check for forbidden vague language
forbidden_words=("optimize" "improve" "refactor" "clean up" "enhance" "etc\." "better")
for word in "${forbidden_words[@]}"; do
  if grep -qi "$word" "$PLAN_FILE"; then
    echo "❌ Plan contains forbidden vague language: '$word'"
    echo "   Use specific, measurable language instead"
    exit 1
  fi
done

# Ensure steps are numbered
if ! grep -qE "^1\. " "$PLAN_FILE"; then
  echo "❌ Steps must be numbered starting with '1. '"
  exit 1
fi

# Check for proper title format
if ! grep -qE "^# Plan: " "$PLAN_FILE"; then
  echo "❌ Plan must have title in format: '# Plan: [Description]'"
  exit 1
fi

# Check goal is single line after "## Goal"
goal_lines=$(sed -n '/^## Goal$/,/^## /p' "$PLAN_FILE" | grep -v "^## " | grep -v "^$" | wc -l)
if [ "$goal_lines" -ne 1 ]; then
  echo "❌ Goal must be exactly one line (found $goal_lines lines)"
  exit 1
fi

# Check constraints start with "Do not" or contain explicit limitations
constraints_section=$(sed -n '/^## Constraints$/,/^## /p' "$PLAN_FILE" | grep -v "^## ")
if ! echo "$constraints_section" | grep -qi "do not\|don't\|keep.*minimal\|avoid"; then
  echo "❌ Constraints must include explicit 'do not' rules or limitations"
  exit 1
fi

# Check Done When criteria are testable (contain verifiable words)
done_section=$(sed -n '/^## Done When$/,/^## /p' "$PLAN_FILE" | grep -v "^## ")
verifiable_words=("test.*pass" "button.*appear" "feature.*work" "UI.*show" "redirect" "display" "function.*return" "API.*respond")
has_verifiable=false
for word in "${verifiable_words[@]}"; do
  if echo "$done_section" | grep -qi "$word"; then
    has_verifiable=true
    break
  fi
done

if [ "$has_verifiable" = false ]; then
  echo "⚠️  Warning: 'Done When' criteria should include testable outcomes"
  echo "   Examples: 'tests pass', 'button appears', 'feature works', 'UI shows X'"
fi

# Success message
echo "✅ Plan is valid and ready for execution"
echo "📝 Plan file: $PLAN_FILE"
echo "🎯 Ready to execute with: claude → 'Read $PLAN_FILE and implement exactly'"