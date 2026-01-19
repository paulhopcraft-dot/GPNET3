# Morning Brief

Get your daily AI news summary from configured YouTube channels.

## Quick Start

```powershell
# First time: install yt-dlp
winget install yt-dlp

# Run the brief
.\morning-brief.ps1

# Then ask Claude:
# "Read briefs/2026-01-05.md and summarize"
```

## Usage

- `.\morning-brief.ps1` - Fetch videos from all channels
- `.\morning-brief.ps1 -Hours 48` - Fetch from last 48 hours
- `.\morning-brief.ps1 -Channel "@ycombinator"` - Specific channel only
- `.\morning-brief.ps1 -Install` - Auto-install yt-dlp

After running, ask Claude to read and summarize the brief file.

## Instructions

### Step 1: Read Configuration
Read `toolkit-config.yaml` and extract:
- `morning_brief.channels` - list of YouTube channels
- `morning_brief.max_videos` - videos per channel
- `morning_brief.lookback_hours` - time window
- `morning_brief.summary_style` - output format
- `morning_brief.topics` - topic filters

### Step 2: Fetch Recent Videos
For each channel in the config:
1. Use WebFetch to get channel page: `https://www.youtube.com/@channelname/videos`
2. Extract video titles and URLs from the last 24 hours
3. Filter for AI/LLM/agent related content based on topics config

### Step 3: Get Transcripts (if available)
For high-priority videos:
1. Check if yt-dlp is available: `yt-dlp --version`
2. If available, fetch transcript: `yt-dlp --write-auto-sub --skip-download -o "%(title)s" URL`
3. If not available, use video title + description for summary

### Step 4: Generate Summary
Create summary based on `summary_style`:

**bullets** (default):
```
MORNING AI BRIEF - 2026-01-05
=============================

All-In Podcast:
- [Video Title] - Key point 1, Key point 2
- [Video Title] - Key takeaway

Lex Fridman:
- [Video Title] - Main topic discussed

Top Insights:
1. First major insight across all videos
2. Second major insight
3. Third major insight
```

**prose**:
Narrative paragraph summarizing the day's AI news.

**detailed**:
Full breakdown with timestamps and quotes.

### Step 5: Save Brief (Optional)
If user wants to save:
- Write to `briefs/YYYY-MM-DD.md`

## Fallback Behavior
If WebFetch fails or channels are unavailable:
1. Report which channels failed
2. Suggest manual check
3. Offer to open channels in browser

## Dependencies
- WebFetch tool (built-in)
- yt-dlp (optional, for transcripts)

$ARGUMENTS
