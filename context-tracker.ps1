# Context Tracker - Real Claude API Token Monitoring
# Fixes the 36% estimation error by using actual Claude token counts

param(
    [string]$Action = "status",
    [string]$ClaudeOutput = "",
    [switch]$Reset,
    [switch]$Debug
)

# Model-specific context windows (actual tested values)
$ContextWindows = @{
    "claude-sonnet-4-20250514" = 188000  # Haiku 4.5 actual limit
    "claude-sonnet-3-5-v2-20241022" = 188000  # Sonnet 3.5
    "claude-opus-4-5-20251101" = 498000  # Opus 4.5 actual limit
    "claude-3-haiku-20240307" = 188000  # Haiku 3
    "default" = 188000  # Conservative default
}

# Session storage file
$SessionFile = "$PSScriptRoot\claude-session-context.json"

function Write-Debug-Log {
    param([string]$Message)
    if ($Debug) {
        Write-Host "[DEBUG] $Message" -ForegroundColor Yellow
    }
}

function Initialize-Session {
    Write-Debug-Log "Initializing new session context"

    $sessionData = @{
        sessionId = [Guid]::NewGuid().ToString()
        startTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
        model = "claude-sonnet-4-20250514"  # Default to current Haiku 4.5
        maxTokens = $ContextWindows["claude-sonnet-4-20250514"]
        inputTokens = 0
        outputTokens = 0
        totalTokens = 0
        lastUpdate = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
        interactions = 0
        estimationHistory = @()
        handoffWarnings = @()
    }

    $sessionData | ConvertTo-Json -Depth 3 | Set-Content $SessionFile -Encoding UTF8
    Write-Debug-Log "Session initialized with ID: $($sessionData.sessionId)"
    return $sessionData
}

function Get-SessionContext {
    if (-not (Test-Path $SessionFile) -or $Reset) {
        return Initialize-Session
    }

    try {
        $sessionJson = Get-Content $SessionFile -Raw -Encoding UTF8
        $sessionData = $sessionJson | ConvertFrom-Json

        # Convert to hashtable for easier manipulation
        $session = @{}
        $sessionData.PSObject.Properties | ForEach-Object { $session[$_.Name] = $_.Value }

        return $session
    }
    catch {
        Write-Warning "Error reading session file: $_"
        return Initialize-Session
    }
}

function Save-SessionContext {
    param([hashtable]$Session)

    $Session.lastUpdate = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    $Session | ConvertTo-Json -Depth 3 | Set-Content $SessionFile -Encoding UTF8
    Write-Debug-Log "Session saved with $($Session.totalTokens) total tokens"
}

function Parse-ClaudeResponse {
    param([string]$Output)

    Write-Debug-Log "Parsing Claude output for token information"

    # Pattern 1: Look for Claude API response with usage object
    # Example: "usage": {"input_tokens": 12345, "output_tokens": 6789}
    if ($Output -match '"usage":\s*\{[^}]*"input_tokens":\s*(\d+)[^}]*"output_tokens":\s*(\d+)[^}]*\}') {
        $inputTokens = [int]$Matches[1]
        $outputTokens = [int]$Matches[2]
        Write-Debug-Log "Found API usage object - Input: $inputTokens, Output: $outputTokens"
        return @{
            inputTokens = $inputTokens
            outputTokens = $outputTokens
            source = "api_response"
        }
    }

    # Pattern 2: Look for direct token fields
    # Example: {"input_tokens": 12345, "output_tokens": 6789}
    if ($Output -match '"input_tokens":\s*(\d+).*?"output_tokens":\s*(\d+)') {
        $inputTokens = [int]$Matches[1]
        $outputTokens = [int]$Matches[2]
        Write-Debug-Log "Found direct API tokens - Input: $inputTokens, Output: $outputTokens"
        return @{
            inputTokens = $inputTokens
            outputTokens = $outputTokens
            source = "api_response"
        }
    }

    # Pattern 3: Look for usage summary in Claude CLI output
    # Example: "Token usage: 12345 input, 6789 output"
    if ($Output -match 'Token usage:\s*(\d+)\s+input,?\s*(\d+)\s+output') {
        $inputTokens = [int]$Matches[1]
        $outputTokens = [int]$Matches[2]
        Write-Debug-Log "Found CLI tokens - Input: $inputTokens, Output: $outputTokens"
        return @{
            inputTokens = $inputTokens
            outputTokens = $outputTokens
            source = "cli_output"
        }
    }

    # Pattern 4: Look for percentage-based usage (fallback)
    # Example: "Context usage: 65%"
    if ($Output -match 'Context usage:\s*(\d+)%') {
        $percentage = [int]$Matches[1]
        $estimatedTokens = [int](($percentage / 100) * 188000)
        Write-Debug-Log "Found percentage usage: $percentage% (~$estimatedTokens tokens)"
        return @{
            inputTokens = 0
            outputTokens = 0
            estimatedTokens = $estimatedTokens
            percentage = $percentage
            source = "percentage_estimate"
        }
    }

    Write-Debug-Log "No token information found in output"
    return $null
}

