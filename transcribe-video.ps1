<#
.SYNOPSIS
    Transcribe YouTube videos using local Whisper AI

.DESCRIPTION
    Downloads audio from YouTube and transcribes it using OpenAI's Whisper model (local).
    No API key required - runs entirely on your machine.

.PARAMETER Url
    YouTube video URL to transcribe

.PARAMETER Model
    Whisper model to use: tiny, base, small (default), medium, large

.PARAMETER Setup
    Install Whisper dependencies

.EXAMPLE
    .\transcribe-video.ps1 -Url "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    .\transcribe-video.ps1 -Url "https://youtu.be/xyz" -Model medium
    .\transcribe-video.ps1 -Setup

.NOTES
    Requires: yt-dlp, Python 3.8+, ffmpeg
    First run downloads Whisper model (~500MB for small model)
#>

param(
    [string]$Url = "",
    [ValidateSet("tiny", "base", "small", "medium", "large")]
    [string]$Model = "small",
    [switch]$Setup
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host $msg -ForegroundColor Red }

# Check dependencies
function Test-Dependencies {
    Write-Info "Checking dependencies..."

    # Check yt-dlp
    $ytdlp = Get-Command yt-dlp -ErrorAction SilentlyContinue
    if (-not $ytdlp) {
        Write-Err "❌ yt-dlp not found"
        Write-Host "   Install: winget install yt-dlp"
        return $false
    }
    Write-Success "✅ yt-dlp installed"

    # Check Python
    $python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $python) {
        Write-Err "❌ Python not found"
        Write-Host "   Install: winget install Python.Python.3.11"
        return $false
    }
    Write-Success "✅ Python installed: $($python.Version)"

    # Check Whisper
    $whisperCheck = python -c "import whisper" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "⚠️  Whisper not installed"
        Write-Host ""
        Write-Host "Run: .\transcribe-video.ps1 -Setup" -ForegroundColor Yellow
        Write-Host ""
        return $false
    }
    Write-Success "✅ Whisper installed"

    # Check ffmpeg
    $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if (-not $ffmpeg) {
        Write-Warn "⚠️  ffmpeg not found (recommended)"
        Write-Host "   Install: winget install ffmpeg"
        Write-Host "   (yt-dlp will use fallback method)"
    } else {
        Write-Success "✅ ffmpeg installed"
    }

    return $true
}

# Install Whisper
function Install-Whisper {
    Write-Info "Installing Whisper..."
    Write-Host ""

    try {
        Write-Host "Running: pip install openai-whisper" -ForegroundColor Gray
        python -m pip install --upgrade pip
        python -m pip install openai-whisper

        Write-Host ""
        Write-Success "✅ Whisper installed successfully!"
        Write-Host ""
        Write-Host "You can now transcribe videos:" -ForegroundColor Cyan
        Write-Host "  .\transcribe-video.ps1 -Url 'https://youtube.com/watch?v=...'"
        Write-Host ""
    }
    catch {
        Write-Err "❌ Installation failed: $_"
        exit 1
    }
}

# Setup mode
if ($Setup) {
    Write-Host ""
    Write-Host "WHISPER SETUP" -ForegroundColor Cyan
    Write-Host "=============" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Test-Dependencies)) {
        Write-Host ""
        Write-Host "Please install missing dependencies first." -ForegroundColor Yellow
        exit 1
    }

    Install-Whisper
    exit 0
}

# Validate URL provided
if (-not $Url) {
    Write-Err "Error: No URL provided"
    Write-Host ""
    Write-Host "Usage: .\transcribe-video.ps1 -Url 'https://youtube.com/watch?v=...'"
    Write-Host ""
    exit 1
}

# Validate YouTube URL
if ($Url -notmatch '(youtube\.com|youtu\.be)') {
    Write-Err "Error: Not a YouTube URL"
    Write-Host "Provided: $Url"
    exit 1
}

Write-Host ""
Write-Host "VIDEO TRANSCRIPTION" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Check dependencies
if (-not (Test-Dependencies)) {
    exit 1
}

Write-Host ""
Write-Info "Configuration:"
Write-Host "  URL: $Url"
Write-Host "  Model: $Model"
Write-Host ""

# Create directories
$transcriptsDir = Join-Path $PSScriptRoot "transcripts"
$tempDir = Join-Path $PSScriptRoot "temp"

