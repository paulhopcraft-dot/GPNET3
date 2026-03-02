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

// Prompts larger than this are passed via stdin to avoid OS ARG_MAX limits.
// (Typical ARG_MAX is 128 KB–2 MB, but a single arg is more constrained.)
const STDIN_THRESHOLD_BYTES = 64 * 1024; // 64 KB

/**
 * Call the Claude CLI subprocess with a prompt.
 * Uses Max plan OAuth — no ANTHROPIC_API_KEY needed.
 *
 * Short prompts (<64 KB): passed via -p flag (fast path).
 * Long prompts (≥64 KB): written to stdin to avoid ARG_MAX limits.
 *
 * @param prompt    Full prompt to send (combine system + user content into one string)
 * @param timeoutMs Request timeout in milliseconds (default 60s)
 */
export async function callClaude(prompt: string, timeoutMs = 60_000): Promise<string> {
  const useLongPath = Buffer.byteLength(prompt, "utf8") >= STDIN_THRESHOLD_BYTES;

  return new Promise((resolve, reject) => {
    const proc = useLongPath
      ? spawn(
          "/usr/bin/claude",
          ["--output-format", "text", "--allowedTools", ""],
          {
            env: CLAUDE_ENV,
            cwd: "/tmp",
            // stdin=pipe so we can write the prompt, then close to signal EOF
            stdio: ["pipe", "pipe", "pipe"],
          }
        )
      : spawn(
          "/usr/bin/claude",
          ["-p", prompt, "--output-format", "text", "--allowedTools", ""],
          {
            env: CLAUDE_ENV,
            cwd: "/tmp",
            // stdin=ignore prevents the CLI blocking waiting for terminal/pipe input
            stdio: ["ignore", "pipe", "pipe"],
          }
        );

    // For long prompts: write to stdin then close (EOF signals end of input)
    if (useLongPath && proc.stdin) {
      proc.stdin.write(prompt, "utf8");
      proc.stdin.end();
    }

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
        // Strip the context-usage line that Claude Code appends via global CLAUDE.md
        // e.g. "*(~3% context)*" — appears at the end of every CLI response
        const cleaned = stdout.trim().replace(/\s*\*\(~\d+% context\)\*/g, "").trim();
        resolve(cleaned);
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
