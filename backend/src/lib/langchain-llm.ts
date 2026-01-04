import { ChatOpenAI } from "@langchain/openai";

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  providerOrder?: string[];    // Provider order preference (e.g., ["deepinfra"])
  quantizations?: string[];    // Quantization filter (e.g., ["fp4"])
}

// Error types that should trigger fallback to paid model
const FALLBACK_ERROR_CODES = [
  429,  // Rate limit
  503,  // Service unavailable
  502,  // Bad gateway
  504,  // Gateway timeout
  500,  // Internal server error
];

const FALLBACK_ERROR_MESSAGES = [
  'rate limit',
  'rate_limit',
  'too many requests',
  'timeout',
  'timed out',
  'service unavailable',
  'model is overloaded',
  'capacity',
];

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
// PRIMARY: Xiaomi free model (xiaomi/mimo-v2-flash:free) - reliable JSON output
// FALLBACK: Mistral free model (mistralai/devstral-2512:free) - coding-focused
export const MODEL_PRESETS = {
  analyzer: {
    // Primary: Xiaomi free model (reliable JSON output)
    model: 'xiaomi/mimo-v2-flash:free',
    temperature: 0.3, // Lower for technical analysis
    maxTokens: 6000,
    providerOrder: ['xiaomi'],
    quantizations: ['fp8'],
  },
  scorer: {
    model: 'xiaomi/mimo-v2-flash:free',
    temperature: 0.2, // Very low for consistent scoring
    maxTokens: 2000,
    providerOrder: ['xiaomi'],
    quantizations: ['fp8'],
  },
  reporter: {
    model: 'xiaomi/mimo-v2-flash:free',
    temperature: 0.7, // Higher for creative writing
    maxTokens: 4000,
    providerOrder: ['xiaomi'],
    quantizations: ['fp8'],
  },
  // Fallback: Mistral's free coding model
  fallback: {
    model: 'mistralai/devstral-2512:free',
    temperature: 0.5,
    maxTokens: 6000,
    providerOrder: ['mistral'],
  },
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

// Get fallback model config (Mistral free model)
export function getFallbackConfig(agentName: keyof typeof MODEL_PRESETS): LLMConfig {
  const fallback = MODEL_PRESETS.fallback;
  const primary = MODEL_PRESETS[agentName];

  return {
    model: fallback.model,
    temperature: primary.temperature, // Use agent's preferred temperature
    maxTokens: fallback.maxTokens,
    providerOrder: [...fallback.providerOrder],
  };
}

// Check if error should trigger fallback to paid model
export function shouldFallback(error: unknown): boolean {
  if (!error) return false;

  const errorObj = error as Record<string, unknown>;

  // Check HTTP status code
  if (typeof errorObj.status === 'number' && FALLBACK_ERROR_CODES.includes(errorObj.status)) {
    return true;
  }

  // Check error message
  const message = (errorObj.message || errorObj.error || String(error)).toString().toLowerCase();
  return FALLBACK_ERROR_MESSAGES.some(pattern => message.includes(pattern));
}

// Create LLM with fallback capability
export function createLLMWithFallback(
  primaryConfig: LLMConfig,
  fallbackConfig: LLMConfig
): { primary: ChatOpenAI; fallback: ChatOpenAI } {
  return {
    primary: createLLM(primaryConfig),
    fallback: createLLM(fallbackConfig),
  };
}
