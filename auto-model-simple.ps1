#!/usr/bin/env pwsh
# Auto Model Selection - Optimized thresholds version
param([string]$Task = "", [switch]$Help)

if ($Help -or [string]::IsNullOrWhiteSpace($Task)) {
    Write-Host "Auto Model Selection - Route to optimal Claude model (Optimized)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE: .\auto-model-optimized.ps1 'task description'" -ForegroundColor White
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Green
    Write-Host "  .\auto-model-optimized.ps1 'Fix typo'           # -> Haiku" -ForegroundColor Gray
    Write-Host "  .\auto-model-optimized.ps1 'Add authentication' # -> Sonnet" -ForegroundColor Gray
    Write-Host "  .\auto-model-optimized.ps1 'Design architecture'# -> Opus" -ForegroundColor Gray
    exit 0
}

function Get-Complexity($task) {
    $score = 0
    $t = $task.ToLower()

    # High complexity indicators (+15-20 points)
    if ($t -match "design|architecture|debug|choose|complex|decide") { $score += 18 }
    if ($t -match "system|multiple|integrate|scale|performance") { $score += 15 }
    if ($t -match "security|optimization|strategy|framework") { $score += 12 }

    # Medium complexity indicators (+8-10 points)
    if ($t -match "implement|create|build|add|feature") { $score += 10 }
    if ($t -match "refactor|test|api|database|auth") { $score += 8 }
    if ($t -match "component|service|endpoint") { $score += 6 }

    # Low complexity indicators (-5 points or base 2-5)
    if ($t -match "fix|update|typo|simple|quick|read|check") { $score += 2 }
    if ($t -match "status|list|show|display|view") { $score += 1 }
    if ($t -match "git|file|copy|move") { $score += 3 }

    return [Math]::Max(0, $score)
}

function Get-CostSavings($fromModel, $toModel) {
    $costs = @{
        haiku = 0.625   # Average of input/output
        sonnet = 9      # Average of input/output
        opus = 45       # Average of input/output
    }

    $fromCost = $costs[$fromModel]
    $toCost = $costs[$toModel]
    $savings = [Math]::Round((($fromCost - $toCost) / $fromCost) * 100, 0)

    return $savings
}

$complexity = Get-Complexity($Task)

# Optimized thresholds based on testing
if ($complexity -le 6) {
    $model = "haiku"
    $reason = "Simple task - fast execution"
    $savings = Get-CostSavings "sonnet" "haiku"
} elseif ($complexity -le 20) {
    $model = "sonnet"
    $reason = "Medium complexity - balanced approach"
    $savings = 0  # Baseline
} else {
    $model = "opus"
    $reason = "High complexity - deep thinking required"
    $savings = Get-CostSavings "sonnet" "opus"
    $savingsNote = "(Higher cost but necessary for quality)"
}

Write-Host ""
Write-Host "TASK: $Task" -ForegroundColor Yellow
Write-Host "COMPLEXITY SCORE: $complexity" -ForegroundColor Cyan
Write-Host "RECOMMENDED MODEL: $($model.ToUpper())" -ForegroundColor Green
Write-Host "REASON: $reason" -ForegroundColor White

if ($model -eq "haiku") {
    Write-Host "COST SAVINGS: $savings% vs Sonnet" -ForegroundColor Green
} elseif ($model -eq "opus") {
    Write-Host "COST IMPACT: -$([Math]::Abs($savings))% vs Sonnet $savingsNote" -ForegroundColor Yellow
} else {
    Write-Host "COST: Baseline (Sonnet)" -ForegroundColor White
}

Write-Host ""
Write-Host "Next: Use Task tool in Claude with model: '$model'" -ForegroundColor Magenta