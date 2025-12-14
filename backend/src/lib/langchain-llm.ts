import { ChatOpenAI } from "@langchain/openai";

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  providerOrder?: string[];    // Provider order preference (e.g., ["deepinfra"])
  quantizations?: string[];    // Quantization filter (e.g., ["fp4"])
}

// Create LLM using OpenRouter
export function createLLM(config: LLMConfig): ChatOpenAI {
  const apiKey = process.env.OPEN_ROUTER_KEY;

  if (!apiKey) {
    throw new Error('OPEN_ROUTER_KEY not set in environment');
  }

  const headers: Record<string, string> = {
    'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
    'X-Title': 'RedFlag Smart Contract Analyzer',
  };

  // Build provider object for OpenRouter routing preferences
  // OpenRouter expects this in the request body, not headers
  const providerConfig: Record<string, unknown> = {};

  if (config.providerOrder && config.providerOrder.length > 0) {
    providerConfig.order = config.providerOrder;
    console.log(`[LLM] Provider order: ${config.providerOrder.join(', ')}`);
  }

  if (config.quantizations && config.quantizations.length > 0) {
    providerConfig.quantizations = config.quantizations;
    console.log(`[LLM] Quantizations: ${config.quantizations.join(', ')}`);
  }

  // Build modelKwargs only if we have provider config
  const modelKwargs = Object.keys(providerConfig).length > 0
    ? { provider: providerConfig }
    : undefined;

  return new ChatOpenAI({
    modelName: config.model,
    openAIApiKey: apiKey,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4000,
    modelKwargs,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: headers,
    },
  });
}

// Model presets for each agent
// Using openai/gpt-oss-120b via DeepInfra FP4 quantization
// Cost: $0.039 per 1M input tokens, $0.19 per 1M output tokens
// With Map-Reduce chunking, each module analyzed separately = smaller outputs
export const MODEL_PRESETS = {
  analyzer: {
    model: 'openai/gpt-oss-120b',
    temperature: 0.3, // Lower for technical analysis
    maxTokens: 6000, // Per-module analysis: fewer functions = smaller output
    providerOrder: ['deepinfra'],
    quantizations: ['fp4'],
  },
  scorer: {
    model: 'openai/gpt-oss-120b',
    temperature: 0.2, // Very low for consistent scoring
    maxTokens: 2000, // Small: just score + justification
    providerOrder: ['deepinfra'],
    quantizations: ['fp4'],
  },
  reporter: {
    model: 'openai/gpt-oss-120b',
    temperature: 0.7, // Higher for creative writing
    maxTokens: 4000, // Medium: summary report
    providerOrder: ['deepinfra'],
    quantizations: ['fp4'],
  },
  fallback: {
    model: 'meta-llama/llama-3.3-70b-instruct:free', // Free fallback (no provider needed)
    temperature: 0.5,
    maxTokens: 8000,
  }
} as const;

// Environment variable overrides
export function getModelConfig(agentName: keyof typeof MODEL_PRESETS): LLMConfig {
  const preset = MODEL_PRESETS[agentName];
  const envModel = process.env[`LLM_MODEL_${agentName.toUpperCase()}`];

  return {
    model: envModel || preset.model,
    temperature: preset.temperature,
    maxTokens: 'maxTokens' in preset ? preset.maxTokens : undefined,
    providerOrder: 'providerOrder' in preset ? [...preset.providerOrder] : undefined,
    quantizations: 'quantizations' in preset ? [...preset.quantizations] : undefined,
  };
}
