# Transcribe Video

Download and transcribe YouTube videos using local Whisper AI.

## Usage

- `/transcribe-video [URL]` - Transcribe a YouTube video
- `/transcribe-video [URL] --model medium` - Use specific Whisper model
- `/transcribe-video setup` - Install dependencies

## What It Does

1. Downloads audio from YouTube video (yt-dlp)
2. Transcribes using local Whisper AI (free, no API key)
3. Saves transcript to `transcripts/YYYY-MM-DD-[title].txt`
4. Returns formatted transcript

## Requirements

**Already Installed:**
- yt-dlp (installed in Session 6)

**Needs Installation:**
- Python (you have this for gomemory)
- openai-whisper package

Run `/transcribe-video setup` to install Whisper.

## Models Available

- **tiny**: Fastest, least accurate (~1GB RAM)
- **base**: Fast, decent accuracy (~1GB RAM)
- **small**: Balanced (default) (~2GB RAM)
- **medium**: Better accuracy (~5GB RAM)
- **large**: Best accuracy, slowest (~10GB RAM)

## Examples

```
/transcribe-video https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Transcribes video, saves to `transcripts/2026-01-06-video-title.txt`

```
/transcribe-video https://youtu.be/xyz123 --model medium
```

Uses medium model for better accuracy.

## Instructions

When user runs `/transcribe-video [URL]`:

1. Validate URL is YouTube
2. Check if Whisper is installed
3. If not: Show setup instructions, offer to install
4. If yes: Run `.\transcribe-video.ps1 -Url "[URL]"`
5. Wait for completion (can take 1-5 minutes depending on video length)
6. Read the transcript file and return formatted output

## Output Format

```markdown
# Transcript: [Video Title]

**Source:** [URL]
**Duration:** [X minutes]
**Transcribed:** [Timestamp]
**Model:** small

---

[Full transcript text here...]

---

**Saved to:** transcripts/2026-01-06-video-title.txt
```

## Notes

- First transcription may take longer (downloads Whisper model ~500MB)
- Subsequent transcriptions are faster (model is cached)
- Works offline after first setup
- Supports 99+ languages (auto-detected)
- Audio files are deleted after transcription (saves space)

## Troubleshooting

**"Whisper not found":**
Run `/transcribe-video setup`

**"Out of memory":**
Use smaller model: `--model tiny` or `--model base`

**"Video download failed":**
- Check URL is valid YouTube link
- Check internet connection
- Try with yt-dlp directly: `yt-dlp -x --audio-format mp3 [URL]`

$ARGUMENTS
