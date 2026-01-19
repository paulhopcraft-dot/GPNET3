#!/usr/bin/env bash
set -e

# AI Run Script - Main orchestrator for plan-based execution
# Usage: ./scripts/ai-run.sh [options]
#
# Options:
#   --plan=filename     Use specific plan file
#   --feature=name      Use feature-specific plan
#   --parallel          Enable parallel fan-out execution (if plan supports it)
#   --dry-run           Show what would be executed without running
#   --help              Show this help message

# Configuration
PLAN_FILE=""
FEATURE=""
PARALLEL=false
DRY_RUN=false

# Model optimization settings
PRIMARY_MODEL=""
PARALLEL_MODEL=""
FALLBACK_MODEL="haiku"
MAX_COST=""
ESTIMATED_TOKENS=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --plan=*)
      PLAN_FILE="${1#*=}"
      shift
      ;;
    --feature=*)
      FEATURE="${1#*=}"
      shift
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      echo "AI Run Script - Plan-based execution orchestrator"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --plan=filename     Use specific plan file"
      echo "  --feature=name      Use feature-specific plan"
      echo "  --parallel          Enable parallel fan-out execution"
      echo "  --dry-run           Show execution plan without running"
      echo "  --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                           # Auto-detect plan file"
      echo "  $0 --feature=auth            # Use auth feature plan"
      echo "  $0 --plan=.ai/custom.md      # Use specific plan file"
      echo "  $0 --parallel                # Enable parallel execution"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Auto-detect plan file if not specified
if [ -z "$PLAN_FILE" ]; then
  # Get git repo name for auto-detection
  REPO_NAME=$(git rev-parse --show-toplevel 2>/dev/null | xargs basename 2>/dev/null || echo "unknown")

  if [ -n "$FEATURE" ]; then
    # Feature-specific plan
    PLAN_FILE=".ai/${REPO_NAME}-${FEATURE}-plan.md"
  elif [ -f ".ai/${REPO_NAME}-plan.md" ]; then
    # Repository-specific plan
    PLAN_FILE=".ai/${REPO_NAME}-plan.md"
  elif [ -f ".ai/plan.md" ]; then
    # Default plan file
    PLAN_FILE=".ai/plan.md"
  else
    echo "❌ No plan file found. Expected:"
    echo "   .ai/${REPO_NAME}-plan.md"
    if [ -n "$FEATURE" ]; then
      echo "   .ai/${REPO_NAME}-${FEATURE}-plan.md"
    fi
    echo "   .ai/plan.md"
    echo ""
    echo "Create a plan first with: claude → '/plan \"your task description\"'"
    exit 1
  fi
fi

# Verify plan file exists
if [ ! -f "$PLAN_FILE" ]; then
  echo "❌ Plan file not found: $PLAN_FILE"
  echo ""
  echo "Create a plan first with: claude → '/plan \"your task description\"'"
  exit 1
fi

echo "🎯 AI Execution Orchestrator"
echo "============================"
echo "📝 Plan file: $PLAN_FILE"
echo "🏗️  Repository: $REPO_NAME"
if [ -n "$FEATURE" ]; then
  echo "🎛️  Feature: $FEATURE"
fi
echo ""

