/**
 * Shared Claude CLI subprocess helper.
 *
 * All AI calls in this codebase use the Claude CLI subprocess instead of the
 * Anthropic SDK, so no ANTHROPIC_API_KEY is needed — Max plan OAuth is used.
 *
 * Pattern: same as server/agents/base-agent.ts
 */

import { spawn } from "child_process";

// Minimal clean env — strips inherited Claude Code session vars
// (CLAUDECODE, ANTHROPIC_API_KEY, CLAUDE_CODE_*) that cause auth issues.
const CLAUDE_ENV = {
  HOME: process.env.HOME ?? "/home/paul_clawdbot",
  USER: process.env.USER ?? "paul_clawdbot",
  PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
  LANG: process.env.LANG ?? "en_US.UTF-8",
  TMPDIR: process.env.TMPDIR ?? "/tmp",
};

/**
 * Call the Claude CLI subprocess with a prompt.
 * Uses Max plan OAuth — no ANTHROPIC_API_KEY needed.
 *
 * @param prompt    Full prompt to send (combine system + user content into one string)
 * @param timeoutMs Request timeout in milliseconds (default 60s)
 */
export async function callClaude(prompt: string, timeoutMs = 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "/usr/bin/claude",
      ["-p", prompt, "--output-format", "text", "--allowedTools", ""],
      {
        env: CLAUDE_ENV,
        // /tmp — avoids claude CLI loading gpnet3 CLAUDE.md project context
        cwd: "/tmp",
        // stdin=ignore prevents the CLI blocking waiting for terminal/pipe input
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Claude CLI timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(
          `Claude CLI exit ${signal ? `signal=${signal}` : `code=${code}`}: ` +
          `${stderr.slice(0, 200) || "(no stderr)"}`
        ));
      }
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`Claude CLI spawn failed: ${err.message}`));
    });
  });
}
