#!/usr/bin/env bash
set -e

# Parallel Fan-Out Execution Script
# Usage: ./scripts/fanout.sh <plan-file>
#
# Analyzes a plan file for parallel tasks and spawns multiple fresh Claude sessions
# to execute independent tasks simultaneously

PLAN_FILE="$1"

if [ -z "$PLAN_FILE" ]; then
  echo "Usage: $0 <plan-file>"
  exit 1
fi

if [ ! -f "$PLAN_FILE" ]; then
  echo "❌ Plan file not found: $PLAN_FILE"
  exit 1
fi

echo "⚡ Parallel Fan-Out Execution"
echo "============================"
echo "📝 Plan file: $PLAN_FILE"
echo ""

# Create temporary directory for parallel execution
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "🔍 Analyzing plan for parallel tasks..."

# Method 1: Check for explicit task sections
TASK_SECTIONS=$(grep -n "^- task:" "$PLAN_FILE" || true)

if [ -n "$TASK_SECTIONS" ]; then
  echo "✅ Found explicit task sections for parallel execution"

  # Extract task names
  TASKS=($(grep "^- task:" "$PLAN_FILE" | sed 's/- task: //g' | tr -d ' '))

  echo "📋 Identified ${#TASKS[@]} parallel tasks:"
  for task in "${TASKS[@]}"; do
    echo "   🎯 $task"
  done
  echo ""

  # Execute tasks in parallel
  PIDS=()

  for i in "${!TASKS[@]}"; do
    task="${TASKS[$i]}"

    echo "🚀 Starting Claude session for task: $task"

    # Create task-specific plan excerpt
    TASK_PLAN_FILE="$TEMP_DIR/task-${task}-plan.md"

    # Extract task-specific sections from main plan
    awk "
    /^# Plan:/ { print; header_found=1 }
    /^## Goal/ { if (header_found) print }
    /^## Constraints/ { if (header_found) { print; in_constraints=1 } }
    in_constraints && /^## / && !/^## Constraints/ { in_constraints=0 }
    in_constraints { print }
    /^- task: $task/ {
      in_task=1;
      print \"## Steps for Task: $task\"
    }
    in_task && /^  steps:/ {
      in_steps=1
      next
    }
    in_task && in_steps && /^    [0-9]/ {
      gsub(/^    /, \"\")
      print
    }
    in_task && /^- task:/ && !/^- task: $task/ { in_task=0; in_steps=0 }
    /^## Done When/ { if (header_found) print_done=1 }
    print_done { print }
    " "$PLAN_FILE" > "$TASK_PLAN_FILE"

    # Add task-specific done when criteria
    echo "" >> "$TASK_PLAN_FILE"
    echo "## Done When (Task: $task)" >> "$TASK_PLAN_FILE"
    echo "- Task $task implementation is complete" >> "$TASK_PLAN_FILE"
    echo "- Task $task tests pass" >> "$TASK_PLAN_FILE"
    echo "- Task $task integrates with existing code" >> "$TASK_PLAN_FILE"

    # Launch Claude session for this task
    LOG_FILE="$TEMP_DIR/task-${task}.log"

    if command -v claude &> /dev/null; then
      (
        echo "[$(date)] Starting Claude for task: $task" >> "$LOG_FILE"
        claude <<EOF 2>&1 | tee -a "$LOG_FILE"
Read $TASK_PLAN_FILE and implement ONLY the task named "$task".
Ignore other tasks in the original plan.
Do not redesign or refactor outside this task's scope.
Stop when this task's steps are complete.

CRITICAL: This is parallel execution. You are responsible only for the "$task" task.
Other tasks will be handled by separate Claude sessions.
EOF
        echo "[$(date)] Completed Claude for task: $task" >> "$LOG_FILE"
      ) &
      PIDS+=($!)
    else
      echo "⚠️  Claude command not found. Showing task plan for manual execution:"
      echo "📋 Task plan saved to: $TASK_PLAN_FILE"
      echo "🎯 Execute manually: claude → \"Read $TASK_PLAN_FILE and implement task $task\""
      echo ""
    fi
  done

  if [ ${#PIDS[@]} -gt 0 ]; then
    echo ""
    echo "⏳ Waiting for ${#PIDS[@]} parallel Claude sessions to complete..."
    echo "📊 Monitor progress in real-time:"
    for i in "${!TASKS[@]}"; do
      task="${TASKS[$i]}"
      echo "   tail -f $TEMP_DIR/task-${task}.log"
    done
    echo ""

    # Wait for all parallel tasks to complete
    for i in "${!PIDS[@]}"; do
      task="${TASKS[$i]}"
      pid="${PIDS[$i]}"

      echo "⏳ Waiting for task: $task (PID: $pid)"
      wait $pid
      exit_code=$?

      if [ $exit_code -eq 0 ]; then
        echo "✅ Task completed successfully: $task"
      else
        echo "❌ Task failed: $task (exit code: $exit_code)"
      fi
    done
  fi

else
  # Method 2: Check for steps that can be parallelized
  echo "🔍 No explicit task sections found. Analyzing steps for parallelization..."

  # Extract all numbered steps
  STEPS=($(sed -n '/^## Steps$/,/^## /p' "$PLAN_FILE" | grep -E "^[0-9]+\. " | sed 's/^[0-9]*\. //'))

  if [ ${#STEPS[@]} -lt 2 ]; then
    echo "⚠️  Plan has ${#STEPS[@]} steps. Parallel execution not beneficial."
    echo "🔄 Falling back to sequential execution..."

    if command -v claude &> /dev/null; then
      claude <<EOF
Read $PLAN_FILE and implement exactly as written.
Do not redesign. Do not refactor outside scope.
Stop when Done When conditions are met.
EOF
    else
      echo "🎯 Execute manually: claude → \"Read $PLAN_FILE and implement exactly\""
    fi
    exit 0
  fi

  # Simple heuristic: If steps mention different files/components, they might be parallel
  PARALLEL_GROUPS=()
  FRONTEND_STEPS=()
  BACKEND_STEPS=()
  GENERAL_STEPS=()

  for i in "${!STEPS[@]}"; do
    step="${STEPS[$i]}"
    step_num=$((i + 1))

    if echo "$step" | grep -qi "component\|tsx\|jsx\|css\|frontend\|ui\|button\|form"; then
      FRONTEND_STEPS+=("$step_num. $step")
    elif echo "$step" | grep -qi "api\|server\|backend\|database\|service\|endpoint"; then
      BACKEND_STEPS+=("$step_num. $step")
    else
      GENERAL_STEPS+=("$step_num. $step")
    fi
  done

  # If we have both frontend and backend steps, we can parallelize
  if [ ${#FRONTEND_STEPS[@]} -gt 0 ] && [ ${#BACKEND_STEPS[@]} -gt 0 ]; then
    echo "✅ Identified frontend/backend split for parallel execution"
    echo "🎯 Frontend steps: ${#FRONTEND_STEPS[@]}"
    echo "🎯 Backend steps: ${#BACKEND_STEPS[@]}"
    echo "🎯 General steps: ${#GENERAL_STEPS[@]}"
    echo ""

    # Create frontend plan
    FRONTEND_PLAN="$TEMP_DIR/frontend-plan.md"
    awk '/^# Plan:/ { print; header_found=1 }
         /^## Goal/ { if (header_found) print }
         /^## Constraints/ { if (header_found) print; in_constraints=1 }
         in_constraints && /^## / && !/^## Constraints/ { in_constraints=0 }
         in_constraints { print }' "$PLAN_FILE" > "$FRONTEND_PLAN"

    echo "" >> "$FRONTEND_PLAN"
    echo "## Steps (Frontend Only)" >> "$FRONTEND_PLAN"
    for step in "${FRONTEND_STEPS[@]}"; do
      echo "$step" >> "$FRONTEND_PLAN"
    done

    echo "" >> "$FRONTEND_PLAN"
    echo "## Done When" >> "$FRONTEND_PLAN"
    echo "- Frontend components are implemented" >> "$FRONTEND_PLAN"
    echo "- UI functionality works as expected" >> "$FRONTEND_PLAN"
    echo "- Frontend tests pass" >> "$FRONTEND_PLAN"

    # Create backend plan
    BACKEND_PLAN="$TEMP_DIR/backend-plan.md"
    awk '/^# Plan:/ { print; header_found=1 }
         /^## Goal/ { if (header_found) print }
         /^## Constraints/ { if (header_found) print; in_constraints=1 }
         in_constraints && /^## / && !/^## Constraints/ { in_constraints=0 }
         in_constraints { print }' "$PLAN_FILE" > "$BACKEND_PLAN"

    echo "" >> "$BACKEND_PLAN"
    echo "## Steps (Backend Only)" >> "$BACKEND_PLAN"
    for step in "${BACKEND_STEPS[@]}"; do
      echo "$step" >> "$BACKEND_PLAN"
    done

    echo "" >> "$BACKEND_PLAN"
    echo "## Done When" >> "$BACKEND_PLAN"
    echo "- Backend services are implemented" >> "$BACKEND_PLAN"
    echo "- API endpoints work correctly" >> "$BACKEND_PLAN"
    echo "- Backend tests pass" >> "$BACKEND_PLAN"

    # Execute in parallel
    PIDS=()

    if command -v claude &> /dev/null; then
      echo "🚀 Starting frontend Claude session..."
      (
        echo "[$(date)] Starting frontend implementation" >> "$TEMP_DIR/frontend.log"
        claude <<EOF 2>&1 | tee -a "$TEMP_DIR/frontend.log"
Read $FRONTEND_PLAN and implement ONLY the frontend components.
Focus on UI, components, and client-side functionality.
Do not implement backend/API code.
Stop when frontend implementation is complete.
EOF
        echo "[$(date)] Completed frontend implementation" >> "$TEMP_DIR/frontend.log"
      ) &
      PIDS+=($!)

      echo "🚀 Starting backend Claude session..."
      (
        echo "[$(date)] Starting backend implementation" >> "$TEMP_DIR/backend.log"
        claude <<EOF 2>&1 | tee -a "$TEMP_DIR/backend.log"
Read $BACKEND_PLAN and implement ONLY the backend services.
Focus on API, database, and server-side functionality.
Do not implement frontend/UI code.
Stop when backend implementation is complete.
EOF
        echo "[$(date)] Completed backend implementation" >> "$TEMP_DIR/backend.log"
      ) &
      PIDS+=($!)

      echo ""
      echo "⏳ Waiting for frontend and backend sessions to complete..."
      echo "📊 Monitor progress:"
      echo "   Frontend: tail -f $TEMP_DIR/frontend.log"
      echo "   Backend:  tail -f $TEMP_DIR/backend.log"
      echo ""

      # Wait for completion
      wait ${PIDS[0]}
      frontend_exit=$?

      wait ${PIDS[1]}
      backend_exit=$?

      if [ $frontend_exit -eq 0 ] && [ $backend_exit -eq 0 ]; then
        echo "✅ Both frontend and backend completed successfully!"

        # Handle general steps if any
        if [ ${#GENERAL_STEPS[@]} -gt 0 ]; then
          echo ""
          echo "🔧 Executing remaining general steps..."

          GENERAL_PLAN="$TEMP_DIR/general-plan.md"
          awk '/^# Plan:/ { print; header_found=1 }
               /^## Goal/ { if (header_found) print }
               /^## Constraints/ { if (header_found) print; in_constraints=1 }
               in_constraints && /^## / && !/^## Constraints/ { in_constraints=0 }
               in_constraints { print }' "$PLAN_FILE" > "$GENERAL_PLAN"

          echo "" >> "$GENERAL_PLAN"
          echo "## Steps (Integration & General)" >> "$GENERAL_PLAN"
          for step in "${GENERAL_STEPS[@]}"; do
            echo "$step" >> "$GENERAL_PLAN"
          done

          echo "" >> "$GENERAL_PLAN"
          echo "## Done When" >> "$GENERAL_PLAN"
          echo "- Frontend and backend are integrated" >> "$GENERAL_PLAN"
          echo "- All tests pass" >> "$GENERAL_PLAN"
          echo "- System works end-to-end" >> "$GENERAL_PLAN"

          claude <<EOF
Read $GENERAL_PLAN and complete the integration steps.
Frontend and backend have been implemented in parallel.
Focus on integration, testing, and final verification.
EOF
        fi

      else
        echo "❌ Parallel execution had failures:"
        echo "   Frontend exit code: $frontend_exit"
        echo "   Backend exit code: $backend_exit"
        exit 1
      fi

    else
      echo "⚠️  Claude command not found. Showing parallel plans for manual execution:"
      echo "📋 Frontend plan: $FRONTEND_PLAN"
      echo "📋 Backend plan: $BACKEND_PLAN"
      echo ""
      echo "🎯 Execute manually in separate Claude sessions:"
      echo "   Session 1: claude → \"Read $FRONTEND_PLAN and implement frontend only\""
      echo "   Session 2: claude → \"Read $BACKEND_PLAN and implement backend only\""
    fi

  else
    echo "⚠️  Steps don't appear suitable for parallelization"
    echo "🔄 Falling back to sequential execution..."

    if command -v claude &> /dev/null; then
      claude <<EOF
Read $PLAN_FILE and implement exactly as written.
Do not redesign. Do not refactor outside scope.
Stop when Done When conditions are met.
EOF
    else
      echo "🎯 Execute manually: claude → \"Read $PLAN_FILE and implement exactly\""
    fi
  fi
fi

echo ""
echo "✨ Parallel execution complete!"
echo ""
echo "📊 Results:"
if [ -d "$TEMP_DIR" ]; then
  echo "   Execution logs: $TEMP_DIR"
  echo "   Task plans: $TEMP_DIR/*-plan.md"
fi

echo ""
echo "🔧 Next steps:"
echo "=============="
echo "1. Verify all tasks completed successfully"
echo "2. Test integration between parallel components"
echo "3. Run full test suite"
echo "4. Commit successful implementation"