# Parse execution settings from plan file
parse_execution_settings() {
  local plan_file="$1"

  # Parse inline model directives from steps
  echo "🎯 Parsing model directives from plan..."

  # Count model usage in steps
  local opus_steps=$(grep -E "^[0-9]+\. \[OPUS\]" "$plan_file" | wc -l)
  local sonnet_steps=$(grep -E "^[0-9]+\. \[SONNET\]" "$plan_file" | wc -l)
  local haiku_steps=$(grep -E "^[0-9]+\. \[HAIKU\]" "$plan_file" | wc -l)
  local unspecified_steps=$(sed -n '/^## Steps$/,/^## /p' "$plan_file" | grep -E "^[0-9]+\. " | grep -v "\[OPUS\]\|\[SONNET\]\|\[HAIKU\]" | wc -l)

  # Show model distribution
  if [ "$opus_steps" -gt 0 ] || [ "$sonnet_steps" -gt 0 ] || [ "$haiku_steps" -gt 0 ]; then
    echo "📊 Model distribution in plan:"
    if [ "$opus_steps" -gt 0 ]; then
      echo "   🧠 Opus steps: $opus_steps (complex reasoning)"
    fi
    if [ "$sonnet_steps" -gt 0 ]; then
      echo "   ⚖️  Sonnet steps: $sonnet_steps (balanced implementation)"
    fi
    if [ "$haiku_steps" -gt 0 ]; then
      echo "   ⚡ Haiku steps: $haiku_steps (simple/fast tasks)"
    fi
    if [ "$unspecified_steps" -gt 0 ]; then
      echo "   ❓ Unspecified: $unspecified_steps (will use default)"
    fi

    # Set primary model based on majority
    if [ "$opus_steps" -ge "$sonnet_steps" ] && [ "$opus_steps" -ge "$haiku_steps" ]; then
      PRIMARY_MODEL="opus"
      echo "🎯 Primary model: OPUS (most complex steps)"
    elif [ "$sonnet_steps" -ge "$haiku_steps" ]; then
      PRIMARY_MODEL="sonnet"
      echo "🎯 Primary model: SONNET (balanced workload)"
    else
      PRIMARY_MODEL="haiku"
      echo "🎯 Primary model: HAIKU (mostly simple steps)"
    fi
    echo ""
  fi

  # Also check for legacy execution settings format
  if grep -q "^## Execution Settings" "$plan_file"; then
    echo "⚙️  Found legacy execution settings section..."
    LEGACY_MODEL=$(sed -n '/^## Execution Settings$/,/^## /p' "$plan_file" | grep "primary_model:" | sed 's/.*primary_model: *//; s/ *#.*//' | tr -d ' ')
    MAX_COST=$(sed -n '/^## Execution Settings$/,/^## /p' "$plan_file" | grep "max_cost:" | sed 's/.*max_cost: *//; s/ *#.*//' | tr -d ' $')
    ESTIMATED_TOKENS=$(sed -n '/^## Execution Settings$/,/^## /p' "$plan_file" | grep "estimated_tokens:" | sed 's/.*estimated_tokens: *//; s/ *#.*//' | tr -d ' ')

    if [ -n "$LEGACY_MODEL" ]; then
      echo "🔄 Legacy primary model: $LEGACY_MODEL"
      PRIMARY_MODEL="$LEGACY_MODEL"
    fi
    if [ -n "$MAX_COST" ]; then
      echo "💰 Budget limit: $MAX_COST"
    fi
    if [ -n "$ESTIMATED_TOKENS" ]; then
      echo "🎟️  Estimated tokens: $ESTIMATED_TOKENS"
    fi
    echo ""
  fi
}

# Generate execution briefing for fresh session awareness
generate_execution_briefing() {
  local plan_file="$1"

  # Count steps and analyze complexity
  local total_steps=$(sed -n '/^## Steps$/,/^## /p' "$plan_file" | grep -E "^[0-9]+\. " | wc -l)
  local opus_steps=$(grep -E "^[0-9]+\. \[OPUS\]" "$plan_file" | wc -l)
  local sonnet_steps=$(grep -E "^[0-9]+\. \[SONNET\]" "$plan_file" | wc -l)
  local haiku_steps=$(grep -E "^[0-9]+\. \[HAIKU\]" "$plan_file" | wc -l)

  # Determine complexity and approach
  local complexity="Medium"
  local approach="Standard implementation"
  local key_commands="/test, /review, /commit"

  if [ "$opus_steps" -gt 2 ]; then
    complexity="High"
    approach="Complex reasoning with architectural decisions"
    key_commands="/think, /review, /test, /commit"
  elif [ "$haiku_steps" -gt "$sonnet_steps" ] && [ "$opus_steps" -eq 0 ]; then
    complexity="Low"
    approach="Fast implementation of simple components"
    key_commands="/test, /commit"
  fi

  # Determine scope estimate
  local scope_estimate="1-2 sessions"
  if [ "$total_steps" -gt 6 ]; then
    scope_estimate="2-3 sessions"
  fi
  if [ "$total_steps" -gt 10 ]; then
    scope_estimate="3-4 sessions"
  fi

  # Identify critical paths (OPUS steps or complex patterns)
  local critical_paths=""
  if [ "$opus_steps" -gt 0 ]; then
    local critical_step_numbers=$(grep -n -E "^[0-9]+\. \[OPUS\]" "$plan_file" | head -2 | sed 's/:.*//; s/^/step /' | tr '\n' ', ' | sed 's/, $//')
    critical_paths="Complex reasoning steps: $critical_step_numbers"
  fi

  # Extract goal for context
  local goal=$(sed -n '/^## Goal$/,/^## /p' "$plan_file" | grep -v "^## " | grep -v "^$" | head -1)

  # Generate briefing
  cat <<EOF

EXECUTION SESSION BRIEFING
==========================
📋 TASK SUMMARY: $goal
📊 WORK BREAKDOWN: $total_steps total steps
🧠 MODEL ALLOCATION: Primary=$PRIMARY_MODEL | OPUS:$opus_steps SONNET:$sonnet_steps HAIKU:$haiku_steps
⚡ APPROACH: $approach
🎯 KEY COMMANDS: $key_commands
⏱️ ESTIMATED SCOPE: $complexity complexity - expect $scope_estimate
$(if [ -n "$critical_paths" ]; then echo "🔍 CRITICAL PATHS: $critical_paths"; fi)

EXECUTION INSTRUCTIONS:
- Read the complete plan before starting any implementation
- Follow the model directives in each step [OPUS]/[SONNET]/[HAIKU]
- Use suggested commands for quality gates and progress tracking
- Stop when all "Done When" conditions are verifiably met
- Do not modify plan scope or add features beyond requirements

EOF
}

