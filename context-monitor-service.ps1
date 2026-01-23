# Context Monitor Service - Real-time Token Monitoring
# The missing auto-handoff implementation for 70% context threshold

param(
    [switch]$Start,              # Start the monitoring service
    [switch]$Stop,               # Stop the monitoring service
    [switch]$Status,             # Show service status
    [switch]$Install,            # Install service to auto-start
    [int]$Threshold = 70,        # Auto-handoff threshold percentage
    [switch]$Debug
)

$ServiceName = "ClaudeContextMonitor"
$LogFile = "$PSScriptRoot\context-monitor.log"
$PidFile = "$PSScriptRoot\context-monitor.pid"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"

    if ($Debug -or $Level -eq "ERROR") {
        Write-Host $logEntry -ForegroundColor $(if ($Level -eq "ERROR") { "Red" } else { "Green" })
    }

    Add-Content -Path $LogFile -Value $logEntry -Encoding UTF8
}

function Get-ServiceStatus {
    if (-not (Test-Path $PidFile)) {
        return @{ Running = $false; PID = $null }
    }

    try {
        $pid = Get-Content $PidFile -ErrorAction Stop
        $process = Get-Process -Id $pid -ErrorAction Stop

        if ($process.ProcessName -like "*powershell*") {
            return @{ Running = $true; PID = $pid; Process = $process }
        }
    }
    catch {
        # Process not found, clean up stale PID file
        Remove-Item $PidFile -ErrorAction SilentlyContinue
    }

    return @{ Running = $false; PID = $null }
}

function Start-MonitoringService {
    $status = Get-ServiceStatus

    if ($status.Running) {
        Write-Log "Context monitoring service already running (PID: $($status.PID))" "WARN"
        return $false
    }

    Write-Log "Starting context monitoring service..."

    # Start background monitoring process
    $scriptBlock = {
        param($TrackerPath, $LogFile, $Threshold, $Debug)

        function Write-ServiceLog {
            param([string]$Message, [string]$Level = "INFO")
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Add-Content -Path $LogFile -Value "[$timestamp] [SERVICE] [$Level] $Message" -Encoding UTF8
        }

        Write-ServiceLog "Context monitoring service started (PID: $PID)"
        Write-ServiceLog "Monitoring threshold: $Threshold%"

        $lastCheck = Get-Date
        $handoffTriggered = $false

        while ($true) {
            try {
                # Check if context tracker session file exists and has recent activity
                $sessionFile = Split-Path $TrackerPath -Parent | Join-Path -ChildPath "claude-session-context.json"

                if (Test-Path $sessionFile) {
                    $sessionData = Get-Content $sessionFile -Raw | ConvertFrom-Json

                    if ($sessionData.totalTokens -gt 0) {
                        $percentage = [math]::Round(($sessionData.totalTokens / $sessionData.maxTokens) * 100, 1)

                        Write-ServiceLog "Current context usage: $percentage% ($($sessionData.totalTokens)/$($sessionData.maxTokens) tokens)"

                        # Check thresholds
                        if ($percentage -ge 85 -and -not $handoffTriggered) {
                            Write-ServiceLog "EMERGENCY: $percentage% context usage - IMMEDIATE handoff required!" "ERROR"

                            # Show emergency notification
                            try {
                                $message = "EMERGENCY: Claude context at $percentage%! Run /handoff immediately!"
                                Start-Process "msg" -ArgumentList "*", "/TIME:30", $message -NoNewWindow -ErrorAction SilentlyContinue
                            } catch {}

                            $handoffTriggered = $true
                        }
                        elseif ($percentage -ge $Threshold -and -not $handoffTriggered) {
                            Write-ServiceLog "HANDOFF TRIGGERED: $percentage% context usage (threshold: $Threshold%)" "WARN"

                            # Show handoff notification
                            try {
                                $message = "Claude context at $percentage% (threshold: $Threshold%). Run /handoff to continue work."
                                Start-Process "msg" -ArgumentList "*", "/TIME:15", $message -NoNewWindow -ErrorAction SilentlyContinue
                            } catch {}

                            # Write handoff trigger file for other scripts to detect
                            $handoffFile = Split-Path $TrackerPath -Parent | Join-Path -ChildPath "handoff-required.flag"
                            @{
                                timestamp = Get-Date
                                percentage = $percentage
                                tokens = $sessionData.totalTokens
                                maxTokens = $sessionData.maxTokens
                                threshold = $Threshold
                            } | ConvertTo-Json | Set-Content $handoffFile

                            $handoffTriggered = $true
                        }
                        elseif ($percentage -lt ($Threshold - 10)) {
                            # Reset handoff flag if usage drops significantly (new session)
                            $handoffTriggered = $false
                        }
                    }
                }

                # Monitor every 15 seconds
                Start-Sleep -Seconds 15

            }
            catch {
                Write-ServiceLog "Error in monitoring loop: $_" "ERROR"
                Start-Sleep -Seconds 30  # Wait longer on error
            }
        }
    }

    # Start the background job
    $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList "$PSScriptRoot\context-tracker.ps1", $LogFile, $Threshold, $Debug

    # Save PID for management
    $job.Id | Set-Content $PidFile

    Write-Log "Context monitoring service started (Job ID: $($job.Id))"
    return $true
}

