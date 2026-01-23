<#
.SYNOPSIS
    Analyze YouTube videos for ecosystem relevance and generate PRDs

.DESCRIPTION
    Complete pipeline: transcribe → analyze → generate PRD → save discovery
    Turns passive learning into actionable development tasks.

.PARAMETER Url
    YouTube video URL to analyze

.PARAMETER Quick
    Quick analysis only (skip PRD generation)

.PARAMETER List
    List recent discoveries

.EXAMPLE
    .\analyze-video.ps1 -Url "https://www.youtube.com/watch?v=xyz"
    .\analyze-video.ps1 -Url "https://youtu.be/xyz" -Quick
    .\analyze-video.ps1 -List

.NOTES
    Requires: transcribe-video.ps1, Whisper installed
    Output: discoveries/YYYY-MM-DD-topic.md
#>

param(
    [string]$Url = "",
    [switch]$Quick,
    [switch]$List
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host $msg -ForegroundColor Red }

# List discoveries
if ($List) {
    $discoveriesDir = Join-Path $PSScriptRoot "discoveries"
    if (-not (Test-Path $discoveriesDir)) {
        Write-Warn "No discoveries yet!"
        Write-Host ""
        Write-Host "Run: .\analyze-video.ps1 -Url 'https://youtube.com/watch?v=...'"
        Write-Host ""
        exit 0
    }

    Write-Host ""
    Write-Host "RECENT DISCOVERIES" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host ""

    $discoveries = Get-ChildItem -Path $discoveriesDir -Filter "*.md" |
        Where-Object { $_.Name -ne "README.md" -and $_.Name -ne "index.md" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 10

    if ($discoveries.Count -eq 0) {
        Write-Warn "No discoveries found"
    } else {
        foreach ($discovery in $discoveries) {
            $content = Get-Content $discovery.FullName -Raw
            $title = "Unknown"
            $relevance = "?"

            if ($content -match '# Discovery: (.+)') {
                $title = $Matches[1]
            }
            if ($content -match '\*\*Relevance:\*\* (\d+)/10') {
                $relevance = $Matches[1]
            }

            $date = $discovery.BaseName.Substring(0, 10)
            Write-Host "[$date] " -NoNewline -ForegroundColor Gray
            Write-Host "$title " -NoNewline -ForegroundColor White
            Write-Host "($relevance/10)" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "Full list: $discoveriesDir" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

# Validate URL
if (-not $Url) {
    Write-Err "Error: No URL provided"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\analyze-video.ps1 -Url 'https://youtube.com/watch?v=...'"
    Write-Host "  .\analyze-video.ps1 -List"
    Write-Host ""
    exit 1
}

if ($Url -notmatch '(youtube\.com|youtu\.be)') {
    Write-Err "Error: Not a YouTube URL"
    Write-Host "Provided: $Url"
    exit 1
}

Write-Host ""
Write-Host "VIDEO ANALYSIS PIPELINE" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Transcribe
Write-Info "Step 1/3: Transcribing video..."
Write-Host ""

$transcriptScript = Join-Path $PSScriptRoot "transcribe-video.ps1"
if (-not (Test-Path $transcriptScript)) {
    Write-Err "Error: transcribe-video.ps1 not found"
    Write-Host "Expected: $transcriptScript"
    exit 1
}

try {
    & $transcriptScript -Url $Url 2>&1 | Write-Host

    # Find the transcript file (most recent in transcripts/)
    $transcriptsDir = Join-Path $PSScriptRoot "transcripts"
    $latestTranscript = Get-ChildItem -Path $transcriptsDir -Filter "*.txt" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestTranscript) {
        throw "Transcript file not found"
    }

    Write-Success "✅ Transcription complete: $($latestTranscript.Name)"
}
catch {
    Write-Err "❌ Transcription failed: $_"
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Step 2: Prepare context
Write-Info "Step 2/3: Loading ecosystem context..."
Write-Host ""

$contextFile = Join-Path $PSScriptRoot "ecosystem-context.md"

# Read transcript
$transcriptContent = Get-Content $latestTranscript.FullName -Raw

# Extract video metadata from transcript
$videoTitle = "Unknown"
$videoDuration = "Unknown"
if ($transcriptContent -match '# Transcript: (.+)') {
    $videoTitle = $Matches[1]
}
if ($transcriptContent -match '\*\*Duration:\*\* (.+)') {
    $videoDuration = $Matches[1]
}

# Extract just the transcript text (after the --- separator)
$transcriptText = ""
if ($transcriptContent -match '---\s+(.+?)\s+---' ) {
    $transcriptText = $Matches[1].Trim()
}

if (-not $transcriptText) {
    Write-Warn "Could not extract transcript text, using full content"
    $transcriptText = $transcriptContent
}

Write-Success "✅ Context loaded"
Write-Host "   Video: $videoTitle"
Write-Host "   Duration: $videoDuration"
Write-Host "   Transcript: $($transcriptText.Length) characters"
Write-Host ""

# Create discoveries directory
$discoveriesDir = Join-Path $PSScriptRoot "discoveries"
if (-not (Test-Path $discoveriesDir)) {
    New-Item -ItemType Directory -Path $discoveriesDir | Out-Null
}

# Step 3: Analysis (ready for Claude)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Info "Step 3/3: Ready for Claude analysis..."
Write-Host ""
Write-Warn "⚠️  Manual step required:"
Write-Host ""
Write-Host "Tell Claude:" -ForegroundColor Yellow
Write-Host "  'Analyze the video transcript in transcripts/$($latestTranscript.Name)'" -ForegroundColor White
Write-Host ""
Write-Host "Claude will:" -ForegroundColor Cyan
Write-Host "  1. Analyze transcript for ecosystem relevance"
Write-Host "  2. Score against each project (0-10)"
Write-Host "  3. Generate PRD if relevant (score ≥7)"
Write-Host "  4. Save to discoveries/ folder"
Write-Host ""
Write-Host "Or run: /analyze-video $Url (if skill is active)" -ForegroundColor Cyan
Write-Host ""

# Create analysis prep file for Claude
$analysisPrepFile = Join-Path $discoveriesDir "_analysis-prep.md"
$analysisPrepContent = @"
# Video Analysis Request

**Video:** $videoTitle
**URL:** $Url
**Duration:** $videoDuration
**Transcript:** transcripts/$($latestTranscript.Name)
**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')

---

## Ecosystem Context

Analyze this video against the following projects:

### GPNet3
- AI platform foundation
- Multi-agent orchestration
- Scalable infrastructure

### GoAgent
- Agent orchestration system
- Task decomposition
- Tool integration

### GoMemory
- Personal AI memory system
- Audio transcription pipeline
- Vector search and retrieval
- Cross-session context

### GoConnect
- Connection management
- Real-time communication

### GoVertical
- Vertical-specific solutions
- Domain expertise

### GoControl
- Control systems
- Python-based

### GoAssist
- AI assistant platform
- User interaction

### Claude Code Toolkit
- Development workflow automation
- Skills and commands
- Guided mode for learning

---

## Current Priorities (from TODO.md)

- GoMemory completion (35-40% done, needs audio transcription)
- Ecosystem test health (85.7%, some failing tests)
- Toolkit enhancements (guided mode, video analysis)

---

## Analysis Instructions

1. **Read Transcript:** transcripts/$($latestTranscript.Name)

2. **Evaluate Relevance:**
   - Score each project 0-10
   - Identify specific techniques/patterns/tools
   - Consider current priorities

3. **Generate Output:**
   - Analysis summary (overall score, key insights)
   - If score ≥7: Full PRD with implementation plan
   - Save to: discoveries/YYYY-MM-DD-topic.md

4. **Format:**
   - Use the template from .claude/skills/analyze-video.md
   - Include actionable next steps
   - Add relevant tags

---

## Quick Mode

$(if ($Quick) { "YES - Skip PRD generation, just show summary" } else { "NO - Generate full PRD if relevant" })

---

**Ready for your analysis!**
"@

$analysisPrepContent | Out-File -FilePath $analysisPrepFile -Encoding UTF8

Write-Success "✅ Analysis prep saved: discoveries/_analysis-prep.md"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
