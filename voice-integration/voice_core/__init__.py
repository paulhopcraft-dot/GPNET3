"""
Voice V10 - Natural Language Coding Interface

Voice-controlled Claude Code for hands-free development.

Usage:
    python voice_v10.py

Or programmatically:
    from voice_core import VoiceV10, VoiceConfig

    config = VoiceConfig(whisper_model="base", claude_model="sonnet")
    voice = VoiceV10(config)
    asyncio.run(voice.run())
"""

from .cli_bridge import ClaudeCLIBridge, CLIConfig, execute_claude_command
from .stream_parser import StreamParser, ParsedMessage, MessageType, parse_cli_message
from .tts_summarizer import TTSSummarizer, TTSConfig, summarize_for_speech
from .voice_v10 import VoiceV10, VoiceConfig, VoiceState

__all__ = [
    # CLI Bridge
    "ClaudeCLIBridge",
    "CLIConfig",
    "execute_claude_command",
    # Stream Parser
    "StreamParser",
    "ParsedMessage",
    "MessageType",
    "parse_cli_message",
    # TTS Summarizer
    "TTSSummarizer",
    "TTSConfig",
    "summarize_for_speech",
    # Voice V10
    "VoiceV10",
    "VoiceConfig",
    "VoiceState",
]

__version__ = "10.0.0"