function Update-TokenCount {
    param(
        [string]$ClaudeOutput
    )

    $session = Get-SessionContext
    $tokenInfo = Parse-ClaudeResponse $ClaudeOutput

    if ($null -eq $tokenInfo) {
        Write-Debug-Log "No token information to update"
        return $session
    }

    # Update session with new token counts
    if ($tokenInfo.source -eq "api_response" -or $tokenInfo.source -eq "cli_output") {
        $session.inputTokens += $tokenInfo.inputTokens
        $session.outputTokens += $tokenInfo.outputTokens
        $session.totalTokens = $session.inputTokens + $session.outputTokens
        $session.interactions++

        Write-Debug-Log "Updated tokens - Total: $($session.totalTokens) (Input: $($session.inputTokens), Output: $($session.outputTokens))"
    }
    elseif ($tokenInfo.source -eq "percentage_estimate") {
        # Use percentage as fallback, but mark it as estimated
        $session.totalTokens = $tokenInfo.estimatedTokens
        $session.lastEstimatedPercentage = $tokenInfo.percentage
        Write-Debug-Log "Updated with estimated tokens: $($session.totalTokens)"
    }

    # Add to estimation history for accuracy tracking
    $historyEntry = @{
        timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
        tokens = $session.totalTokens
        source = $tokenInfo.source
        inputTokens = $session.inputTokens
        outputTokens = $session.outputTokens
    }

    if ($null -eq $session.estimationHistory) {
        $session.estimationHistory = @()
    }
    $session.estimationHistory += $historyEntry

    Save-SessionContext $session
    return $session
}

function Get-ContextPercentage {
    param([hashtable]$Session)

    $maxTokens = $Session.maxTokens
    $currentTokens = $Session.totalTokens

    if ($maxTokens -eq 0) {
        return 0
    }

    $percentage = [math]::Round(($currentTokens / $maxTokens) * 100, 1)
    return $percentage
}

function Check-HandoffThreshold {
    param([hashtable]$Session)

    $percentage = Get-ContextPercentage $Session
    $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"

    Write-Debug-Log "Checking handoff threshold - Current: $percentage%"

    if ($null -eq $Session.handoffWarnings) {
        $Session.handoffWarnings = @()
    }

    # Critical threshold: 85% (emergency handoff)
    if ($percentage -ge 85) {
        $warning = @{
            level = "EMERGENCY"
            percentage = $percentage
            timestamp = $timestamp
            message = "CRITICAL: $percentage% context used. IMMEDIATE /handoff required!"
            color = "Red"
        }
        $Session.handoffWarnings += $warning
        return $warning
    }

    # High threshold: 70% (required handoff per CLAUDE.md)
    if ($percentage -ge 70) {
        $warning = @{
            level = "REQUIRED"
            percentage = $percentage
            timestamp = $timestamp
            message = "HANDOFF REQUIRED: $percentage% context used. Auto-handoff should trigger now."
            color = "Magenta"
        }
        $Session.handoffWarnings += $warning
        return $warning
    }

    # Warning threshold: 60% (prepare for handoff)
    if ($percentage -ge 60) {
        $warning = @{
            level = "WARNING"
            percentage = $percentage
            timestamp = $timestamp
            message = "Handoff recommended: $percentage% context used. Consider /handoff soon."
            color = "Yellow"
        }
        $Session.handoffWarnings += $warning
        return $warning
    }

    # All good
    return @{
        level = "OK"
        percentage = $percentage
        timestamp = $timestamp
        message = "Context usage: $percentage% - Safe to continue"
        color = "Green"
    }
}

