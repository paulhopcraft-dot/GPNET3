"""
Voice V10 - Natural Language Coding Interface

Main orchestrator for voice-controlled Claude Code.
Combines VAD, Whisper STT, CLI Bridge, and TTS for hands-free coding.

Architecture:
    User speaks → VAD → Whisper → CLI Bridge → Parser → Summarizer → TTS → Speakers
                          ↑                                              ↓
                    Barge-in detector ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
"""

import asyncio
import queue
import threading
import time
import os
import sys
from typing import Optional, Callable
from dataclasses import dataclass
from enum import Enum, auto

# Audio processing
import numpy as np

try:
    import sounddevice as sd
except ImportError:
    print("Please install sounddevice: pip install sounddevice")
    sys.exit(1)

try:
    import whisper
except ImportError:
    print("Please install openai-whisper: pip install openai-whisper")
    sys.exit(1)

# TTS options - try edge-tts first (free), fall back to pyttsx3
try:
    import edge_tts
    TTS_ENGINE = "edge"
except ImportError:
    try:
        import pyttsx3
        TTS_ENGINE = "pyttsx3"
    except ImportError:
        print("Please install a TTS engine: pip install edge-tts  OR  pip install pyttsx3")
        sys.exit(1)

# Local modules
from cli_bridge import ClaudeCLIBridge, CLIConfig
from stream_parser import StreamParser, MessageType
from tts_summarizer import TTSSummarizer, TTSConfig


class VoiceState(Enum):
    """Current state of the voice interface."""
    IDLE = auto()           # Waiting for user to speak
    LISTENING = auto()      # VAD detected speech, recording
    PROCESSING = auto()     # Transcribing with Whisper
    EXECUTING = auto()      # Claude CLI running
    SPEAKING = auto()       # TTS playing response


@dataclass
class VoiceConfig:
    """Configuration for Voice V10."""
    # Audio settings
    sample_rate: int = 16000
    channels: int = 1
    dtype: str = 'int16'

    # VAD settings
    vad_threshold: float = 0.02      # RMS threshold for speech detection
    vad_silence_ms: int = 800        # Silence duration to end utterance
    vad_min_speech_ms: int = 300     # Minimum speech duration

    # Whisper settings
    whisper_model: str = "base"      # tiny, base, small, medium, large
    whisper_language: str = "en"

    # TTS settings
    tts_voice: str = "en-US-GuyNeural"  # Edge TTS voice
    tts_rate: str = "+10%"              # Speech rate

    # CLI settings
    claude_path: str = r"C:\Users\Paul\AppData\Roaming\npm\claude.cmd"
    claude_model: str = "sonnet"
    working_directory: str = os.getcwd()

    # Behavior
    announce_tool_use: bool = True
    summarize_tool_result: bool = True
    enable_barge_in: bool = True