function Stop-MonitoringService {
    $status = Get-ServiceStatus

    if (-not $status.Running) {
        Write-Log "Context monitoring service not running" "WARN"
        return $false
    }

    Write-Log "Stopping context monitoring service (PID: $($status.PID))..."

    try {
        # Stop the job
        Get-Job -Id $status.PID -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue
        Get-Job -Id $status.PID -ErrorAction SilentlyContinue | Remove-Job -ErrorAction SilentlyContinue

        # Clean up PID file
        Remove-Item $PidFile -ErrorAction SilentlyContinue

        # Clean up handoff flag
        $handoffFile = "$PSScriptRoot\handoff-required.flag"
        Remove-Item $handoffFile -ErrorAction SilentlyContinue

        Write-Log "Context monitoring service stopped"
        return $true
    }
    catch {
        Write-Log "Error stopping service: $_" "ERROR"
        return $false
    }
}

function Install-MonitoringService {
    # Create startup script for session initialization
    $startupScript = @"
# Auto-start context monitoring on session start
# Add this to your PowerShell profile or run manually

Write-Host "Starting Claude context monitoring..." -ForegroundColor Green
& "$PSScriptRoot\context-monitor-service.ps1" -Start -Threshold $Threshold
"@

    $startupPath = "$PSScriptRoot\start-context-monitor.ps1"
    $startupScript | Set-Content $startupPath -Encoding UTF8

    Write-Host ""
    Write-Host "✅ Context monitoring service installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To auto-start on each session, add this to your CLAUDE.md:" -ForegroundColor Yellow
    Write-Host "``````"
    Write-Host "& '$startupPath'"
    Write-Host "``````"
    Write-Host ""
    Write-Host "Or run manually: $startupPath"
    Write-Host ""
}

function Show-ServiceStatus {
    $status = Get-ServiceStatus

    Write-Host ""
    Write-Host "=== CONTEXT MONITORING SERVICE STATUS ===" -ForegroundColor Cyan

    if ($status.Running) {
        Write-Host "Status: RUNNING ✅" -ForegroundColor Green
        Write-Host "PID: $($status.PID)"
        Write-Host "Started: $($status.Process.StartTime)"
        Write-Host "CPU Time: $($status.Process.TotalProcessorTime)"

        # Show recent logs
        if (Test-Path $LogFile) {
            $recentLogs = Get-Content $LogFile -Tail 5 -ErrorAction SilentlyContinue
            if ($recentLogs) {
                Write-Host ""
                Write-Host "Recent Activity:" -ForegroundColor Cyan
                foreach ($log in $recentLogs) {
                    Write-Host "  $log" -ForegroundColor Gray
                }
            }
        }

        # Check for handoff flag
        $handoffFile = "$PSScriptRoot\handoff-required.flag"
        if (Test-Path $handoffFile) {
            Write-Host ""
            Write-Host "🚨 HANDOFF REQUIRED!" -ForegroundColor Red -BackgroundColor White
            try {
                $handoffData = Get-Content $handoffFile | ConvertFrom-Json
                Write-Host "Context: $($handoffData.percentage)% (triggered at $($handoffData.timestamp))" -ForegroundColor Yellow
            } catch {}
        }
    }
    else {
        Write-Host "Status: NOT RUNNING ❌" -ForegroundColor Red
        Write-Host "The 70% auto-handoff system is DISABLED"
        Write-Host ""
        Write-Host "To enable: .\context-monitor-service.ps1 -Start" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Threshold: $Threshold% (handoff trigger)" -ForegroundColor Cyan
    Write-Host "Log File: $LogFile"
    Write-Host ""
}

# Main execution
switch ($true) {
    $Start {
        if (Start-MonitoringService) {
            Write-Host "✅ Context monitoring service started" -ForegroundColor Green
            Write-Host "Auto-handoff will trigger at $Threshold% context usage" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Failed to start context monitoring service" -ForegroundColor Red
        }
    }

    $Stop {
        if (Stop-MonitoringService) {
            Write-Host "✅ Context monitoring service stopped" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to stop context monitoring service" -ForegroundColor Red
        }
    }

    $Install {
        Install-MonitoringService
    }

    $Status {
        Show-ServiceStatus
    }

    default {
        Show-ServiceStatus
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\context-monitor-service.ps1 -Start           # Start monitoring service"
        Write-Host "  .\context-monitor-service.ps1 -Stop            # Stop monitoring service"
        Write-Host "  .\context-monitor-service.ps1 -Status          # Show service status"
        Write-Host "  .\context-monitor-service.ps1 -Install         # Install for auto-start"
        Write-Host ""
        Write-Host "This service monitors Claude API responses for actual token counts"
        Write-Host "and triggers auto-handoff at 70% context usage as specified in CLAUDE.md"
    }
}