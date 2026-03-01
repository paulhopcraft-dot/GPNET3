/**
 * LLM Adapter - Drop-in replacement for Anthropic SDK
 * 
 * Provides an Anthropic-compatible interface that routes to either:
 * - Local inference (vLLM, Ollama, TGI)
 * - Cloud API (Anthropic, OpenAI, etc.)
 * 
 * Usage:
 *   import { createLLMClient } from './llmAdapter';
 *   const client = createLLMClient();
 *   const response = await client.messages.create({ ... });
 */

import OpenAI from 'openai';

// ============================================================
// Configuration
// ============================================================

interface LLMConfig {
  provider: 'local' | 'anthropic' | 'openai';
  baseURL?: string;
  apiKey?: string;
  defaultModel?: string;
}

function getConfig(): LLMConfig {
  // Check for local inference first
  if (process.env.LOCAL_LLM_URL) {
    return {
      provider: 'local',
      baseURL: process.env.LOCAL_LLM_URL,
      apiKey: process.env.LOCAL_LLM_API_KEY || 'not-needed',
      defaultModel: process.env.LOCAL_LLM_MODEL || 'qwen2.5-72b-instruct'
    };
  }
  
  // Fall back to Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY
    };
  }
  
  throw new Error('No LLM configuration found. Set LOCAL_LLM_URL or ANTHROPIC_API_KEY');
}

// ============================================================
// Model Mapping (Anthropic → Local equivalents)
// ============================================================

const MODEL_MAP: Record<string, string> = {
  // Haiku equivalents (fast, cheap)
  'claude-3-haiku-20240307': 'qwen2.5-7b-instruct',
  'claude-3-5-haiku-20241022': 'qwen2.5-7b-instruct',
  
  // Sonnet equivalents (balanced)
  'claude-3-sonnet-20240229': 'qwen2.5-32b-instruct',
  'claude-3-5-sonnet-20241022': 'qwen2.5-72b-instruct',
  'claude-sonnet-4-20250514': 'qwen2.5-72b-instruct',
  
  // Opus equivalents (max capability)
  'claude-3-opus-20240229': 'qwen2.5-72b-instruct',
};

function mapModel(anthropicModel: string, config: LLMConfig): string {
  if (config.provider !== 'local') {
    return anthropicModel;
  }
  return MODEL_MAP[anthropicModel] || config.defaultModel || 'qwen2.5-72b-instruct';
}

// ============================================================
// Message Format Conversion
// ============================================================

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; }>;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  temperature?: number;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

function convertToOpenAIFormat(request: AnthropicRequest): {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature?: number;
} {
  const messages: Array<{ role: string; content: string }> = [];
  
  // Add system message if present
  if (request.system) {
    messages.push({ role: 'system', content: request.system });
  }
  
  // Convert Anthropic messages
  for (const msg of request.messages) {
    const content = typeof msg.content === 'string' 
      ? msg.content 
      : msg.content.map(c => c.text || '').join('\n');
    
    messages.push({ role: msg.role, content });
  }
  
  return {
    model: request.model,
    messages,
    max_tokens: request.max_tokens,
    temperature: request.temperature
  };
}

function convertToAnthropicFormat(
  openaiResponse: OpenAI.Chat.Completions.ChatCompletion,
  model: string
): AnthropicResponse {
  const choice = openaiResponse.choices[0];
  
  return {
    id: openaiResponse.id,
    type: 'message',
    role: 'assistant',
    content: [{
      type: 'text',
      text: choice.message.content || ''
    }],
    model,
    stop_reason: choice.finish_reason === 'stop' ? 'end_turn' : choice.finish_reason || 'end_turn',
    usage: {
      input_tokens: openaiResponse.usage?.prompt_tokens || 0,
      output_tokens: openaiResponse.usage?.completion_tokens || 0
    }
  };
}

// ============================================================
// Local LLM Client (Anthropic-compatible interface)
// ============================================================

class LocalLLMClient {
  private openai: OpenAI;
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
    this.openai = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey
    });
  }
  
  get messages() {
    return {
      create: async (request: AnthropicRequest): Promise<AnthropicResponse> => {
        const mappedModel = mapModel(request.model, this.config);
        const openaiRequest = convertToOpenAIFormat({
          ...request,
          model: mappedModel
        });
        
        const response = await this.openai.chat.completions.create(openaiRequest);
        return convertToAnthropicFormat(response, mappedModel);
      }
    };
  }
}

// ============================================================
// Factory Function
// ============================================================

export function createLLMClient() {
  const config = getConfig();
  
  if (config.provider === 'local') {
    console.log(`[LLM] Using local inference at ${config.baseURL}`);
    return new LocalLLMClient(config);
  }
  
  // For Anthropic, return the actual SDK
  // This is a lazy import to avoid issues if anthropic isn't installed
  const Anthropic = require('@anthropic-ai/sdk').default;
  console.log('[LLM] Using Anthropic API');
  return new Anthropic({ apiKey: config.apiKey });
}

// ============================================================
// Helper: Test connection
// ============================================================

export async function testLLMConnection(): Promise<{
  ok: boolean;
  provider: string;
  model?: string;
  error?: string;
}> {
  try {
    const client = createLLMClient();
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307', // Will be mapped to local model
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }]
    });
    
    return {
      ok: true,
      provider: getConfig().provider,
      model: response.model
    };
  } catch (error) {
    return {
      ok: false,
      provider: getConfig().provider,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
