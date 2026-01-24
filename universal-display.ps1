# Universal Display - Works from any directory
# Shows branch and context info in window title and console

param(
    [switch]$SetTitle,    # Set window title
    [switch]$ShowInfo,    # Show info in console
    [switch]$Both         # Both title and console
)

$toolkitPath = "C:\dev\claude-code-toolkit"

function Get-GitInfo {
    try {
        # Try current directory first
        $branch = git rev-parse --abbrev-ref HEAD 2>$null
        if (-not $branch) {
            # Try toolkit directory
            Push-Location $toolkitPath
            $branch = git rev-parse --abbrev-ref HEAD 2>$null
            Pop-Location
        }

        if (-not $branch) { return @{ repo = "No Git"; branch = "none"; uncommitted = 0 } }

        $status = git status --porcelain 2>$null
        $uncommittedCount = if ($status) { $status.Count } else { 0 }
        $repo = Split-Path (git rev-parse --show-toplevel 2>$null) -Leaf
        if (-not $repo) { $repo = "Unknown" }

        return @{
            repo = $repo
            branch = $branch
            uncommitted = $uncommittedCount
        }
    } catch {
        return @{ repo = "Git Error"; branch = "unknown"; uncommitted = 0 }
    }
}

function Get-ContextInfo {
    try {
        $sessionFile = Join-Path $toolkitPath "claude-session-context.json"
        if (Test-Path $sessionFile) {
            $sessionData = Get-Content $sessionFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($sessionData.totalTokens -gt 0) {
                $percentage = [math]::Round(($sessionData.totalTokens / $sessionData.maxTokens) * 100, 1)
                return "Context: $percentage% ($($sessionData.totalTokens)/$($sessionData.maxTokens))"
            }
        }
        return "Context: No session data"
    } catch {
        return "Context: Error reading data"
    }
}

# Get current info
$gitInfo = Get-GitInfo
$contextInfo = Get-ContextInfo

# Format display
if ($gitInfo.uncommitted -eq 0) {
    $titleText = "$($gitInfo.repo) [$($gitInfo.branch)] Clean | $contextInfo"
    $consoleText = "Branch: $($gitInfo.branch) (clean) | $contextInfo"
} else {
    $titleText = "$($gitInfo.repo) [$($gitInfo.branch)] ($($gitInfo.uncommitted) uncommitted) | $contextInfo"
    $consoleText = "Branch: $($gitInfo.branch) ($($gitInfo.uncommitted) uncommitted) | $contextInfo"
}

# Set window title if requested
if ($SetTitle -or $Both -or (!$SetTitle -and !$ShowInfo -and !$Both)) {
    try {
        $Host.UI.RawUI.WindowTitle = $titleText
        Write-Host "✓ Window title updated" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to set window title: $_" -ForegroundColor Red
    }
}

# Show in console if requested
if ($ShowInfo -or $Both -or (!$SetTitle -and !$ShowInfo -and !$Both)) {
    Write-Host ""
    Write-Host $consoleText -ForegroundColor Cyan
    Write-Host ""
}

# Show current working directory for reference
Write-Host "Current directory: $PWD" -ForegroundColor Gray
Write-Host "Toolkit path: $toolkitPath" -ForegroundColor Gray