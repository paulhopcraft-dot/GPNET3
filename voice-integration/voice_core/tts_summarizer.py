"""
TTS Summarizer - Convert tool output to natural speech for Voice V10.

Announces tool actions, summarizes tool results, filters code blocks,
and passes through Claude's natural language text.
"""

import re
from typing import Optional
from dataclasses import dataclass

from stream_parser import ParsedMessage, MessageType


@dataclass
class TTSConfig:
    """Configuration for TTS summarization."""
    announce_tool_use: bool = True
    summarize_tool_result: bool = True
    max_result_words: int = 100
    skip_code_blocks: bool = True
    max_file_list: int = 5  # Max files to announce


class TTSSummarizer:
    """
    Converts parsed CLI messages to natural speech text.

    Handles:
    - Tool announcements: "Reading the config file..."
    - Result summarization: Long outputs become brief summaries
    - Code block filtering: Skip code for speech
    - Text passthrough: Claude's natural language goes through
    """

    def __init__(self, config: Optional[TTSConfig] = None):
        self.config = config or TTSConfig()

    def summarize_for_speech(self, parsed: ParsedMessage) -> Optional[str]:
        """
        Convert a parsed message to speakable text.

        Args:
            parsed: ParsedMessage from StreamParser

        Returns:
            Text suitable for TTS, or None if nothing to speak
        """
        if parsed.type == MessageType.ASSISTANT:
            return self._process_assistant_text(parsed.text)

        elif parsed.type == MessageType.TOOL_USE:
            if self.config.announce_tool_use:
                return parsed.text  # Already formatted by StreamParser
            return None

        elif parsed.type == MessageType.TOOL_RESULT:
            if self.config.summarize_tool_result:
                return self._summarize_result(parsed.tool_result, parsed.is_error)
            return None

        elif parsed.type == MessageType.ERROR:
            return parsed.text

        elif parsed.type == MessageType.RESULT:
            return self._process_assistant_text(parsed.text)

        return None

    def _process_assistant_text(self, text: Optional[str]) -> Optional[str]:
        """Process assistant text, optionally removing code blocks."""
        if not text:
            return None

        processed = text

        if self.config.skip_code_blocks:
            # Remove fenced code blocks
            processed = re.sub(r'```[\s\S]*?```', '', processed)
            # Remove inline code
            processed = re.sub(r'`[^`]+`', '', processed)

        # Clean up whitespace
        processed = re.sub(r'\s+', ' ', processed).strip()

        # Remove markdown artifacts
        processed = re.sub(r'\*\*([^*]+)\*\*', r'\1', processed)  # Bold
        processed = re.sub(r'\*([^*]+)\*', r'\1', processed)  # Italic
        processed = re.sub(r'#{1,6}\s*', '', processed)  # Headers

        if not processed:
            return None

        return processed

    def _summarize_result(self, result: Optional[str], is_error: bool) -> Optional[str]:
        """Summarize tool result for speech."""
        if not result:
            return None

        if is_error:
            # Speak errors but keep them brief
            error_lines = result.strip().split('\n')
            return f"Error: {error_lines[0][:100]}"

        # Check for common result patterns
        result_str = str(result)

        # File list (Glob result)
        if self._looks_like_file_list(result_str):
            return self._summarize_file_list(result_str)

        # Search results (Grep)
        if self._looks_like_search_result(result_str):
            return self._summarize_search_result(result_str)

        # Bash command output
        if self._looks_like_command_output(result_str):
            return self._summarize_command_output(result_str)

        # File content
        if self._looks_like_file_content(result_str):
            return self._summarize_file_content(result_str)

        # Generic summarization
        return self._truncate_to_words(result_str, self.config.max_result_words)

    def _looks_like_file_list(self, text: str) -> bool:
        """Check if text looks like a list of file paths."""
        lines = text.strip().split('\n')
        if len(lines) < 2:
            return False
        # Check if most lines look like paths
        path_like = sum(1 for line in lines if '/' in line or '\\' in line or line.endswith('.py') or line.endswith('.ts'))
        return path_like > len(lines) * 0.5

    def _summarize_file_list(self, text: str) -> str:
        """Summarize a list of files."""
        lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
        count = len(lines)

        if count == 0:
            return "No files found"
        elif count == 1:
            return f"Found one file: {self._filename(lines[0])}"
        elif count <= self.config.max_file_list:
            names = [self._filename(f) for f in lines]
            return f"Found {count} files: {', '.join(names)}"
        else:
            names = [self._filename(f) for f in lines[:self.config.max_file_list]]
            return f"Found {count} files including {', '.join(names)}, and {count - self.config.max_file_list} more"

    def _filename(self, path: str) -> str:
        """Extract filename from path."""
        return path.split('/')[-1].split('\\')[-1]

    def _looks_like_search_result(self, text: str) -> bool:
        """Check if text looks like grep/search results."""
        lines = text.strip().split('\n')
        # Search results often have line numbers like "file.py:42:"
        colon_lines = sum(1 for line in lines if ':' in line and any(c.isdigit() for c in line.split(':')[1] if len(line.split(':')) > 1))
        return colon_lines > len(lines) * 0.3

    def _summarize_search_result(self, text: str) -> str:
        """Summarize search results."""
        lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
        if not lines:
            return "No matches found"

        # Count unique files
        files = set()
        for line in lines:
            if ':' in line:
                files.add(line.split(':')[0])

        if len(files) == 1:
            return f"Found {len(lines)} matches in {self._filename(list(files)[0])}"
        else:
            return f"Found {len(lines)} matches across {len(files)} files"

    def _looks_like_command_output(self, text: str) -> bool:
        """Check if text looks like shell command output."""
        # Look for common command output patterns
        patterns = [
            r'^\s*\d+\s+',  # Line numbers
            r'total \d+',  # ls output
            r'commit [a-f0-9]+',  # git
            r'^\s*-',  # List items
        ]
        return any(re.search(p, text, re.MULTILINE) for p in patterns)

    def _summarize_command_output(self, text: str) -> str:
        """Summarize command output."""
        lines = text.strip().split('\n')
        if len(lines) <= 3:
            return self._truncate_to_words(text, 30)

        # Just give a brief summary
        return f"Command completed with {len(lines)} lines of output"

    def _looks_like_file_content(self, text: str) -> bool:
        """Check if text looks like file content."""
        # Has line numbers at start
        lines = text.strip().split('\n')
        numbered = sum(1 for line in lines if re.match(r'^\s*\d+[\s\t|:]', line))
        return numbered > len(lines) * 0.5

    def _summarize_file_content(self, text: str) -> str:
        """Summarize file content."""
        lines = text.strip().split('\n')
        return f"Read {len(lines)} lines of content"

    def _truncate_to_words(self, text: str, max_words: int) -> str:
        """Truncate text to a maximum number of words."""
        # Clean the text first
        cleaned = re.sub(r'\s+', ' ', text).strip()
        words = cleaned.split()

        if len(words) <= max_words:
            return cleaned

        truncated = ' '.join(words[:max_words])
        return f"{truncated}..."


