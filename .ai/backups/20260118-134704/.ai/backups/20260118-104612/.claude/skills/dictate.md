# Dictate

Real-time dictation using local Whisper AI. Perfect for voice-to-text with ChatGPT, Claude, or any application.

## Usage

- `/dictate` - Start dictation (press Enter to stop)
- `/dictate 30` - Record for 30 seconds
- `/dictate medium` - Use more accurate model

## What It Does

1. **Records** audio from your microphone
2. **Transcribes** using local Whisper AI (free, offline)
3. **Copies** text to clipboard automatically
4. **Ready** to paste into ChatGPT, Claude, or anywhere

## Why Better Than Windows Voice Typing

**Windows Voice Typing (Win+H):**
- ❌ Often inaccurate
- ❌ Requires internet
- ❌ Limited language support
- ❌ Can't customize

**Whisper Dictation:**
- ✅ Very accurate (OpenAI quality)
- ✅ Works offline
- ✅ Supports 99+ languages
- ✅ Multiple accuracy levels
- ✅ FREE forever

## Workflow

### For ChatGPT/Claude

```
1. Open ChatGPT or Claude
2. Run: .\dictate.ps1
3. Speak your prompt
4. Press Enter when done
5. Wait 2-3 seconds for transcription
6. Ctrl+V to paste
7. Send!
```

### For Long-Form Content

```
1. Run: .\dictate.ps1 -Model medium
2. Speak your content
3. Press Enter
4. Transcription appears
5. Paste into document
```

## Models Available

Choose accuracy vs. speed:

| Model | Speed | Accuracy | Best For |
|-------|-------|----------|----------|
| tiny | ⚡⚡⚡ Very fast | Good | Quick notes |
| base | ⚡⚡ Fast | Better | General use |
| small | ⚡ Balanced | **Best balance** | **Recommended** |
| medium | 🐢 Slower | Very accurate | Long dictation |
| large | 🐢🐢 Slowest | Most accurate | Professional |

**Default: small** (best balance of speed and accuracy)

## Examples

### Basic Dictation (Default)
```bash
.\dictate.ps1
```
- Records until you press Enter
- Uses small model
- Auto-copies to clipboard

### Quick 10-Second Note
```bash
.\dictate.ps1 -Duration 10
```
- Automatically stops after 10 seconds
- Fast for quick thoughts

### Maximum Accuracy
```bash
.\dictate.ps1 -Model large
```
- Slower but most accurate
- Good for important content

### No Clipboard (Just Show Text)
```bash
.\dictate.ps1 -NoClipboard
```
- Shows transcription
- Doesn't copy to clipboard

## Instructions

When user runs `/dictate`:

1. **Check Prerequisites**
   - Python installed? ✓
   - Whisper installed? ✓
   - Microphone working?

2. **Run Dictation**
   ```
   .\dictate.ps1
   ```

3. **User Workflow**
   - See "🎤 Recording..." message
   - Speak clearly
   - Press Enter when done
   - Wait for transcription (2-5 seconds)
   - See text output
   - Text auto-copied to clipboard

4. **Result**
   - Transcribed text displayed
   - Already in clipboard
   - Ready to paste anywhere

## Tips for Best Results

### Speaking Technique
- **Speak clearly** (not too fast)
- **Natural pace** (conversational)
- **Pause between sentences** (helps accuracy)
- **Close to microphone** (reduce background noise)

### Use Cases

**Perfect For:**
- ✅ ChatGPT/Claude prompts
- ✅ Quick notes and ideas
- ✅ Email drafts
- ✅ Documentation
- ✅ Blog posts
- ✅ Meeting notes

**Not Ideal For:**
- ❌ Real-time conversation transcription
- ❌ Multiple speakers (use /transcribe-video)
- ❌ Very noisy environments

### Keyboard Shortcuts Workflow

**Pro Tip:** Create a keyboard shortcut!

**Windows:**
1. Right-click dictate.ps1 → Create Shortcut
2. Right-click shortcut → Properties
3. Set "Shortcut key" (e.g., Ctrl+Alt+D)
4. Apply

**Now:** Press Ctrl+Alt+D to start dictating!

## Troubleshooting

**"No audio detected"**
- Check microphone is connected
- Check microphone permissions
- Test with: `python -c "import sounddevice; print(sounddevice.query_devices())"`

**"Recording failed"**
- Microphone might be in use by another app
- Close other apps using microphone
- Try again

**"Transcription slow"**
- First run downloads model (~500MB for small)
- Subsequent runs are faster
- Use `-Model tiny` for fastest (lower accuracy)

**"Inaccurate transcription"**
- Speak more clearly
- Reduce background noise
- Try `-Model medium` for better accuracy
- Check microphone quality

**"Module not found"**
- Run: `python -m pip install sounddevice pyperclip scipy --user`
- Restart terminal

## Configuration

From `toolkit-config.yaml`:
```yaml
dictation:
  default_model: small          # Default Whisper model
  auto_clipboard: true          # Auto-copy to clipboard
  show_confidence: false        # Show confidence scores
```

## Integration

**Works With:**
- ChatGPT (web or desktop)
- Claude (web or desktop)
- Any text editor
- Email clients
- Slack, Discord, Teams
- Notion, Obsidian
- Literally any app that accepts text

**Workflow Integration:**
- Use `/dictate` for quick prompts
- Use `/transcribe-video` for recorded files
- Use `/analyze-video` for learning from videos

## Performance

**Typical Speeds:**
- **Recording:** Real-time (obviously)
- **Transcription:**
  - Small model: ~2-3 seconds for 30-second clip
  - Medium model: ~5-7 seconds
  - Large model: ~10-15 seconds

**First Run:**
- Downloads model (~500MB for small)
- Takes 2-5 minutes one time
- Subsequent runs use cached model

## Privacy

**100% Private:**
- Runs locally on your computer
- No internet required (after model download)
- No data sent to cloud
- No logging or tracking
- Your voice never leaves your machine

**vs. Cloud Services:**
- Google/Microsoft/Apple send audio to servers
- Whisper local = complete privacy

## Languages Supported

**99+ languages including:**
- English (all accents)
- Spanish, French, German
- Mandarin, Japanese, Korean
- Arabic, Hebrew, Hindi
- Portuguese, Russian, Italian
- And 90+ more...

**Auto-detected** - just speak, Whisper figures it out!

## Cost

**FREE FOREVER** ✅
- No API fees
- No subscriptions
- No usage limits
- Runs locally
- Only cost: your electricity

## Notes

- First transcription may be slow (downloads model)
- Model is cached (~500MB disk space)
- Works offline after initial setup
- More accurate than most paid services
- Perfect for non-technical users (just run the command!)

$ARGUMENTS