if (-not (Test-Path $transcriptsDir)) {
    New-Item -ItemType Directory -Path $transcriptsDir | Out-Null
}
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# Get video info
Write-Info "Fetching video info..."
try {
    $videoInfo = yt-dlp --print "%(title)s|%(duration)s" --no-warnings $Url 2>$null
    $parts = $videoInfo -split '\|', 2
    $videoTitle = $parts[0]
    $duration = [int]$parts[1]
    $durationMin = [math]::Round($duration / 60, 1)

    Write-Success "✅ Video: $videoTitle"
    Write-Host "   Duration: $durationMin minutes"
    Write-Host ""
}
catch {
    Write-Err "❌ Failed to fetch video info"
    Write-Host "   Error: $_"
    exit 1
}

# Download audio
$date = Get-Date -Format "yyyy-MM-dd"
$safeTitle = $videoTitle -replace '[^\w\s-]', '' -replace '\s+', '-'
$audioFile = Join-Path $tempDir "$date-$safeTitle.mp3"

Write-Info "Downloading audio..."
Write-Host "   This may take a moment..." -ForegroundColor Gray

try {
    yt-dlp -x --audio-format mp3 -o $audioFile --no-warnings $Url 2>$null

    if (Test-Path $audioFile) {
        $audioSize = (Get-Item $audioFile).Length / 1MB
        Write-Success "✅ Downloaded: $([math]::Round($audioSize, 1)) MB"
    } else {
        throw "Audio file not created"
    }
}
catch {
    Write-Err "❌ Download failed: $_"
    exit 1
}

Write-Host ""
Write-Info "Transcribing with Whisper ($Model model)..."
Write-Host "   This may take several minutes..." -ForegroundColor Gray
Write-Host "   Model will download on first use (~500MB for small)" -ForegroundColor Gray
Write-Host ""

# Create Python script for transcription
$pythonScript = @"
import whisper
import sys
import os

try:
    print("Loading Whisper model: $Model")
    model = whisper.load_model("$Model")

    print("Transcribing audio...")
    result = model.transcribe("$($audioFile.Replace('\', '/'))", verbose=False)

    print("TRANSCRIPT_START")
    print(result['text'])
    print("TRANSCRIPT_END")

    # Print detected language
    print(f"LANGUAGE:{result['language']}")

except Exception as e:
    print(f"ERROR:{str(e)}", file=sys.stderr)
    sys.exit(1)
"@

$pythonScriptPath = Join-Path $tempDir "transcribe.py"
$pythonScript | Out-File -FilePath $pythonScriptPath -Encoding UTF8

# Run transcription
try {
    $transcriptOutput = python $pythonScriptPath 2>&1

    # Parse output
    $transcript = ""
    $language = ""
    $inTranscript = $false

    foreach ($line in $transcriptOutput) {
        if ($line -eq "TRANSCRIPT_START") {
            $inTranscript = $true
            continue
        }
        if ($line -eq "TRANSCRIPT_END") {
            $inTranscript = $false
            continue
        }
        if ($line -match '^LANGUAGE:(.+)$') {
            $language = $Matches[1]
            continue
        }
        if ($inTranscript) {
            $transcript += $line + "`n"
        } else {
            # Progress messages
            Write-Host "   $line" -ForegroundColor Gray
        }
    }

    $transcript = $transcript.Trim()

    if (-not $transcript) {
        throw "No transcript generated"
    }

    Write-Host ""
    Write-Success "✅ Transcription complete!"
    if ($language) {
        Write-Host "   Detected language: $language"
    }
}
catch {
    Write-Err "❌ Transcription failed: $_"

    # Cleanup
    Remove-Item $audioFile -Force -ErrorAction SilentlyContinue
    Remove-Item $pythonScriptPath -Force -ErrorAction SilentlyContinue

    exit 1
}

# Save transcript
$outputFile = Join-Path $transcriptsDir "$date-$safeTitle.txt"

$transcriptContent = @"
# Transcript: $videoTitle

**Source:** $Url
**Duration:** $durationMin minutes
**Transcribed:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')
**Model:** $Model
**Language:** $language

---

$transcript

---

Generated by Claude Code Toolkit
"@

$transcriptContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Success "✅ Saved: $outputFile"
Write-Host ""

# Cleanup
Remove-Item $audioFile -Force -ErrorAction SilentlyContinue
Remove-Item $pythonScriptPath -Force -ErrorAction SilentlyContinue

# Display transcript preview
Write-Host "TRANSCRIPT PREVIEW" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""
$preview = $transcript.Substring(0, [Math]::Min(500, $transcript.Length))
Write-Host $preview
if ($transcript.Length -gt 500) {
    Write-Host "..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "(Full transcript saved to file)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Full transcript: $outputFile" -ForegroundColor Cyan
Write-Host ""