# Generate Claude execution prompt with model preferences
generate_execution_prompt() {
  local plan_file="$1"
  local task_name="$2"
  local model_override="$3"

  # Determine which model to use
  local target_model=""
  if [ -n "$model_override" ]; then
    target_model="$model_override"
  elif [ -n "$PRIMARY_MODEL" ]; then
    target_model="$PRIMARY_MODEL"
  else
    target_model="$FALLBACK_MODEL"
  fi

  # Generate execution briefing
  local briefing=$(generate_execution_briefing "$plan_file")

  # Generate execution prompt
  local prompt="Read $plan_file and implement exactly as written.
Do not redesign. Do not refactor outside scope.
Stop when Done When conditions are met."

  if [ -n "$task_name" ]; then
    prompt="Read $plan_file and implement ONLY the task named \"$task_name\".
Ignore other tasks in the original plan.
Do not redesign or refactor outside this task's scope.
Stop when this task's steps are complete."
  fi

  # Add execution briefing for context
  prompt="$briefing

IMPLEMENTATION:
$prompt"

  # Add model preferences if available
  if [ -n "$target_model" ] && [ "$target_model" != "haiku" ]; then
    prompt="$prompt

EXECUTION PREFERENCES:
- Prefer $target_model model for this task
- Focus on the reasoning/implementation style appropriate for $target_model"
  fi

  # Add budget awareness
  if [ -n "$MAX_COST" ]; then
    prompt="$prompt
- Stay within budget limit of $MAX_COST"
  fi

  echo "$prompt"
}

echo ""

# Step 1: Parse plan settings
parse_execution_settings "$PLAN_FILE"

# Step 2: Lint the plan
echo "🔍 Step 1: Linting plan..."
if ! ./scripts/lint-plan.sh "$PLAN_FILE"; then
  echo ""
  echo "❌ Plan validation failed. Please fix plan quality issues before execution."
  echo "Edit the plan file: $PLAN_FILE"
  exit 1
fi
echo ""

# Step 2: Check for parallel execution capability
SUPPORTS_PARALLEL=false
if grep -q "task:" "$PLAN_FILE" || grep -q "parallel" "$PLAN_FILE"; then
  SUPPORTS_PARALLEL=true
fi

if [ "$PARALLEL" = true ] && [ "$SUPPORTS_PARALLEL" = false ]; then
  echo "⚠️  Plan doesn't support parallel execution. Running sequential execution instead."
  PARALLEL=false
fi

if [ "$SUPPORTS_PARALLEL" = true ] && [ "$PARALLEL" = false ]; then
  echo "💡 This plan supports parallel execution. Add --parallel flag for faster execution."
fi

# Step 3: Show execution plan
echo "📋 Step 2: Execution Plan"
echo "========================"
if [ "$DRY_RUN" = true ]; then
  echo "🧪 DRY RUN MODE - No actual execution"
