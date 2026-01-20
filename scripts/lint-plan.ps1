# Plan Linting Script - PowerShell version for Windows
# Usage: .\scripts\lint-plan.ps1 [-PlanFile <path>] [-Help]

param(
    [string]$PlanFile = "",
    [switch]$Help = $false
)

# Show help if requested
if ($Help) {
    Write-Host "Plan Linting Script - Validates plan quality and structure"
    Write-Host ""
    Write-Host "Usage: .\scripts\lint-plan.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -PlanFile <path>    Specific plan file to validate"
    Write-Host "  -Help               Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\lint-plan.ps1                    # Auto-detect plan file"
    Write-Host "  .\scripts\lint-plan.ps1 -PlanFile .ai\custom.md"
    exit 0
}

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
    param([string]$PlanFile)

    if ($PlanFile -ne "" -and (Test-Path $PlanFile)) {
        return $PlanFile
    }

    if ($PlanFile -ne "" -and -not (Test-Path $PlanFile)) {
        Write-Host "❌ Plan file not found: $PlanFile"
        exit 1
    }

    # Auto-detect plan file
    $repoName = Get-RepoName

    # Repository-specific plan
    $repoPlan = ".ai\$repoName-plan.md"
    if (Test-Path $repoPlan) {
        return $repoPlan
    }

    # Check for any feature-specific plans in .ai directory
    $anyPlans = Get-ChildItem ".ai\*-plan.md" -ErrorAction SilentlyContinue
    if ($anyPlans.Count -eq 1) {
        return $anyPlans[0].FullName
    } elseif ($anyPlans.Count -gt 1) {
        Write-Host "⚠️  Multiple plan files found, using first: $($anyPlans[0].Name)"
        return $anyPlans[0].FullName
    }

    # Default plan file
    $defaultPlan = ".ai\plan.md"
    if (Test-Path $defaultPlan) {
        return $defaultPlan
    }

    # No plan file found
    Write-Host "❌ No plan file found. Expected .ai\$repoName-plan.md or .ai\plan.md"
    exit 1
}

function Test-PlanStructure {
    param([string]$PlanContent)

    $errors = @()
    $warnings = @()

    # Check for required sections
    $requiredSections = @("## Goal", "## Constraints", "## Steps", "## Done When")
    foreach ($section in $requiredSections) {
        if ($PlanContent -notmatch [regex]::Escape($section)) {
            $errors += "Missing required section: $section"
        }
    }

    # Check Goal section (should be single sentence)
    if ($PlanContent -match "(?s)## Goal\s*\n(.*?)\n\s*##") {
        $goal = $matches[1].Trim()
        if ($goal -eq "") {
            $errors += "Goal section is empty"
        } elseif ($goal.Split("`n").Length -gt 1) {
            $warnings += "Goal should be a single sentence, but has multiple lines"
        }
    }

    # Check for forbidden words
    $forbiddenWords = @("optimize", "improve", "enhance", "clean up", "refactor", "etc.")
    foreach ($word in $forbiddenWords) {
        if ($PlanContent -match "\b$word\b") {
            $warnings += "Contains vague language: '$word' - be more specific"
        }
    }

    # Check Steps section (should have numbered steps)
    if ($PlanContent -match "(?s)## Steps\s*\n(.*?)\n\s*##") {
        $stepsSection = $matches[1]
        $stepMatches = [regex]::Matches($stepsSection, "(?m)^[0-9]+\. ")
        if ($stepMatches.Count -eq 0) {
            $errors += "Steps section has no numbered steps"
        } else {
            # Check for model directives
            $modelMatches = [regex]::Matches($stepsSection, "\[(?:OPUS|SONNET|HAIKU)\]")
            if ($modelMatches.Count -eq 0) {
                $warnings += "No model directives found in steps - consider adding [OPUS], [SONNET], or [HAIKU]"
            }
        }
    }

    # Check Constraints section (should have "Do not" rules)
    if ($PlanContent -match "(?s)## Constraints\s*\n(.*?)\n\s*##") {
        $constraintsSection = $matches[1]
        if ($constraintsSection -notmatch "Do not|Keep|Avoid") {
            $warnings += "Constraints section should include specific boundaries (Do not, Keep, Avoid)"
        }
    }

    # Check Done When section (should have testable conditions)
    if ($PlanContent -match "(?s)## Done When\s*\n(.*?)\n\s*##") {
        $doneWhenSection = $matches[1]
        $conditionMatches = [regex]::Matches($doneWhenSection, "(?m)^- ")
        if ($conditionMatches.Count -eq 0) {
            $errors += "Done When section has no conditions (should start with '- ')"
        }
    }

    return @{
        Errors = $errors
        Warnings = $warnings
    }
}

