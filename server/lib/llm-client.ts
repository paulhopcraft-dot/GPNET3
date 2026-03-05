/**
 * LLM Client — portable API-based replacement for Claude CLI subprocess
 *
 * Supports:
 *   - OpenRouter  (primary — uses OpenAI-compatible SDK, set LLM_PROVIDER=openrouter)
 *   - Anthropic   (alternative — set LLM_PROVIDER=anthropic)
 *
 * Drop-in replacement for the previous claude-cli.ts subprocess pattern.
 * Same signature: callClaude(prompt, timeoutMs?) => Promise<string>
 *
 * Environment variables:
 *   LLM_PROVIDER          'openrouter' | 'anthropic'   (default: openrouter)
 *   OPENROUTER_API_KEY    Required when LLM_PROVIDER=openrouter
 *   ANTHROPIC_API_KEY     Required when LLM_PROVIDER=anthropic
 *   LLM_MODEL             Override model (optional)
 *   OPENROUTER_BASE_URL   Override base URL (optional, default: https://openrouter.ai/api/v1)
 */

import { createLogger } from "./logger";

const logger = createLogger("LLMClient");

// ─── Provider configuration ───────────────────────────────────────────────────

type Provider = "openrouter" | "anthropic";

function getProvider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "openrouter").toLowerCase();
  if (p === "anthropic") return "anthropic";
  return "openrouter";
}

// Default models per provider — override with LLM_MODEL env var
const DEFAULT_MODELS: Record<Provider, string> = {
  openrouter: "anthropic/claude-sonnet-4-5",
  anthropic: "claude-sonnet-4-5-20250929",
};

function getModel(): string {
  return process.env.LLM_MODEL ?? DEFAULT_MODELS[getProvider()];
}

// ─── OpenRouter (OpenAI-compatible) ──────────────────────────────────────────

async function callOpenRouter(prompt: string, timeoutMs: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to your .env file.");
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const model = getModel();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "https://preventli.com.au",
        "X-Title": "Preventli",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "(no body)");
      throw new Error(`OpenRouter API error ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (data.error) {
      throw new Error(`OpenRouter error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter returned empty content");
    }

    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Anthropic SDK ────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string, timeoutMs: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to your .env file.");
  }

  // Dynamic import — only load the SDK when this provider is selected
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const model = getModel();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const message = await client.messages.create(
      {
        model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal }
    );

    const content = message.content[0];
    if (!content || content.type !== "text") {
      throw new Error("Anthropic returned unexpected content type");
    }

    return content.text.trim();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public interface ─────────────────────────────────────────────────────────

/**
 * Send a prompt to the configured LLM provider and return the response text.
 *
 * Matches the signature of the previous callClaude() CLI function so all
 * existing callers work without changes.
 *
 * @param prompt    Complete prompt (combine system + user context into one string)
 * @param timeoutMs Request timeout in milliseconds (default: 60s)
 */
export async function callClaude(prompt: string, timeoutMs = 60_000): Promise<string> {
  const provider = getProvider();

  logger.debug("LLM request", {
    provider,
    model: getModel(),
    promptLength: prompt.length,
    timeoutMs,
  });

  const t0 = Date.now();
  try {
    const result = provider === "anthropic"
      ? await callAnthropic(prompt, timeoutMs)
      : await callOpenRouter(prompt, timeoutMs);

    const durationMs = Date.now() - t0;
    logger.debug("LLM response received", { provider, responseLength: result.length, durationMs });

    // Record latency for /api/control/performance — lazy import avoids circular deps
    import("../services/metricsService").then(({ recordAiCall }) => {
      recordAiCall(durationMs);
    }).catch(() => {});

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("LLM call failed", { provider, model: getModel(), error: msg.slice(0, 300) });
    throw err;
  }
}

/**
 * Check if LLM provider is configured and reachable.
 * Returns a status object for health checks.
 */
export async function checkLLMHealth(): Promise<{ ok: boolean; provider: string; model: string; error?: string }> {
  const provider = getProvider();
  const model = getModel();

  try {
    // Validate API key is set — don't make a real API call for health checks
    if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) {
      return { ok: false, provider, model, error: "OPENROUTER_API_KEY not set" };
    }
    if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      return { ok: false, provider, model, error: "ANTHROPIC_API_KEY not set" };
    }
    return { ok: true, provider, model };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, provider, model, error: msg };
  }
}