class VoiceV10:
    """
    Voice-controlled Claude Code interface.

    Listens for voice commands, transcribes with Whisper,
    executes via Claude CLI, and speaks results.
    """

    def __init__(self, config: Optional[VoiceConfig] = None):
        self.config = config or VoiceConfig()
        self.state = VoiceState.IDLE
        self._running = False

        # Audio components
        self._audio_queue: queue.Queue = queue.Queue()
        self._stream: Optional[sd.InputStream] = None

        # Whisper model
        print(f"Loading Whisper model '{self.config.whisper_model}'...")
        self._whisper = whisper.load_model(self.config.whisper_model)
        print("Whisper model loaded.")

        # CLI Bridge
        self._cli = ClaudeCLIBridge(config=CLIConfig(
            claude_path=self.config.claude_path,
            model=self.config.claude_model,
            working_directory=self.config.working_directory,
        ))

        # Parsers
        self._parser = StreamParser()
        self._summarizer = TTSSummarizer(TTSConfig(
            announce_tool_use=self.config.announce_tool_use,
            summarize_tool_result=self.config.summarize_tool_result,
        ))

        # TTS state
        self._tts_playing = False
        self._tts_cancel = threading.Event()

        # Barge-in detection
        self._barge_in_detected = False

        # Callbacks
        self.on_state_change: Optional[Callable[[VoiceState], None]] = None
        self.on_transcription: Optional[Callable[[str], None]] = None
        self.on_response: Optional[Callable[[str], None]] = None

    def _set_state(self, state: VoiceState) -> None:
        """Update state and notify callback."""
        self.state = state
        if self.on_state_change:
            self.on_state_change(state)

    async def run(self) -> None:
        """Main run loop for voice interface."""
        self._running = True
        print("\n" + "=" * 50)
        print("Voice V10 - Natural Language Coding Interface")
        print("=" * 50)
        print(f"Working directory: {self.config.working_directory}")
        print(f"Claude model: {self.config.claude_model}")
        print(f"Whisper model: {self.config.whisper_model}")
        print("\nSay 'quit' or 'goodbye' to exit.")
        print("Say 'new conversation' or 'start over' to reset context.")
        print("=" * 50 + "\n")

        try:
            while self._running:
                # Wait for speech input
                self._set_state(VoiceState.IDLE)
                print("\n[Listening...] ", end="", flush=True)

                audio = await self._capture_speech()
                if audio is None:
                    continue

                # Transcribe
                self._set_state(VoiceState.PROCESSING)
                print("[Transcribing...] ", end="", flush=True)

                text = await self._transcribe(audio)
                if not text or not text.strip():
                    print("(no speech detected)")
                    continue

                print(f'"{text}"')
                if self.on_transcription:
                    self.on_transcription(text)

                # Handle special commands
                lower_text = text.lower().strip()
                if lower_text in ("quit", "goodbye", "exit", "bye"):
                    print("\nGoodbye!")
                    await self._speak("Goodbye!")
                    break
                elif lower_text in ("new conversation", "start over", "reset", "clear"):
                    self._cli.reset_session()
                    print("[Session reset]")
                    await self._speak("Starting a new conversation.")
                    continue
                elif lower_text in ("stop", "cancel", "nevermind", "never mind"):
                    self._cli.cancel()
                    print("[Cancelled]")
                    continue

                # Execute via Claude CLI
                self._set_state(VoiceState.EXECUTING)
                await self._execute_and_speak(text)

        except KeyboardInterrupt:
            print("\n\nInterrupted by user.")
        finally:
            self._running = False
            self._cli.cancel()
            print("\nVoice V10 stopped.")

    async def _capture_speech(self) -> Optional[np.ndarray]:
        """
        Capture speech using VAD (Voice Activity Detection).

        Returns audio when speech ends (silence detected after speech).
        """
        # Clear audio queue
        while not self._audio_queue.empty():
            try:
                self._audio_queue.get_nowait()
            except queue.Empty:
                break

        # Start audio stream
        def audio_callback(indata, frames, time_info, status):
            if status:
                print(f"Audio status: {status}")
            self._audio_queue.put(indata.copy())

        chunks = []
        speech_detected = False
        silence_start = None
        speech_start = None

        try:
            with sd.InputStream(
                samplerate=self.config.sample_rate,
                channels=self.config.channels,
                dtype=self.config.dtype,
                callback=audio_callback,
                blocksize=int(self.config.sample_rate * 0.1),  # 100ms blocks
            ):
                while self._running:
                    try:
                        chunk = self._audio_queue.get(timeout=0.1)
                    except queue.Empty:
                        continue

                    # Calculate RMS for VAD
                    audio_float = chunk.astype(np.float32) / 32768.0
                    rms = np.sqrt(np.mean(audio_float ** 2))

                    is_speech = rms > self.config.vad_threshold

                    if is_speech:
                        if not speech_detected:
                            speech_detected = True
                            speech_start = time.time()
                            print("*", end="", flush=True)
                        silence_start = None
                        chunks.append(chunk)
                    else:
                        if speech_detected:
                            chunks.append(chunk)  # Include some silence
                            if silence_start is None:
                                silence_start = time.time()
                            elif (time.time() - silence_start) * 1000 > self.config.vad_silence_ms:
                                # Check minimum speech duration
                                if speech_start and (time.time() - speech_start) * 1000 > self.config.vad_min_speech_ms:
                                    break
                                else:
                                    # Too short, reset
                                    speech_detected = False
                                    silence_start = None
                                    chunks = []

        except Exception as e:
            print(f"\nAudio capture error: {e}")
            return None

        if not chunks:
            return None

        return np.concatenate(chunks)

    async def _transcribe(self, audio: np.ndarray) -> str:
        """Transcribe audio using Whisper."""
        # Convert to float32 for Whisper
        audio_float = audio.astype(np.float32) / 32768.0

        # Run transcription in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._whisper.transcribe(
                audio_float,
                language=self.config.whisper_language,
                fp16=False,  # Use fp32 for CPU
            )
        )

        return result.get("text", "").strip()

    async def _execute_and_speak(self, prompt: str) -> None:
        """Execute prompt via Claude CLI and speak results."""
        self._barge_in_detected = False
        speech_queue = asyncio.Queue()
        speak_task = None

        try:
            # Start TTS consumer task
            speak_task = asyncio.create_task(self._tts_consumer(speech_queue))

            # Stream from Claude CLI
            async for message in self._cli.execute(prompt):
                if self._barge_in_detected:
                    print("\n[Barge-in - stopping]")
                    self._cli.cancel()
                    break

                # Parse message
                parsed = self._parser.parse_line(message)

                # Debug output
                if parsed.type == MessageType.ASSISTANT and parsed.has_text:
                    print(f"\nClaude: {parsed.text[:200]}..." if len(parsed.text or "") > 200 else f"\nClaude: {parsed.text}")
                elif parsed.type == MessageType.TOOL_USE:
                    print(f"\n[Tool: {parsed.tool_name}]")
                elif parsed.type == MessageType.ERROR:
                    print(f"\n[Error: {parsed.text}]")

                # Get speech text
                speech_text = self._summarizer.summarize_for_speech(parsed)
                if speech_text:
                    await speech_queue.put(speech_text)
                    if self.on_response:
                        self.on_response(speech_text)

            # Signal end of speech
            await speech_queue.put(None)

            # Wait for TTS to finish
            if speak_task:
                await speak_task

        except Exception as e:
            print(f"\nExecution error: {e}")
            await self._speak(f"Sorry, I encountered an error: {str(e)[:50]}")

    async def _tts_consumer(self, speech_queue: asyncio.Queue) -> None:
        """Consume speech queue and play TTS."""
        while True:
            text = await speech_queue.get()
            if text is None:
                break

            if self._barge_in_detected:
                continue

            self._set_state(VoiceState.SPEAKING)
            await self._speak(text)

            if self._barge_in_detected:
                break

    async def _speak(self, text: str) -> None:
        """Speak text using TTS."""
        if not text:
            return

        self._tts_cancel.clear()

        try:
            if TTS_ENGINE == "edge":
                await self._speak_edge(text)
            else:
                await self._speak_pyttsx3(text)
        except Exception as e:
            print(f"TTS error: {e}")

    async def _speak_edge(self, text: str) -> None:
        """Speak using Edge TTS."""
        import tempfile

        communicate = edge_tts.Communicate(
            text,
            self.config.tts_voice,
            rate=self.config.tts_rate,
        )

        # Save to temp file and play
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            temp_path = f.name

        try:
            await communicate.save(temp_path)

            if not self._tts_cancel.is_set():
                # Play audio file
                await self._play_audio_file(temp_path)
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass

    async def _play_audio_file(self, path: str) -> None:
        """Play audio file with barge-in detection."""
        try:
            import pygame
            pygame.mixer.init()
            pygame.mixer.music.load(path)
            pygame.mixer.music.play()

            # Monitor for barge-in while playing
            while pygame.mixer.music.get_busy():
                if self._tts_cancel.is_set() or self._barge_in_detected:
                    pygame.mixer.music.stop()
                    break
                await asyncio.sleep(0.1)

                # Check for voice input (barge-in)
                if self.config.enable_barge_in:
                    await self._check_barge_in()

        except ImportError:
            # Fallback: use sounddevice with scipy
            try:
                from scipy.io import wavfile
                import subprocess

                # Convert mp3 to wav using ffmpeg
                wav_path = path.replace(".mp3", ".wav")
                subprocess.run(
                    ["ffmpeg", "-y", "-i", path, "-ar", "24000", "-ac", "1", wav_path],
                    capture_output=True,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
                )

                sr, audio = wavfile.read(wav_path)
                sd.play(audio, sr)
                sd.wait()

                os.unlink(wav_path)
            except Exception as e:
                print(f"Audio playback error: {e}")

    async def _speak_pyttsx3(self, text: str) -> None:
        """Speak using pyttsx3."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._speak_pyttsx3_sync, text)

    def _speak_pyttsx3_sync(self, text: str) -> None:
        """Synchronous pyttsx3 speech."""
        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()

    async def _check_barge_in(self) -> None:
        """Check for user speech during TTS playback (barge-in)."""
        # Quick check of audio input level
        try:
            recording = sd.rec(
                int(0.1 * self.config.sample_rate),
                samplerate=self.config.sample_rate,
                channels=1,
                dtype='int16',
            )
            sd.wait()

            audio_float = recording.astype(np.float32) / 32768.0
            rms = np.sqrt(np.mean(audio_float ** 2))

            # Higher threshold during playback to avoid feedback
            if rms > self.config.vad_threshold * 3:
                self._barge_in_detected = True
                self._tts_cancel.set()
                print("\n[Barge-in detected]")
        except:
            pass

    def stop(self) -> None:
        """Stop the voice interface."""
        self._running = False
        self._cli.cancel()
        self._tts_cancel.set()


async def main():
    """Main entry point."""
    config = VoiceConfig(
        whisper_model="base",  # Use "tiny" for faster, less accurate; "small" for better accuracy
        claude_model="sonnet",
        announce_tool_use=True,
        summarize_tool_result=True,
    )

    voice = VoiceV10(config)
    await voice.run()


if __name__ == "__main__":
    # Install required packages hint
    print("Voice V10 - Natural Language Coding Interface")
    print("-" * 45)
    print("Required packages:")
    print("  pip install sounddevice numpy openai-whisper edge-tts pygame")
    print("-" * 45 + "\n")

    asyncio.run(main())