def summarize_for_speech(parsed: ParsedMessage, config: Optional[TTSConfig] = None) -> Optional[str]:
    """Convenience function to summarize a message for speech."""
    summarizer = TTSSummarizer(config)
    return summarizer.summarize_for_speech(parsed)


if __name__ == "__main__":
    from stream_parser import StreamParser

    parser = StreamParser()
    summarizer = TTSSummarizer()

    test_cases = [
        # Assistant text
        {"type": "assistant", "message": {"content": [{"type": "text", "text": "I'll help you with that. Here's some code:\n```python\nprint('hello')\n```\nLet me know if you need more help."}]}},

        # Tool use
        {"type": "tool_use", "tool": "Read", "input": {"file_path": "/home/user/project/README.md"}},

        # File list result
        {"type": "tool_result", "result": "src/main.py\nsrc/utils.py\nsrc/config.py\ntests/test_main.py\ntests/test_utils.py\ntests/test_config.py\ntests/test_extra.py"},

        # Search result
        {"type": "tool_result", "result": "src/main.py:42: def process_data():\nsrc/utils.py:15: def process_data(x):"},

        # Error
        {"type": "tool_result", "result": "File not found: /path/to/missing.txt", "is_error": True},
    ]

    for case in test_cases:
        parsed = parser.parse_line(case)
        speech = summarizer.summarize_for_speech(parsed)
        print(f"Input type: {parsed.type.value}")
        print(f"Speech: {speech}")
        print("-" * 40)
