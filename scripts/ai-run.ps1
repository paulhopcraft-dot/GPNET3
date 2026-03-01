# AI Run Script - PowerShell version for Windows
# Usage: .\scripts\ai-run.ps1 [options]

param(
    [string]$PlanFile = "",
    [string]$Feature = "",
    [switch]$Parallel = $false,
    [switch]$DryRun = $false,
    [switch]$Help = $false
)

# Show help if requested
if ($Help) {
    Write-Host "AI Run Script - Plan-based execution orchestrator"
    Write-Host ""
    Write-Host "Usage: .\scripts\ai-run.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -PlanFile <filename>    Use specific plan file"
    Write-Host "  -Feature <name>         Use feature-specific plan"
    Write-Host "  -Parallel               Enable parallel fan-out execution"
    Write-Host "  -DryRun                 Show execution plan without running"
    Write-Host "  -Help                   Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\ai-run.ps1                           # Auto-detect plan file"
    Write-Host "  .\scripts\ai-run.ps1 -Feature auth            # Use auth feature plan"
    Write-Host "  .\scripts\ai-run.ps1 -PlanFile .ai\custom.md  # Use specific plan file"
    Write-Host "  .\scripts\ai-run.ps1 -Parallel                # Enable parallel execution"
    exit 0
}

# Configuration
$FallbackModel = "haiku"
$PrimaryModel = ""
$MaxCost = ""
$EstimatedTokens = ""

function Get-RepoName {
    try {
        $gitTopLevel = git rev-parse --show-toplevel 2>$null
        if ($gitTopLevel) {
            return Split-Path $gitTopLevel -Leaf
        }
    } catch {
        return "unknown"
    }
    return "unknown"
}

function Find-PlanFile {
    param(
        [string]$PlanFile,
        [string]$Feature
    )

    if ($PlanFile -ne "") {
        return $PlanFile
    }

    $repoName = Get-RepoName

    if ($Feature -ne "") {
        # Feature-specific plan
        $featurePlan = ".ai\$repoName-$Feature-plan.md"
        if (Test-Path $featurePlan) {
            return $featurePlan
        }
    }

    # Repository-specific plan
    $repoPlan = ".ai\$repoName-plan.md"
    if (Test-Path $repoPlan) {
        return $repoPlan
    }

    # Check for any feature-specific plans in .ai directory
    $anyPlans = Get-ChildItem ".ai\*-plan.md" -ErrorAction SilentlyContinue
    if ($anyPlans.Count -eq 1) {
        Write-Host "🎯 Found feature plan: $($anyPlans[0].Name)"
        return $anyPlans[0].FullName
    } elseif ($anyPlans.Count -gt 1) {
        Write-Host "⚠️  Multiple plan files found:"
        $anyPlans | ForEach-Object { Write-Host "   - $($_.Name)" }
        Write-Host "Please specify which plan to use with -PlanFile parameter"
        exit 1
    }

    # Default plan file
    $defaultPlan = ".ai\plan.md"
    if (Test-Path $defaultPlan) {
        return $defaultPlan
    }

    # No plan file found
    Write-Host "❌ No plan file found. Expected:"
    Write-Host "   .ai\$repoName-plan.md"
    if ($Feature -ne "") {
        Write-Host "   .ai\$repoName-$Feature-plan.md"
    }
    Write-Host "   .ai\plan.md"
    Write-Host ""
    Write-Host "Create a plan first by asking Claude: 'Use the plan-writer skill to create a plan for: [description]'"
    exit 1
}

function Parse-ExecutionSettings {
    param([string]$PlanFilePath)

    $script:PrimaryModel = ""

    Write-Host "🎯 Parsing model directives from plan..."

    if (Test-Path $PlanFilePath) {
        $content = Get-Content $PlanFilePath -Raw

        # Count model usage in steps
        $opusSteps = ([regex]::Matches($content, "(?m)^[0-9]+\. \[OPUS\]")).Count
        $sonnetSteps = ([regex]::Matches($content, "(?m)^[0-9]+\. \[SONNET\]")).Count
        $haikuSteps = ([regex]::Matches($content, "(?m)^[0-9]+\. \[HAIKU\]")).Count

        # Show model distribution
        if ($opusSteps -gt 0 -or $sonnetSteps -gt 0 -or $haikuSteps -gt 0) {
            Write-Host "📊 Model distribution in plan:"
            if ($opusSteps -gt 0) {
                Write-Host "   🧠 Opus steps: $opusSteps (complex reasoning)"
            }
            if ($sonnetSteps -gt 0) {
                Write-Host "   ⚖️  Sonnet steps: $sonnetSteps (balanced implementation)"
            }
            if ($haikuSteps -gt 0) {
                Write-Host "   ⚡ Haiku steps: $haikuSteps (simple/fast tasks)"
            }

            # Set primary model based on majority
            if ($opusSteps -ge $sonnetSteps -and $opusSteps -ge $haikuSteps) {
                $script:PrimaryModel = "opus"
                Write-Host "🎯 Primary model: OPUS (most complex steps)"
            } elseif ($sonnetSteps -ge $haikuSteps) {
                $script:PrimaryModel = "sonnet"
                Write-Host "🎯 Primary model: SONNET (balanced workload)"
            } else {
                $script:PrimaryModel = "haiku"
                Write-Host "🎯 Primary model: HAIKU (mostly simple steps)"
            }
            Write-Host ""
        }
    }
}

