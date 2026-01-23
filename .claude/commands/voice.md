# Voice Interface Command

## Metadata
```yaml
name: voice
description: Start natural voice conversation with Claude Code
version: 1.0.0
category: interface
requires_project: false
requires_validation: false
dangerous: false
```

## Purpose

Launches the voice interface for natural conversation with Claude Code.
Speak your questions and requests, hear Claude's responses.

## Usage

```bash
/voice [command] [options]
```

**Primary Commands:**
- `/voice` or `/voice start` - Start voice interface
- `/voice status` - Check voice interface status
- `/voice test` - Test audio hardware
- `/voice config` - Show configuration

**Command Implementation:**
```bash
python voice-integration/voice_cli_wrapper.py "$@"
```

**Options:**
- `--device N` - Use specific audio device number
- `--model whisper-base|whisper-small` - Choose transcription model
- `--voice aria|guy|jenny` - Choose TTS voice
- `--no-barge-in` - Disable voice interruption

## How Voice Interface Works

### Conversation Flow:
1. **Listen**: Voice Activity Detection captures your speech
2. **Transcribe**: Whisper converts speech to text
3. **Process**: Claude Code processes your request
4. **Respond**: Edge TTS speaks Claude's response
5. **Interrupt**: Speak during response to interrupt (barge-in)

### Voice Commands:
- Say **"quit"**, **"exit"**, or **"goodbye"** to end voice session
- Speak naturally - no special wake words needed
- Interrupt Claude by speaking while it's responding

### Project Context:
Voice interface inherits your current:
- Working directory
- Project context (if in Claude Code project)
- Previous conversation history
- Active Git branch and changes

## Prerequisites

### Required:
- **Microphone**: USB microphone or earbuds/headset with mic
- **Speakers/Headphones**: Audio output (earbuds recommended to prevent echo)
- **Python Dependencies**: voice integration modules must be installed

### Auto-Checked:
- Audio device availability
- Python voice dependencies (whisper, edge-tts, sounddevice)
- Claude Code authentication

## Examples

### Basic Usage:
```bash
# Start voice interface
/voice

# Or explicitly
/voice start
```

### With Options:
```bash
# Use specific audio device
/voice --device 2

# Use small Whisper model (faster)
/voice --model whisper-small

# Use different voice
/voice --voice guy
```

### Audio Setup:
```bash
# Test audio hardware
/voice test

# Check voice interface status
/voice status

# Configure settings
/voice config
```

## Voice Interaction Examples

### File Operations:
```
You: "Create a new React component for user login"
Claude: [Voice] "I'll create a React login component for you..."

You: "Add TypeScript interfaces to that component"
Claude: [Voice] "Adding TypeScript interfaces to the login component..."
```

### Code Questions:
```
You: "What files handle authentication in this project?"
Claude: [Voice] "Looking at your project structure, I can see authentication is handled in..."

You: "Show me the main authentication function"
Claude: [Voice] "Here's the main authentication function from auth.js..."
```

### Development Tasks:
```
You: "Run the tests and tell me what failed"
Claude: [Voice] "I'll run the test suite for you... The tests show 3 failures in..."

You: "Fix those test failures"
Claude: [Voice] "I'll fix those failing tests. Starting with the authentication test..."
```

## Configuration

### Audio Settings:
Voice interface can be configured for your hardware:

- **Device Selection**: Auto-detects best microphone, or specify with `--device`
- **Echo Prevention**: Use earbuds/headphones to prevent audio feedback
- **Voice Quality**: Choose between fast (base) or accurate (small) transcription

### Performance Tuning:
- **Latency**: ~3-5 seconds end-to-end response time
- **Accuracy**: 90%+ transcription accuracy with clear speech
- **Interruption**: <500ms response time for voice barge-in

## Technical Implementation

### Architecture:
```
[Microphone] → [VAD] → [Whisper STT] → [Claude CLI] → [Edge TTS] → [Speakers]
      ↑                                                                  │
      └── Voice Interruption (Barge-in) ←─────────────────────────────────┘
```

### Dependencies:
- **sounddevice**: Audio capture and playback
- **whisper**: Speech-to-text transcription
- **edge-tts**: Text-to-speech synthesis
- **torch**: Silero VAD for voice detection
- **numpy**: Audio processing

### Files:
- **voice_v8_fixed.py**: Main voice interface implementation
- **voice_core/**: Voice processing modules
- **test_audio_validation.py**: Hardware validation
- **test_barge_in_threading.py**: Threading diagnostics

## Error Handling

### Common Issues:

**"No input devices found"**
```bash
# Check available devices
/voice test

# Use specific device
/voice --device N
```

**"Audio feedback/echo"**
- Use earbuds or headphones instead of speakers
- Reduce speaker volume
- Move microphone away from speakers

**"Voice not detected"**
- Check microphone permissions
- Adjust microphone volume in system settings
- Test with `/voice test`

**"Transcription poor"**
- Speak clearly and at normal pace
- Use `--model whisper-small` for better accuracy
- Check for background noise

**"Barge-in not working"**
- Ensure you're using voice_v8_fixed.py
- Check if audio callback threads are running
- Try speaking louder during Claude's response

## Integration with Claude Code

### Session Continuity:
Voice interface maintains context with your CLI session:
- File operations persist after voice session ends
- Project state shared between voice and text modes
- Git operations accessible through voice

### Skill Integration:
Voice can trigger other Claude Code skills:
```
You: "Run the build and tell me about any errors"
(Triggers /build skill via voice)

You: "Commit these changes with a good message"
(Triggers /commit skill via voice)
```

### Development Workflow:
1. Start voice with `/voice`
2. Work through development tasks conversationally
3. Say "exit voice mode" to return to CLI
4. Continue with normal Claude Code commands

## Advanced Features

### Multi-turn Conversations:
Voice interface maintains context across multiple exchanges:
```
You: "Create a user authentication system"
Claude: [Voice] "I'll create the authentication system..."

You: "Add password validation to that"
Claude: [Voice] "Adding validation to the authentication system we just created..."

You: "Now create tests for it"
Claude: [Voice] "Creating tests for the authentication system with validation..."
```

### Voice Shortcuts:
Train common development phrases:
- "New component" → Create React/Vue component
- "Run tests" → Execute test suite
- "Git status" → Check repository status
- "Build project" → Run build process

### Custom Voice Commands:
Configure project-specific voice shortcuts in `.claude/voice-config.json`

This command provides natural voice interaction with Claude Code while maintaining full integration with your development workflow.