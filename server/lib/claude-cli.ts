/**
 * claude-cli.ts — backwards-compatible re-export
 *
 * Previously this module spawned /usr/bin/claude as a subprocess (Max plan OAuth).
 * It now delegates to llm-client.ts which uses portable API-based providers.
 *
 * All existing callers continue to work without modification:
 *   import { callClaude } from "../lib/claude-cli";
 */

export { callClaude } from "./llm-client";