function Generate-ExecutionBriefing {
    param([string]$PlanFilePath)

    if (-not (Test-Path $PlanFilePath)) {
        return ""
    }

    $content = Get-Content $PlanFilePath -Raw

    # Count steps and analyze complexity
    $totalSteps = ([regex]::Matches($content, "(?m)^[0-9]+\. ")).Count
    $opusSteps = ([regex]::Matches($content, "(?m)^[0-9]+\. \[OPUS\]")).Count
    $sonnetSteps = ([regex]::Matches($content, "(?m)^[0-9]+\. \[SONNET\]")).Count
    $haikuSteps = ([regex]::Matches($content, "(?m)^[0-9]+\. \[HAIKU\]")).Count

    # Determine complexity and approach
    $complexity = "Medium"
    $approach = "Standard implementation"
    $keyCommands = "/test, /review, /commit"

    if ($opusSteps -gt 2) {
        $complexity = "High"
        $approach = "Complex reasoning with architectural decisions"
        $keyCommands = "/think, /review, /test, /commit"
    } elseif ($haikuSteps -gt $sonnetSteps -and $opusSteps -eq 0) {
        $complexity = "Low"
        $approach = "Fast implementation of simple components"
        $keyCommands = "/test, /commit"
    }

    # Determine scope estimate
    $scopeEstimate = "1-2 sessions"
    if ($totalSteps -gt 6) {
        $scopeEstimate = "2-3 sessions"
    }
    if ($totalSteps -gt 10) {
        $scopeEstimate = "3-4 sessions"
    }

    # Extract goal for context
    $goal = ""
    if ($content -match "(?s)## Goal\s*\n(.*?)\n\s*##") {
        $goal = $matches[1].Trim()
    }

    # Generate briefing
    $briefing = @"

EXECUTION SESSION BRIEFING
==========================
📋 TASK SUMMARY: $goal
📊 WORK BREAKDOWN: $totalSteps total steps
🧠 MODEL ALLOCATION: Primary=$script:PrimaryModel | OPUS:$opusSteps SONNET:$sonnetSteps HAIKU:$haikuSteps
⚡ APPROACH: $approach
🎯 KEY COMMANDS: $keyCommands
⏱️ ESTIMATED SCOPE: $complexity complexity - expect $scopeEstimate

EXECUTION INSTRUCTIONS:
- Read the complete plan before starting any implementation
- Follow the model directives in each step [OPUS]/[SONNET]/[HAIKU]
- Use suggested commands for quality gates and progress tracking
- Stop when all "Done When" conditions are verifiably met
- Do not modify plan scope or add features beyond requirements

"@

    return $briefing
}

