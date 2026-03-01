# Context Monitor - Real-time 70% auto-handoff system
# Fixes the critical bug where auto-handoff at 70% context usage was not working

param(
    [int]$Threshold = 70,           # Percentage to trigger handoff
    [int]$CheckInterval = 30,       # Seconds between checks
    [switch]$Install,               # Install as background service
    [switch]$Test,                  # Test current context estimation
    [switch]$Force                  # Force immediate handoff if over threshold
)

$script:ContextData = @{
    EstimatedUsage = 0
    LastCheck = Get-Date
    HandoffTriggered = $false
    SessionStart = Get-Date
}

function Get-ActualContextUsage {
    # Try to get actual token count from context-tracker.ps1
    try {
        $trackerPath = "$PSScriptRoot\context-tracker.ps1"
        if (-not (Test-Path $trackerPath)) {
            return $null
        }

        # Call context tracker to get current status
        $result = & powershell -File $trackerPath -Action status 2>$null

        # Parse the output to extract usage data
        if ($result) {
            # Look for session data from the tracker
            $sessionFile = "$PSScriptRoot\claude-session-context.json"
            if (Test-Path $sessionFile) {
                $sessionJson = Get-Content $sessionFile -Raw -Encoding UTF8
                $sessionData = $sessionJson | ConvertFrom-Json

                if ($sessionData.totalTokens -gt 0) {
                    $percentage = [math]::Round(($sessionData.totalTokens / $sessionData.maxTokens) * 100, 1)
                    return @{
                        Percentage = $percentage
                        Tokens = $sessionData.totalTokens
                        MaxTokens = $sessionData.maxTokens
                        IsAccurate = $true
                        Source = "context_tracker"
                        LastUpdate = $sessionData.lastUpdate
                    }
                }
            }
        }

        return $null
    }
    catch {
        # Context tracker not available, use estimation
        return $null
    }
}