fi

if [ "$PARALLEL" = true ]; then
  echo "⚡ Parallel execution enabled"
  echo "🔄 Will spawn multiple Claude sessions for independent tasks"
else
  echo "📖 Sequential execution"
  echo "🔄 Will execute plan in single fresh Claude session"
fi

echo ""
echo "📄 Plan Summary:"
echo "================"

# Extract and display plan summary
if grep -q "^## Goal" "$PLAN_FILE"; then
  GOAL=$(sed -n '/^## Goal$/,/^## /p' "$PLAN_FILE" | grep -v "^## " | grep -v "^$" | head -1)
  echo "🎯 Goal: $GOAL"
fi

if grep -q "^## Steps" "$PLAN_FILE"; then
  STEP_COUNT=$(sed -n '/^## Steps$/,/^## /p' "$PLAN_FILE" | grep -E "^[0-9]+\. " | wc -l)
  echo "📝 Steps: $STEP_COUNT implementation steps"
fi

if grep -q "^## Done When" "$PLAN_FILE"; then
  CRITERIA_COUNT=$(sed -n '/^## Done When$/,/^## /p' "$PLAN_FILE" | grep -E "^- " | wc -l)
  echo "✅ Success criteria: $CRITERIA_COUNT testable conditions"
fi

echo ""

# Step 4: Execute (unless dry run)
if [ "$DRY_RUN" = true ]; then
  echo "🧪 Dry run complete. Would have executed:"
  if [ "$PARALLEL" = true ]; then
    echo "   ./scripts/fanout.sh \"$PLAN_FILE\""
  else
    echo "   claude → \"Read $PLAN_FILE and implement exactly as written.\""
  fi
  exit 0
fi

echo "🚀 Step 3: Execution"
echo "===================="

if [ "$PARALLEL" = true ]; then
  echo "⚡ Starting parallel fan-out execution..."
  if [ ! -f "./scripts/fanout.sh" ]; then
    echo "❌ fanout.sh script not found. Please ensure parallel execution system is set up."
    exit 1
  fi
  ./scripts/fanout.sh "$PLAN_FILE"
else
  echo "📖 Starting sequential execution..."
  echo ""
  echo "🔄 Launching fresh Claude session..."
  echo "📋 Plan file: $PLAN_FILE"
  if [ -n "$PRIMARY_MODEL" ]; then
    echo "🧠 Target model: $PRIMARY_MODEL"
  fi
  echo ""

  # Generate and display execution briefing
  echo "📋 EXECUTION BRIEFING"
  echo "===================="

  # Generate and show the briefing
  EXECUTION_BRIEFING=$(generate_execution_briefing "$PLAN_FILE")
  echo "$EXECUTION_BRIEFING"

  # Generate full execution prompt (briefing + implementation instructions)
  EXECUTION_PROMPT=$(generate_execution_prompt "$PLAN_FILE" "" "")

  echo ""

  # Auto-launch Claude session
  if command -v claude &> /dev/null; then
    echo "🚀 Auto-launching fresh Claude session..."
    echo "📋 Sending execution briefing and plan to Claude..."

    # Check if auto-optimize config exists and integrate
    if [ -f ".claude/auto-optimize-config.json" ]; then
      echo "🔧 Integrating auto-optimize model preferences..."
    fi

    echo "⚡ Starting execution..."
    echo ""

    claude <<EOF
$EXECUTION_PROMPT
EOF
  else
    echo "❌ Claude command not found in PATH"
    echo "💡 Please ensure 'claude' command is available to use auto-launch"
    echo "🔧 Alternative: Install Claude CLI or add to PATH"
    exit 1
  fi
fi

echo ""
echo "✨ Execution initiated!"
echo ""
echo "📊 Next steps:"
echo "=============="
echo "1. Monitor execution progress"
echo "2. Verify Done When conditions are met"
echo "3. Run tests and validate results"
echo "4. Commit successful implementation"
echo ""
echo "🔧 Troubleshooting:"
echo "==================="
echo "- If execution fails: Review plan quality and specificity"
echo "- If scope creep occurs: Check constraint enforcement"
echo "- If context issues: Ensure fresh Claude session was used"