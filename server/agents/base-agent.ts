/**
 * Base Agent — Claude CLI subprocess pattern
 *
 * No API key needed — uses Max plan OAuth via `claude` CLI.
 *
 * Pattern:
 * 1. Caller pre-gathers context (case data, certs, etc.) by calling read tools directly
 * 2. runAgent builds a prompt: task + context + available write actions
 * 3. Spawns `claude -p "..."` subprocess (Max plan OAuth, no API key cost)
 * 4. Claude returns JSON: { actions: [{tool, args, reasoning, autoExecute}], summary }
 * 5. Each action is executed and persisted to agent_actions for the UI log
 */

import { spawn } from "child_process";
import { createLogger } from "../lib/logger";
import { db } from "../db";
import { agentActions } from "@shared/schema";

const logger = createLogger("BaseAgent");

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentResult {
  result: string;
  jobId: string;
  actionsCount: number;
}

interface PlannedAction {
  tool: string;
  args: Record<string, unknown>;
  reasoning: string;
  autoExecute?: boolean;
}

interface ClaudeActionPlan {
  actions: PlannedAction[];
  summary: string;
}

/**
 * Call the claude CLI subprocess with a prompt.
 * Uses Max plan OAuth — no ANTHROPIC_API_KEY needed.
 *
 * Uses spawn (not execFile) so we can:
 * - Set stdin to 'ignore' (prevents the CLI blocking on stdin input)
 * - Stream stdout as it arrives (avoids deadlock with large responses)
 * - Run from /tmp (avoids loading project CLAUDE.md context)
 */
async function callClaude(prompt: string): Promise<string> {
  // Minimal clean env — strips inherited Claude Code session vars
  // (CLAUDECODE, ANTHROPIC_API_KEY, CLAUDE_CODE_*) that cause auth issues.
  const env = {
    HOME: process.env.HOME ?? "/home/paul_clawdbot",
    USER: process.env.USER ?? "paul_clawdbot",
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    LANG: process.env.LANG ?? "en_US.UTF-8",
    TMPDIR: process.env.TMPDIR ?? "/tmp",
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "/usr/bin/claude",
      [
        "-p", prompt,
        "--output-format", "text",
        // Disable built-in tools — we only need a single LLM response, not agentic tool use.
        "--allowedTools", "",
      ],
      {
        env,
        // /tmp — avoids claude CLI loading gpnet3 CLAUDE.md project context
        cwd: "/tmp",
        // stdin=ignore prevents the CLI blocking waiting for terminal/pipe input
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr?.on("data", (data: Buffer) => { stderr += data.toString(); });

    const TIMEOUT_MS = 600_000; // 10 minutes
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Claude CLI timed out after ${TIMEOUT_MS / 1000}s. Partial output: ${stdout.slice(0, 200)}`));
    }, TIMEOUT_MS);

    proc.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(
          `Claude CLI exited ${signal ? `signal=${signal}` : `code=${code}`}. ` +
          `stderr=${stderr.slice(0, 300) || "(empty)"} partial=${stdout.slice(0, 200) || "(empty)"}`
        ));
      }
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`Claude CLI spawn failed: ${err.message}`));
    });
  });
}

/**
 * Parse Claude's JSON action plan from its response.
 * Handles markdown code blocks and raw JSON.
 */
function parseActionPlan(raw: string): ClaudeActionPlan {
  // Strip markdown code fences if present
  const codeMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  const jsonStr = codeMatch ? codeMatch[1].trim() : raw.trim();

  // Extract JSON object if there's surrounding text
  const objMatch = jsonStr.match(/(\{[\s\S]*\})/);
  return JSON.parse(objMatch ? objMatch[1] : jsonStr);
}

/**
 * Run an agent using the Claude CLI subprocess.
 *
 * @param task       Plain-English description of what the agent should do
 * @param context    Pre-gathered data (fetched by the caller before calling this)
 * @param actionTools  Write tools Claude can request (read tools should NOT be included)
 * @param jobId      Agent job ID for action log persistence
 * @param caseId     Case ID (empty string for org-level agents like coordinator)
 */
export async function runAgent(
  task: string,
  context: Record<string, unknown>,
  actionTools: AgentTool[],
  jobId: string,
  caseId: string
): Promise<AgentResult> {
  const toolDescriptions = actionTools
    .map(
      (t) =>
        `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.inputSchema.properties)}`
    )
    .join("\n");

  const prompt = `You are an autonomous Preventli RTW case management agent.

TASK:
${task}

CONTEXT (pre-gathered data — use this to make decisions):
${JSON.stringify(context, null, 2)}

AVAILABLE ACTIONS:
${toolDescriptions}

Analyse the context and decide what actions to take. Respond with ONLY valid JSON in this exact format:
{
  "actions": [
    {
      "tool": "<tool_name>",
      "args": { <tool_arguments> },
      "reasoning": "<one sentence: why you are taking this action>",
      "autoExecute": true
    }
  ],
  "summary": "<plain English: what you found and what you did>"
}

Rules:
- Only include actions genuinely needed based on the context
- Set autoExecute to false for anything requiring human review or approval
- If no actions are needed, return an empty actions array with a summary explaining why
- Use exact tool names from AVAILABLE ACTIONS
- Be concise in reasoning (one sentence per action)`;

  logger.info("Running agent via Claude CLI", { jobId, caseId });

  let rawResponse: string;
  try {
    rawResponse = await callClaude(prompt);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Claude CLI failed", { jobId, caseId, error: msg.slice(0, 500) });
    throw new Error(`Claude CLI subprocess failed: ${msg.slice(0, 400)}`);
  }

  let plan: ClaudeActionPlan;
  try {
    plan = parseActionPlan(rawResponse);
  } catch (err) {
    // If JSON parsing fails, return the raw response as the summary with no actions
    logger.warn("Claude response was not valid JSON — using raw text as summary", {
      jobId,
      preview: rawResponse.slice(0, 200),
    });
    return { result: rawResponse, jobId, actionsCount: 0 };
  }

  let actionsCount = 0;

  for (const action of plan.actions ?? []) {
    const tool = actionTools.find((t) => t.name === action.tool);
    if (!tool) {
      logger.warn("Claude requested unknown tool", { tool: action.tool, jobId });
      continue;
    }

    let result: unknown;

    try {
      result = await tool.execute(action.args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result = { error: msg };
      logger.error("Action execution failed", { tool: action.tool, jobId }, err);
    }

    // Persist every action to agent_actions for the UI action log
    await db
      .insert(agentActions)
      .values({
        jobId,
        caseId: caseId || null,
        actionType: action.tool,
        reasoning: action.reasoning,
        args: action.args,
        result: result as Record<string, unknown>,
        autoExecuted: action.autoExecute !== false,
        approvalStatus: action.autoExecute === false ? "pending" : null,
      })
      .catch((dbErr) => {
        logger.warn("Failed to persist agent action", { tool: action.tool }, dbErr);
      });

    actionsCount++;
  }

  logger.info("Agent completed", { jobId, caseId, actionsCount });
  return { result: plan.summary ?? "Done.", jobId, actionsCount };
}