function Get-ContextEstimation {
    # FIXED: Use ONLY exact token measurements, no more estimation fallbacks

    # Always try to get actual token count from context-tracker first
    $actualUsage = Get-ActualContextUsage
    if ($actualUsage -and $actualUsage.IsAccurate) {
        return @{
            EstimatedUsage = $actualUsage.Percentage
            Factors = @{ "exact_tokens" = $actualUsage.Percentage }
            Timestamp = Get-Date
            SessionDuration = ((Get-Date) - $script:ContextData.SessionStart).TotalMinutes
            Source = "exact_measurement"
            Tokens = $actualUsage.Tokens
            MaxTokens = $actualUsage.MaxTokens
        }
    }

    # If context-tracker not available, show error instead of broken estimates
    Write-Host "ERROR: Context tracker not available - cannot provide accurate context" -ForegroundColor Red
    return @{
        EstimatedUsage = 0
        Factors = @{ "error" = "Context tracker unavailable" }
        Timestamp = Get-Date
        SessionDuration = ((Get-Date) - $script:ContextData.SessionStart).TotalMinutes
        Source = "error_no_tracker"
        Tokens = 0
        MaxTokens = 188000
    }


function Trigger-AutoHandoff {
    param($ContextData)

    Write-Host ""
    Write-Host "🚨 AUTO-HANDOFF TRIGGERED!" -ForegroundColor Red -BackgroundColor White
    Write-Host "================================" -ForegroundColor Red
    Write-Host "Context Usage: $($ContextData.EstimatedUsage.ToString('F1'))%" -ForegroundColor Yellow
    Write-Host "Threshold: $Threshold%" -ForegroundColor Yellow
    Write-Host "Session Duration: $($ContextData.SessionDuration.ToString('F1')) minutes" -ForegroundColor Yellow

    if ($ContextData.Source -eq "exact_measurement") {
        Write-Host "Measurement: EXACT TOKENS ($($ContextData.Tokens)/$($ContextData.MaxTokens))" -ForegroundColor Green
    } else {
        Write-Host "Measurement: ERROR - Context tracker unavailable" -ForegroundColor Red
    }
    Write-Host ""

    $script:ContextData.HandoffTriggered = $true

    # Update progress with handoff notification
    $handoffEntry = @"

## AUTO-HANDOFF TRIGGERED - $(Get-Date)
**Context Usage**: $($ContextData.EstimatedUsage.ToString('F1'))% (Threshold: $Threshold%)
**Session Duration**: $($ContextData.SessionDuration.ToString('F1')) minutes
**Factors**:
"@

    foreach ($factor in $ContextData.Factors.Keys) {
        $handoffEntry += "`n- $factor`: $($ContextData.Factors[$factor].ToString('F1'))%"
    }

    $handoffEntry += @"

**⚠️ IMMEDIATE ACTION REQUIRED: Run /handoff command to complete session transition**

This auto-handoff was triggered to prevent context window truncation and preserve all work.

---

"@

    if (Test-Path "claude-progress.txt") {
        Add-Content "claude-progress.txt" $handoffEntry
    }

    # Create alert file for other systems to detect
    $alert = @{
        timestamp = Get-Date
        contextUsage = $ContextData.EstimatedUsage
        sessionDuration = $ContextData.SessionDuration
        factors = $ContextData.Factors
        action = "HANDOFF_REQUIRED"
        message = "Context usage exceeded $Threshold%. Run /handoff immediately."
    }

    $alertPath = ".claude\auto-handoff-alert.json"
    if (!(Test-Path ".claude")) { New-Item -Type Directory ".claude" -Force | Out-Null }
    $alert | ConvertTo-Json -Depth 3 | Set-Content $alertPath

    Write-Host "💡 RUN THIS COMMAND NOW:" -ForegroundColor White -BackgroundColor Red
    Write-Host "   /handoff" -ForegroundColor White -BackgroundColor Red
    Write-Host ""
    Write-Host "This will:" -ForegroundColor Cyan
    Write-Host "  ✅ Save all current work and state" -ForegroundColor Green
    Write-Host "  ✅ Reset context window to 0%" -ForegroundColor Green
    Write-Host "  ✅ Prepare for clean session continuation" -ForegroundColor Green
    Write-Host ""

    # Try to get user attention with system notification
    try {
        $message = "Claude Code: Auto-handoff triggered at $($ContextData.EstimatedUsage.ToString('F1'))% context usage. Run /handoff command."
        Start-Process "msg" -ArgumentList "*", "/TIME:30", $message -NoNewWindow -ErrorAction SilentlyContinue
    } catch {
        # msg command not available, continue silently
    }

    return $true
}

function Start-ContextMonitoring {
    Write-Host "🔄 Starting Auto-Handoff Context Monitoring..." -ForegroundColor Green
    Write-Host "Threshold: $Threshold%" -ForegroundColor Yellow
    Write-Host "Check Interval: $CheckInterval seconds" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
    Write-Host ""

    # Initial check
    $initialContext = Get-ContextEstimation
    if ($initialContext.EstimatedUsage -ge $Threshold) {
        Write-Host "⚠️ ALREADY OVER THRESHOLD!" -ForegroundColor Red
        Write-Host "Current: $($initialContext.EstimatedUsage.ToString('F1'))%" -ForegroundColor Yellow

        if ($Force) {
            Trigger-AutoHandoff $initialContext
            return
        } else {
            Write-Host "Use -Force parameter to trigger immediate handoff" -ForegroundColor Gray
        }
    }

    # Continuous monitoring loop
    while (!$script:ContextData.HandoffTriggered) {
        $contextData = Get-ContextEstimation

        $timestamp = (Get-Date).ToString("HH:mm:ss")
        $usageColor = if ($contextData.EstimatedUsage -ge $Threshold) { "Red" }
                     elseif ($contextData.EstimatedUsage -ge ($Threshold - 10)) { "Yellow" }
                     else { "Green" }

        if ($contextData.Source -eq "exact_measurement") {
            Write-Host "[$timestamp] Context: $($contextData.EstimatedUsage.ToString('F1'))% ($($contextData.Tokens)/$($contextData.MaxTokens) exact)" -ForegroundColor $usageColor
        } elseif ($contextData.Source -eq "error_no_tracker") {
            Write-Host "[$timestamp] Context: ERROR - Tracker unavailable" -ForegroundColor Red
        } else {
            Write-Host "[$timestamp] Context: $($contextData.EstimatedUsage.ToString('F1'))% (source: $($contextData.Source))" -ForegroundColor $usageColor
        }

        # Check if handoff should trigger
        if ($contextData.EstimatedUsage -ge $Threshold) {
            Trigger-AutoHandoff $contextData
            break
        }

        Start-Sleep $CheckInterval
    }

    if ($script:ContextData.HandoffTriggered) {
        Write-Host "⏹️ Monitoring stopped - handoff triggered" -ForegroundColor Red
    }
}

function Install-ContextMonitoringService {
    Write-Host "⚙️ Installing Auto-Handoff Context Monitoring Service..." -ForegroundColor Cyan

    # Create background monitor script
    $backgroundScript = @"
# Auto-Handoff Background Monitor Service
param([int]`$Threshold = 70, [int]`$Interval = 30)

Set-Location "$PWD"

try {
    & "context-monitor.ps1" -Threshold `$Threshold -CheckInterval `$Interval
} catch {
    Add-Content ".claude\auto-handoff-error.log" "$(Get-Date): `$(`$_.Exception.Message)"
}
"@

    $backgroundPath = "context-monitor-background.ps1"
    $backgroundScript | Set-Content $backgroundPath

    # Create startup hook
    $hookDir = ".claude\hooks"
    if (!(Test-Path $hookDir)) { New-Item -Type Directory $hookDir -Force | Out-Null }

    $hookPath = "$hookDir\context-monitor-startup.ps1"
    $hookScript = @"
# Context Monitor Startup Hook - Auto-starts 70% handoff monitoring
try {
    `$process = Start-Process powershell -ArgumentList "-WindowStyle", "Hidden", "-File", "`$PSScriptRoot\..\..\context-monitor-background.ps1" -PassThru
    Add-Content ".claude\auto-handoff-service.log" "$(Get-Date): Context monitor started (PID: `$(`$process.Id))"
} catch {
    Add-Content ".claude\auto-handoff-error.log" "$(Get-Date): Failed to start context monitor: `$(`$_.Exception.Message)"
}
"@

    $hookScript | Set-Content $hookPath

    Write-Host "✅ Auto-handoff service installed:" -ForegroundColor Green
    Write-Host "   Background monitor: $backgroundPath" -ForegroundColor Gray
    Write-Host "   Startup hook: $hookPath" -ForegroundColor Gray
    Write-Host "   Will monitor at 70% threshold every 30 seconds" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Auto-handoff system is now active!" -ForegroundColor Green
}

function Test-ContextEstimation {
    Write-Host "🧪 Testing Context Estimation..." -ForegroundColor Cyan

    $context = Get-ContextEstimation

    Write-Host ""
    Write-Host "📊 Current Context Analysis:" -ForegroundColor Yellow
    Write-Host "  Estimated Usage: $($context.EstimatedUsage.ToString('F1'))%" -ForegroundColor White
    Write-Host "  Session Duration: $($context.SessionDuration.ToString('F1')) minutes" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 Contributing Factors:" -ForegroundColor Yellow

    foreach ($factor in $context.Factors.Keys) {
        $value = $context.Factors[$factor].ToString('F1')
        Write-Host "  $factor`: $value%" -ForegroundColor Gray
    }

    Write-Host ""
    $status = if ($context.EstimatedUsage -ge $Threshold) {
        "[!] OVER THRESHOLD - Handoff should trigger"
    } elseif ($context.EstimatedUsage -ge ($Threshold - 10)) {
        "[W] APPROACHING THRESHOLD"
    } else {
        "[OK] HEALTHY"
    }

    Write-Host "Status: $status" -ForegroundColor White

    if ($context.EstimatedUsage -ge $Threshold) {
        Write-Host ""
        Write-Host "⚠️ This session should trigger auto-handoff!" -ForegroundColor Red
        Write-Host "Use: .\context-monitor.ps1 -Force" -ForegroundColor Yellow
        Write-Host "Or: /handoff" -ForegroundColor Yellow
    }

    return $context
}

# Main execution
Write-Host "🤖 AUTO-HANDOFF CONTEXT MONITOR" -ForegroundColor Magenta
Write-Host "===============================" -ForegroundColor Magenta

if ($Install) {
    Install-ContextMonitoringService
    return
}

if ($Test) {
    Test-ContextEstimation
    return
}

# Start monitoring
Start-ContextMonitoring

Write-Host ""
Write-Host "📋 Usage Examples:" -ForegroundColor Cyan
Write-Host "  .\context-monitor.ps1                  # Start monitoring (70% threshold)"
Write-Host "  .\context-monitor.ps1 -Threshold 60    # Custom threshold"
Write-Host "  .\context-monitor.ps1 -Test            # Test current context"
Write-Host "  .\context-monitor.ps1 -Install         # Install as service"
Write-Host "  .\context-monitor.ps1 -Force           # Force handoff if over threshold"