"""
CLI Bridge - Claude CLI subprocess manager for Voice V10.

Spawns Claude CLI with stream-json output, yielding parsed JSON lines.
Supports session management and barge-in interruption.
"""

import asyncio
import json
import uuid
from typing import AsyncIterator, Optional
from dataclasses import dataclass
import subprocess
import os


@dataclass
class CLIConfig:
    """Configuration for Claude CLI Bridge."""
    claude_path: str = r"C:\Users\Paul\AppData\Roaming\npm\claude.cmd"
    model: str = "sonnet"
    working_directory: str = os.getcwd()
    dangerously_skip_permissions: bool = True


class ClaudeCLIBridge:
    """
    Manages Claude CLI subprocess with streaming JSON output.

    Usage:
        bridge = ClaudeCLIBridge()
        async for message in bridge.execute("What files are here?"):
            print(message)
    """

    def __init__(self, session_id: Optional[str] = None, config: Optional[CLIConfig] = None):
        self.config = config or CLIConfig()
        self.session_id = session_id or str(uuid.uuid4())
        self._process: Optional[asyncio.subprocess.Process] = None
        self._cancelled = False

    async def execute(self, prompt: str) -> AsyncIterator[dict]:
        """
        Execute a prompt via Claude CLI and stream JSON responses.

        Args:
            prompt: The user's natural language command

        Yields:
            Parsed JSON messages from CLI output (assistant, tool_use, tool_result, result)
        """
        self._cancelled = False

        # Build command
        cmd = [
            self.config.claude_path,
            "-p",  # Print mode (non-interactive)
            "--output-format", "stream-json",
            "--verbose",  # Required for stream-json
            "--model", self.config.model,
            "--session-id", self.session_id,
        ]

        if self.config.dangerously_skip_permissions:
            cmd.append("--dangerously-skip-permissions")

        # Add the prompt as the final argument
        cmd.append(prompt)

        try:
            # Spawn subprocess
            # On Windows, use shell=True for .cmd files
            if os.name == 'nt':
                # Join command for shell execution
                cmd_str = subprocess.list2cmdline(cmd)
                self._process = await asyncio.create_subprocess_shell(
                    cmd_str,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.config.working_directory,
                    creationflags=subprocess.CREATE_NO_WINDOW,
                )
            else:
                self._process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.config.working_directory,
                )

            # Stream stdout line by line
            while True:
                if self._cancelled:
                    break

                line = await self._process.stdout.readline()
                if not line:
                    break

                # Parse JSON line
                try:
                    text = line.decode('utf-8').strip()
                    if text:
                        message = json.loads(text)
                        yield message
                except json.JSONDecodeError as e:
                    # Some lines might not be valid JSON (startup messages, etc.)
                    yield {"type": "raw", "content": text}

            # Wait for process to complete
            await self._process.wait()

        except Exception as e:
            yield {"type": "error", "error": str(e)}
        finally:
            self._process = None

    def cancel(self) -> None:
        """
        Cancel the current CLI execution (for barge-in).
        Kills the subprocess immediately.
        """
        self._cancelled = True
        if self._process and self._process.returncode is None:
            try:
                self._process.terminate()
                # On Windows, also try to kill child processes
                if os.name == 'nt':
                    subprocess.run(
                        ['taskkill', '/F', '/T', '/PID', str(self._process.pid)],
                        capture_output=True,
                        creationflags=subprocess.CREATE_NO_WINDOW,
                    )
            except Exception:
                pass  # Process may have already terminated

    def reset_session(self) -> None:
        """
        Reset the conversation session.
        Creates a new session ID for fresh context.
        """
        self.cancel()
        self.session_id = str(uuid.uuid4())

    @property
    def is_running(self) -> bool:
        """Check if CLI subprocess is currently running."""
        return self._process is not None and self._process.returncode is None


# Convenience function for one-off executions
async def execute_claude_command(prompt: str, session_id: Optional[str] = None) -> list[dict]:
    """
    Execute a single Claude CLI command and return all responses.

    Args:
        prompt: The command to execute
        session_id: Optional session ID for context continuity

    Returns:
        List of parsed JSON messages
    """
    bridge = ClaudeCLIBridge(session_id=session_id)
    messages = []
    async for message in bridge.execute(prompt):
        messages.append(message)
    return messages


if __name__ == "__main__":
    # Quick test
    async def test():
        bridge = ClaudeCLIBridge()
        print(f"Session ID: {bridge.session_id}")
        print("Executing: What is 2+2?")
        print("-" * 40)

        async for msg in bridge.execute("What is 2+2? Answer briefly."):
            print(json.dumps(msg, indent=2))

    asyncio.run(test())
