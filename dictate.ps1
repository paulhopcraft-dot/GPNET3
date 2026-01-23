<#
.SYNOPSIS
    Real-time dictation using Whisper AI

.DESCRIPTION
    Record from microphone, transcribe with Whisper, copy to clipboard.
    Perfect for dictating into ChatGPT, Claude, or any text application.

.PARAMETER Duration
    Recording duration in seconds (default: manual - press Enter to stop)

.PARAMETER Model
    Whisper model: tiny (fastest), base, small (default), medium, large (most accurate)

.PARAMETER NoClipboard
    Don't copy to clipboard

.EXAMPLE
    .\dictate.ps1
    Record until you press Enter, then transcribe

.EXAMPLE
    .\dictate.ps1 -Duration 30
    Record for 30 seconds

.EXAMPLE
    .\dictate.ps1 -Model medium
    Use more accurate model (slower)

.NOTES
    Requires: Python, Whisper, sounddevice, pyperclip
    First run may be slow (downloads Whisper model)
    Subsequent runs are fast
#>

param(
    [int]$Duration = 0,
    [ValidateSet("tiny", "base", "small", "medium", "large")]
    [string]$Model = "small",
    [switch]$NoClipboard
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host $msg -ForegroundColor Red }

# Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Err "❌ Python not found"
    Write-Host "   Install: winget install Python.Python.3.11"
    exit 1
}

# Check dictate.py
$dictateScript = Join-Path $PSScriptRoot "dictate.py"
if (-not (Test-Path $dictateScript)) {
    Write-Err "❌ dictate.py not found"
    Write-Host "   Expected: $dictateScript"
    exit 1
}

# Build Python command
$pythonArgs = @($dictateScript, "--model", $Model)

if ($Duration -gt 0) {
    $pythonArgs += @("--duration", $Duration)
}

if ($NoClipboard) {
    $pythonArgs += "--no-clipboard"
}

# Show info
Write-Host ""
Write-Info "WHISPER DICTATION"
Write-Info "================="
Write-Host ""
Write-Host "Model: $Model" -ForegroundColor Gray

if ($Duration -gt 0) {
    Write-Host "Duration: $Duration seconds" -ForegroundColor Gray
} else {
    Write-Host "Duration: Press Enter to stop" -ForegroundColor Gray
}

Write-Host ""

# Run dictation
try {
    & python @pythonArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Success "Ready to paste! (Ctrl+V)"
        Write-Host ""
    }
}
catch {
    Write-Err "❌ Dictation failed: $_"
    exit 1
}