function Generate-ExecutionPrompt {
    param(
        [string]$PlanFilePath,
        [string]$TaskName = "",
        [string]$ModelOverride = ""
    )

    # Determine which model to use
    $targetModel = ""
    if ($ModelOverride -ne "") {
        $targetModel = $ModelOverride
    } elseif ($script:PrimaryModel -ne "") {
        $targetModel = $script:PrimaryModel
    } else {
        $targetModel = $FallbackModel
    }

    # Generate execution briefing
    $briefing = Generate-ExecutionBriefing -PlanFilePath $PlanFilePath

    # Generate execution prompt
    $prompt = "Read $PlanFilePath and implement exactly as written.
Do not redesign. Do not refactor outside scope.
Stop when Done When conditions are met."

    if ($TaskName -ne "") {
        $prompt = "Read $PlanFilePath and implement ONLY the task named `"$TaskName`".
Ignore other tasks in the original plan.
Do not redesign or refactor outside this task's scope.
Stop when this task's steps are complete."
    }

    # Add execution briefing for context
    $fullPrompt = $briefing + "`n`nIMPLEMENTATION:`n" + $prompt

    # Add model preferences if available
    if ($targetModel -ne "" -and $targetModel -ne "haiku") {
        $fullPrompt += "`n`nEXECUTION PREFERENCES:`n- Prefer $targetModel model for this task`n- Focus on the reasoning/implementation style appropriate for $targetModel"
    }

    # Add budget awareness
    if ($MaxCost -ne "") {
        $fullPrompt += "`n- Stay within budget limit of $MaxCost"
    }

    return $fullPrompt
}

# Main execution
Write-Host "🎯 AI Execution Orchestrator"
Write-Host "============================="

# Auto-detect plan file
$detectedPlan = Find-PlanFile -PlanFile $PlanFile -Feature $Feature
Write-Host "📝 Plan file: $detectedPlan"

$repoName = Get-RepoName
Write-Host "🏗️  Repository: $repoName"
if ($Feature -ne "") {
    Write-Host "🎛️  Feature: $Feature"
}
Write-Host ""

# Parse plan settings
Parse-ExecutionSettings -PlanFilePath $detectedPlan

# Lint the plan
Write-Host "🔍 Step 1: Linting plan..."
$lintScript = ".\scripts\lint-plan.ps1"
if (Test-Path $lintScript) {
    $lintResult = & $lintScript -PlanFile $detectedPlan
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Plan validation failed. Please fix plan quality issues before execution."
        Write-Host "Edit the plan file: $detectedPlan"
        exit 1
    }
} else {
    Write-Host "⚠️  Lint script not found - skipping validation"
}
Write-Host ""

# Show execution plan
Write-Host "📋 Step 2: Execution Plan"
Write-Host "========================"
if ($DryRun) {
    Write-Host "🧪 DRY RUN MODE - No actual execution"
}

Write-Host "📖 Sequential execution"
Write-Host "🔄 Will execute plan in single fresh Claude session"
Write-Host ""

# Extract and display plan summary
$planContent = Get-Content $detectedPlan -Raw
if ($planContent -match "(?s)## Goal\s*\n(.*?)\n\s*##") {
    $goal = $matches[1].Trim()
    Write-Host "🎯 Goal: $goal"
}

$stepMatches = [regex]::Matches($planContent, "(?m)^[0-9]+\. ")
Write-Host "📝 Steps: $($stepMatches.Count) implementation steps"

$doneWhenMatches = [regex]::Matches($planContent, "(?m)^- ")
Write-Host "✅ Success criteria: $($doneWhenMatches.Count) testable conditions"
Write-Host ""

# Execute (unless dry run)
if ($DryRun) {
    Write-Host "🧪 Dry run complete. Would have executed:"
    Write-Host "   claude → `"Read $detectedPlan and implement exactly as written.`""
    exit 0
}

Write-Host "🚀 Step 3: Execution"
Write-Host "===================="
Write-Host "📖 Starting sequential execution..."
Write-Host ""
Write-Host "🔄 Launching fresh Claude session..."
Write-Host "📋 Plan file: $detectedPlan"
if ($script:PrimaryModel -ne "") {
    Write-Host "🧠 Target model: $($script:PrimaryModel)"
}
Write-Host ""

# Generate and display execution briefing
Write-Host "📋 EXECUTION BRIEFING"
Write-Host "===================="
$executionBriefing = Generate-ExecutionBriefing -PlanFilePath $detectedPlan
Write-Host $executionBriefing

# Generate full execution prompt
$executionPrompt = Generate-ExecutionPrompt -PlanFilePath $detectedPlan

Write-Host ""

# Check if claude command is available
try {
    $claudeVersion = claude --version 2>$null
    if ($claudeVersion) {
        Write-Host "🚀 Auto-launching fresh Claude session..."
        Write-Host "📋 Sending execution briefing and plan to Claude..."
        Write-Host "⚡ Starting execution..."
        Write-Host ""

        # Launch Claude with the execution prompt
        $executionPrompt | claude
    }
} catch {
    Write-Host "❌ Claude command not found in PATH"
    Write-Host "💡 Please ensure 'claude' command is available to use auto-launch"
    Write-Host ""
    Write-Host "📋 MANUAL EXECUTION PROMPT:"
    Write-Host "=========================="
    Write-Host $executionPrompt
    Write-Host ""
    Write-Host "Copy the prompt above and run: claude"
    exit 1
}

Write-Host ""
Write-Host "✨ Execution initiated!"
Write-Host ""
Write-Host "📊 Next steps:"
Write-Host "=============="
Write-Host "1. Monitor execution progress"
Write-Host "2. Verify Done When conditions are met"
Write-Host "3. Run tests and validate results"
Write-Host "4. Commit successful implementation"