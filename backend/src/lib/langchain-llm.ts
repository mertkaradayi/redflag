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
// PRIMARY: Free model (mistralai/devstral-2512:free via Mistral)
// FALLBACK 1: Free model (xiaomi/mimo-v2-flash:free via Xiaomi)
// FALLBACK 2: Paid model (openai/gpt-oss-120b via DeepInfra) - last resort
export const MODEL_PRESETS = {
  analyzer: {
    // Primary: Free model
    model: 'mistralai/devstral-2512:free',
    temperature: 0.3, // Lower for technical analysis
    maxTokens: 6000,
    providerOrder: ['mistral'],
  },
  scorer: {
    model: 'mistralai/devstral-2512:free',
    temperature: 0.2, // Very low for consistent scoring
    maxTokens: 2000,
    providerOrder: ['mistral'],
  },
  reporter: {
    model: 'mistralai/devstral-2512:free',
    temperature: 0.7, // Higher for creative writing
    maxTokens: 4000,
    providerOrder: ['mistral'],
  },
  // First fallback: Xiaomi's free model
  fallback: {
    model: 'xiaomi/mimo-v2-flash:free',
    temperature: 0.5,
    maxTokens: 6000,
    providerOrder: ['xiaomi'],
    quantizations: ['fp8'],
  },
  // Second fallback: Paid model (last resort)
  fallback2: {
    model: 'openai/gpt-oss-120b',
    temperature: 0.5,
    maxTokens: 8000,
    providerOrder: ['deepinfra'],
    quantizations: ['fp4'],
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

// Get first fallback model config (Xiaomi free model)
export function getFallbackConfig(agentName: keyof typeof MODEL_PRESETS): LLMConfig {
  const fallback = MODEL_PRESETS.fallback;
  const primary = MODEL_PRESETS[agentName];

  return {
    model: fallback.model,
    temperature: primary.temperature, // Use agent's preferred temperature
    maxTokens: fallback.maxTokens,
    providerOrder: [...fallback.providerOrder],
    quantizations: [...fallback.quantizations],
  };
}

// Get second fallback model config (OpenAI paid model - last resort)
export function getSecondFallbackConfig(agentName: keyof typeof MODEL_PRESETS): LLMConfig {
  const fallback2 = MODEL_PRESETS.fallback2;
  const primary = MODEL_PRESETS[agentName];

  return {
    model: fallback2.model,
    temperature: primary.temperature, // Use agent's preferred temperature
    maxTokens: fallback2.maxTokens,
    providerOrder: [...fallback2.providerOrder],
    quantizations: [...fallback2.quantizations],
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

// Create LLM with two-tier fallback capability
export function createLLMWithFallback(
  primaryConfig: LLMConfig,
  fallbackConfig: LLMConfig,
  fallback2Config?: LLMConfig
): { primary: ChatOpenAI; fallback: ChatOpenAI; fallback2?: ChatOpenAI } {
  return {
    primary: createLLM(primaryConfig),
    fallback: createLLM(fallbackConfig),
    fallback2: fallback2Config ? createLLM(fallback2Config) : undefined,
  };
}
