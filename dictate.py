"""
Real-time dictation using local Whisper AI.
Records audio from microphone, transcribes, and copies to clipboard.
"""
import sounddevice as sd
import numpy as np
import whisper
import pyperclip
import sys
import os
import tempfile
from scipy.io import wavfile
import argparse

def print_info(msg):
    """Print info message"""
    print(f"\033[96m{msg}\033[0m")

def print_success(msg):
    """Print success message"""
    print(f"\033[92m✓ {msg}\033[0m")

def print_error(msg):
    """Print error message"""
    print(f"\033[91m✗ {msg}\033[0m", file=sys.stderr)

def record_audio(duration=None, sample_rate=16000):
    """
    Record audio from microphone.

    Args:
        duration: Recording duration in seconds (None = manual stop)
        sample_rate: Audio sample rate (16000 optimal for Whisper)

    Returns:
        numpy array of audio data
    """
    print_info("🎤 Recording... (Press Ctrl+C to stop)")
    print()

    try:
        if duration:
            # Fixed duration recording
            audio = sd.rec(
                int(duration * sample_rate),
                samplerate=sample_rate,
                channels=1,
                dtype='float32'
            )
            sd.wait()
        else:
            # Manual stop recording
            audio_chunks = []

            def callback(indata, frames, time, status):
                if status:
                    print_error(f"Status: {status}")
                audio_chunks.append(indata.copy())

            with sd.InputStream(
                samplerate=sample_rate,
                channels=1,
                dtype='float32',
                callback=callback
            ):
                print("  Recording in progress...")
                print("  Press Enter when done speaking")
                input()

            audio = np.concatenate(audio_chunks, axis=0)

        return audio, sample_rate

    except KeyboardInterrupt:
        print()
        print_error("Recording cancelled")
        sys.exit(1)
    except Exception as e:
        print_error(f"Recording failed: {e}")
        sys.exit(1)

def save_audio(audio, sample_rate, filepath):
    """Save audio to WAV file"""
    # Normalize audio to int16 range
    audio_int16 = np.int16(audio * 32767)
    wavfile.write(filepath, sample_rate, audio_int16)

def transcribe_audio(audio_file, model_name="small"):
    """
    Transcribe audio file using Whisper.

    Args:
        audio_file: Path to audio file
        model_name: Whisper model (tiny, base, small, medium, large)

    Returns:
        Transcribed text
    """
    print_info(f"🤖 Transcribing with Whisper ({model_name} model)...")

    try:
        # Load Whisper model
        model = whisper.load_model(model_name)

        # Transcribe
        result = model.transcribe(audio_file, fp16=False)

        return result['text'].strip()

    except Exception as e:
        print_error(f"Transcription failed: {e}")
        sys.exit(1)

def copy_to_clipboard(text):
    """Copy text to clipboard"""
    try:
        pyperclip.copy(text)
        print_success("Copied to clipboard!")
    except Exception as e:
        print_error(f"Clipboard copy failed: {e}")

def main():
    parser = argparse.ArgumentParser(
        description="Real-time dictation using Whisper AI"
    )
    parser.add_argument(
        "-d", "--duration",
        type=int,
        default=None,
        help="Recording duration in seconds (default: manual stop)"
    )
    parser.add_argument(
        "-m", "--model",
        type=str,
        default="small",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Whisper model to use (default: small)"
    )
    parser.add_argument(
        "--no-clipboard",
        action="store_true",
        help="Don't copy to clipboard"
    )

    args = parser.parse_args()

    print()
    print("=" * 50)
    print("  WHISPER DICTATION")
    print("=" * 50)
    print()

    # Create temp file for audio
    temp_file = tempfile.NamedTemporaryFile(
        suffix=".wav",
        delete=False
    )
    temp_filepath = temp_file.name
    temp_file.close()

    try:
        # Record audio
        audio, sample_rate = record_audio(duration=args.duration)
        print_success("Recording complete!")
        print()

        # Check if audio is silent
        if np.max(np.abs(audio)) < 0.01:
            print_error("No audio detected - microphone might be muted")
            sys.exit(1)

        # Save audio
        save_audio(audio, sample_rate, temp_filepath)

        # Transcribe
        text = transcribe_audio(temp_filepath, args.model)

        print()
        print("=" * 50)
        print("  TRANSCRIPTION")
        print("=" * 50)
        print()
        print(text)
        print()
        print("=" * 50)
        print()

        # Copy to clipboard
        if not args.no_clipboard:
            copy_to_clipboard(text)

        print_success("Done!")
        print()

    finally:
        # Cleanup temp file
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

if __name__ == "__main__":
    main()