function Show-ContextStatus {
    $session = Get-SessionContext
    $percentage = Get-ContextPercentage $session
    $warning = Check-HandoffThreshold $session

    Write-Host "`n=== CONTEXT TRACKER STATUS ===" -ForegroundColor Cyan
    Write-Host "Session ID: $($session.sessionId)"
    Write-Host "Model: $($session.model)"
    Write-Host "Max Context: $($session.maxTokens) tokens"
    Write-Host "Current Usage: $($session.totalTokens) tokens ($percentage%)" -ForegroundColor $(
        if ($percentage -ge 85) { "Red" }
        elseif ($percentage -ge 70) { "Magenta" }
        elseif ($percentage -ge 60) { "Yellow" }
        else { "Green" }
    )
    Write-Host "Input Tokens: $($session.inputTokens)"
    Write-Host "Output Tokens: $($session.outputTokens)"
    Write-Host "Interactions: $($session.interactions)"
    Write-Host "Last Update: $($session.lastUpdate)"

    # Show current warning/status
    Write-Host "`n$($warning.message)" -ForegroundColor $warning.color

    # Show recent estimation history
    if ($session.estimationHistory -and $session.estimationHistory.Count -gt 0) {
        Write-Host "`n--- Recent Token Updates ---" -ForegroundColor Cyan
        $recent = $session.estimationHistory | Select-Object -Last 5
        foreach ($entry in $recent) {
            Write-Host "$($entry.timestamp): $($entry.tokens) tokens (source: $($entry.source))"
        }
    }

    # Show handoff warnings
    if ($session.handoffWarnings -and $session.handoffWarnings.Count -gt 0) {
        Write-Host "`n--- Handoff Warnings ---" -ForegroundColor Red
        $recentWarnings = $session.handoffWarnings | Select-Object -Last 3
        foreach ($warning_item in $recentWarnings) {
            Write-Host "$($warning_item.timestamp): $($warning_item.message)" -ForegroundColor $warning_item.color
        }
    }

    Write-Host ""
    return @{
        percentage = $percentage
        tokens = $session.totalTokens
        maxTokens = $session.maxTokens
        warning = $warning
        session = $session
    }
}

function Reset-Session {
    if (Test-Path $SessionFile) {
        Remove-Item $SessionFile -Force
        Write-Host "Session context reset" -ForegroundColor Green
    }
    Initialize-Session | Out-Null
    Write-Host "New session initialized" -ForegroundColor Green
}

# Main execution logic
switch ($Action.ToLower()) {
    "status" {
        Show-ContextStatus
    }
    "update" {
        if ([string]::IsNullOrWhiteSpace($ClaudeOutput)) {
            Write-Error "No Claude output provided for parsing. Use: -ClaudeOutput 'response text'"
            exit 1
        }
        $session = Update-TokenCount $ClaudeOutput
        $result = Show-ContextStatus

        # Return warning level for script automation
        if ($result.warning.level -ne "OK") {
            exit 2  # Warning/handoff needed
        }
    }
    "reset" {
        Reset-Session
    }
    "test" {
        # Test with sample Claude API response
        $sampleResponse = @"
{
  "content": [{"text": "Here's your answer..."}],
  "usage": {
    "input_tokens": 15432,
    "output_tokens": 3241
  }
}
"@
        Write-Host "Testing with sample API response..." -ForegroundColor Cyan
        Update-TokenCount $sampleResponse
        Show-ContextStatus
    }
    default {
        Write-Host "Usage: .\context-tracker.ps1 -Action <status|update|reset|test>" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\context-tracker.ps1 -Action status          # Show current context usage"
        Write-Host "  .\context-tracker.ps1 -Action reset           # Reset session context"
        Write-Host "  .\context-tracker.ps1 -Action test            # Test with sample data"
        Write-Host "  .\context-tracker.ps1 -Action update -ClaudeOutput `"{\`"input_tokens\`":1000...}`""
        Write-Host ""
        Write-Host "This replaces the broken estimation system with actual Claude API token counts."
    }
}