function Test-PlanQuality {
    param([string]$PlanContent)

    $qualityScore = 100
    $suggestions = @()

    # Deduct points for vague language
    $vagueWords = @("optimize", "improve", "enhance", "clean up", "refactor", "etc.", "good", "better", "nice")
    foreach ($word in $vagueWords) {
        $matches = [regex]::Matches($PlanContent, "\b$word\b", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($matches.Count -gt 0) {
            $qualityScore -= ($matches.Count * 5)
            $suggestions += "Replace vague word '$word' with specific actions"
        }
    }

    # Check for specific file paths
    $hasFilePaths = $PlanContent -match "\.[a-z]{2,4}|src/|components/|scripts/"
    if (-not $hasFilePaths) {
        $qualityScore -= 10
        $suggestions += "Consider adding specific file paths where changes will be made"
    }

    # Check for testable success criteria
    $testableWords = @("test", "pass", "fail", "success", "error", "status", "response")
    $hasTestable = $false
    foreach ($word in $testableWords) {
        if ($PlanContent -match "\b$word\b") {
            $hasTestable = $true
            break
        }
    }
    if (-not $hasTestable) {
        $qualityScore -= 15
        $suggestions += "Add testable success criteria (tests pass, API returns 200, UI shows X)"
    }

    # Ensure score doesn't go negative
    $qualityScore = [math]::Max(0, $qualityScore)

    return @{
        Score = $qualityScore
        Suggestions = $suggestions
    }
}

# Main execution
$detectedPlan = Find-PlanFile -PlanFile $PlanFile

Write-Host "🔍 Linting plan: $detectedPlan"

if (-not (Test-Path $detectedPlan)) {
    Write-Host "❌ Plan file not found: $detectedPlan"
    exit 1
}

# Read plan content
$planContent = Get-Content $detectedPlan -Raw

# Test plan structure
$structureResults = Test-PlanStructure -PlanContent $planContent

# Test plan quality
$qualityResults = Test-PlanQuality -PlanContent $planContent

# Report results
$hasErrors = $structureResults.Errors.Count -gt 0
$hasWarnings = $structureResults.Warnings.Count -gt 0 -or $qualityResults.Suggestions.Count -gt 0

if (-not $hasErrors -and -not $hasWarnings) {
    Write-Host "✅ Plan is valid and ready for execution"
    Write-Host "📝 Plan file: $detectedPlan"
    Write-Host "🎯 Ready to execute with: .\scripts\ai-run.ps1"
    exit 0
}

# Show errors
if ($hasErrors) {
    Write-Host ""
    Write-Host "❌ STRUCTURAL ERRORS:"
    foreach ($error in $structureResults.Errors) {
        Write-Host "   • $error"
    }
}

# Show warnings
if ($hasWarnings) {
    Write-Host ""
    Write-Host "⚠️  QUALITY WARNINGS:"
    foreach ($warning in $structureResults.Warnings) {
        Write-Host "   • $warning"
    }
    foreach ($suggestion in $qualityResults.Suggestions) {
        Write-Host "   • $suggestion"
    }
}

# Show quality score
Write-Host ""
Write-Host "📊 Quality Score: $($qualityResults.Score)/100"

if ($qualityResults.Score -ge 80) {
    Write-Host "✅ Plan quality is acceptable"
} elseif ($qualityResults.Score -ge 60) {
    Write-Host "⚠️  Plan quality needs improvement"
} else {
    Write-Host "❌ Plan quality is too low for safe execution"
}

# Exit with error code if there are structural errors
if ($hasErrors) {
    Write-Host ""
    Write-Host "❌ Plan validation failed due to structural errors"
    Write-Host "Fix the errors above before executing the plan"
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ Plan structure is valid - ready for execution"
    Write-Host "💡 Address warnings above to improve plan quality"
    exit 0
}