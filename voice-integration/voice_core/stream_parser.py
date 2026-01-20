"""
Stream Parser - Parse Claude CLI stream-json output for Voice V10.

Handles message types: assistant, tool_use, tool_result, result, error.
Extracts text content blocks and identifies tool operations.
"""

from dataclasses import dataclass, field
from typing import Optional, Any
from enum import Enum


class MessageType(Enum):
    """Types of messages from Claude CLI stream-json output."""
    ASSISTANT = "assistant"
    TOOL_USE = "tool_use"
    TOOL_RESULT = "tool_result"
    RESULT = "result"
    SYSTEM = "system"
    ERROR = "error"
    RAW = "raw"
    UNKNOWN = "unknown"


@dataclass
class ParsedMessage:
    """Parsed message from Claude CLI stream output."""
    type: MessageType
    text: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_result: Optional[str] = None
    is_error: bool = False
    raw_data: dict = field(default_factory=dict)

    @property
    def has_text(self) -> bool:
        """Check if message contains speakable text."""
        return bool(self.text and self.text.strip())

    @property
    def is_tool_operation(self) -> bool:
        """Check if message is a tool use or result."""
        return self.type in (MessageType.TOOL_USE, MessageType.TOOL_RESULT)


class StreamParser:
    """
    Parser for Claude CLI stream-json output.

    Converts raw JSON lines into structured ParsedMessage objects
    suitable for TTS summarization.
    """

    # Tool name mappings for friendly announcements
    TOOL_NAMES = {
        "Read": "reading file",
        "Write": "writing file",
        "Edit": "editing file",
        "Bash": "running command",
        "Glob": "searching for files",
        "Grep": "searching in files",
        "Task": "starting a task",
        "WebFetch": "fetching web content",
        "WebSearch": "searching the web",
        "TodoWrite": "updating task list",
        "AskUserQuestion": "asking a question",
    }

    def parse_line(self, json_data: dict) -> ParsedMessage:
        """
        Parse a JSON message from Claude CLI output.

        Args:
            json_data: Parsed JSON dictionary from CLI output

        Returns:
            ParsedMessage with extracted content
        """
        msg_type = json_data.get("type", "unknown")

        # Handle different message types
        if msg_type == "assistant":
            return self._parse_assistant(json_data)
        elif msg_type == "tool_use":
            return self._parse_tool_use(json_data)
        elif msg_type == "tool_result":
            return self._parse_tool_result(json_data)
        elif msg_type == "result":
            return self._parse_result(json_data)
        elif msg_type == "system":
            return self._parse_system(json_data)
        elif msg_type == "error":
            return self._parse_error(json_data)
        elif msg_type == "raw":
            return ParsedMessage(
                type=MessageType.RAW,
                text=json_data.get("content"),
                raw_data=json_data
            )
        else:
            return ParsedMessage(
                type=MessageType.UNKNOWN,
                raw_data=json_data
            )

    def _parse_assistant(self, data: dict) -> ParsedMessage:
        """Parse assistant message with text content."""
        # Extract text from content blocks
        message = data.get("message", {})
        content = message.get("content", [])

        text_parts = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
            elif isinstance(block, str):
                text_parts.append(block)

        return ParsedMessage(
            type=MessageType.ASSISTANT,
            text=" ".join(text_parts).strip() if text_parts else None,
            raw_data=data
        )

    def _parse_tool_use(self, data: dict) -> ParsedMessage:
        """Parse tool use message."""
        tool_name = data.get("tool", data.get("name", "unknown"))
        tool_input = data.get("input", data.get("arguments", {}))

        # Get friendly description
        friendly_name = self.TOOL_NAMES.get(tool_name, f"using {tool_name}")

        # Extract relevant info for announcement
        announcement = self._format_tool_announcement(tool_name, tool_input, friendly_name)

        return ParsedMessage(
            type=MessageType.TOOL_USE,
            text=announcement,
            tool_name=tool_name,
            tool_input=tool_input,
            raw_data=data
        )

    def _parse_tool_result(self, data: dict) -> ParsedMessage:
        """Parse tool result message."""
        result = data.get("result", data.get("output", ""))

        # Convert result to string if needed
        if isinstance(result, dict):
            result = str(result)
        elif isinstance(result, list):
            result = "\n".join(str(item) for item in result)

        return ParsedMessage(
            type=MessageType.TOOL_RESULT,
            tool_result=result,
            is_error=data.get("is_error", False) or data.get("error", False),
            raw_data=data
        )

    def _parse_result(self, data: dict) -> ParsedMessage:
        """Parse final result message."""
        result = data.get("result", "")
        return ParsedMessage(
            type=MessageType.RESULT,
            text=result if isinstance(result, str) else str(result),
            raw_data=data
        )

    def _parse_system(self, data: dict) -> ParsedMessage:
        """Parse system message."""
        return ParsedMessage(
            type=MessageType.SYSTEM,
            text=data.get("message", data.get("text", "")),
            raw_data=data
        )

    def _parse_error(self, data: dict) -> ParsedMessage:
        """Parse error message."""
        error_text = data.get("error", data.get("message", "An error occurred"))
        return ParsedMessage(
            type=MessageType.ERROR,
            text=f"Error: {error_text}",
            is_error=True,
            raw_data=data
        )

    def _format_tool_announcement(self, tool_name: str, tool_input: dict, friendly_name: str) -> str:
        """Format a brief announcement for tool use."""
        if tool_name == "Read":
            path = tool_input.get("file_path", "a file")
            # Get just the filename
            filename = path.split("/")[-1].split("\\")[-1]
            return f"Reading {filename}"

        elif tool_name == "Write":
            path = tool_input.get("file_path", "a file")
            filename = path.split("/")[-1].split("\\")[-1]
            return f"Writing {filename}"

        elif tool_name == "Edit":
            path = tool_input.get("file_path", "a file")
            filename = path.split("/")[-1].split("\\")[-1]
            return f"Editing {filename}"

        elif tool_name == "Bash":
            cmd = tool_input.get("command", "")
            # Get first part of command for announcement
            cmd_name = cmd.split()[0] if cmd else "a command"
            return f"Running {cmd_name}"

        elif tool_name == "Glob":
            pattern = tool_input.get("pattern", "files")
            return f"Searching for {pattern}"

        elif tool_name == "Grep":
            pattern = tool_input.get("pattern", "text")
            return f"Searching for {pattern}"

        elif tool_name == "Task":
            desc = tool_input.get("description", "a task")
            return f"Starting {desc}"

        elif tool_name == "WebFetch":
            url = tool_input.get("url", "a webpage")
            return f"Fetching {url}"

        elif tool_name == "WebSearch":
            query = tool_input.get("query", "")
            return f"Searching for {query}"

        else:
            return f"Using {tool_name}"


def parse_cli_message(json_data: dict) -> ParsedMessage:
    """Convenience function to parse a single CLI message."""
    parser = StreamParser()
    return parser.parse_line(json_data)


if __name__ == "__main__":
    # Test parsing
    parser = StreamParser()

    test_messages = [
        {"type": "assistant", "message": {"content": [{"type": "text", "text": "Hello! How can I help?"}]}},
        {"type": "tool_use", "tool": "Read", "input": {"file_path": "/path/to/README.md"}},
        {"type": "tool_result", "result": "# README\n\nThis is a test file."},
        {"type": "error", "error": "File not found"},
    ]

    for msg in test_messages:
        parsed = parser.parse_line(msg)
        print(f"Type: {parsed.type.value}")
        print(f"Text: {parsed.text}")
        print(f"Tool: {parsed.tool_name}")
        print("-" * 40)
