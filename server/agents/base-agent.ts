/**
 * Base Agent Loop — Preventli Agentic System
 *
 * An agent is an LLM in a loop with tools.
 * This is the entire engine — ~80 lines.
 *
 * Uses Anthropic SDK (already configured in the project).
 * No external LLM providers needed.
 */

import Anthropic from "@anthropic-ai/sdk";
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

const MAX_ITERATIONS = 20; // Safety limit — prevent infinite loops

export async function runAgent(
  task: string,
  tools: AgentTool[],
  jobId: string,
  caseId: string,
  model: string = "claude-3-5-haiku-20241022"
): Promise<AgentResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: task }
  ];

  let actionsCount = 0;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
      messages,
    });

    // Add assistant response to conversation
    messages.push({ role: "assistant", content: response.content });

    // Done — no tool calls
    if (response.stop_reason === "end_turn") {
      const resultText = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.TextBlock).text)
        .join("\n");

      logger.info("Agent completed", { jobId, caseId, iterations, actionsCount });
      return { result: resultText, jobId, actionsCount };
    }

    // Execute tool calls
    const toolUseBlocks = response.content.filter(
      (b) => b.type === "tool_use"
    ) as Anthropic.ToolUseBlock[];

    if (toolUseBlocks.length === 0) break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolCall of toolUseBlocks) {
      const tool = tools.find((t) => t.name === toolCall.name);

      if (!tool) {
        logger.warn("Unknown tool called", { tool: toolCall.name, jobId });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
        });
        continue;
      }

      const args = toolCall.input as Record<string, unknown>;
      logger.info("Tool called", { tool: toolCall.name, jobId, caseId });

      let result: unknown;
      let error: string | undefined;

      try {
        result = await tool.execute(args);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        result = { error };
        logger.error("Tool execution failed", { tool: toolCall.name, jobId }, err);
      }

      // Persist every action to the database for the action log UI
      await db.insert(agentActions).values({
        jobId,
        caseId,
        actionType: toolCall.name,
        args,
        result: result as Record<string, unknown>,
        autoExecuted: true,
        approvalStatus: null,
      }).catch((dbErr) => {
        logger.warn("Failed to persist agent action", { tool: toolCall.name }, dbErr);
      });

      actionsCount++;

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // Feed tool results back to the model
    messages.push({ role: "user", content: toolResults });
  }

  logger.warn("Agent hit iteration limit", { jobId, iterations });
  return {
    result: "Agent reached maximum iteration limit.",
    jobId,
    actionsCount,
  };
}
