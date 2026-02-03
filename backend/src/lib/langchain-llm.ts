import { ChatOpenAI } from "@langchain/openai";

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
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

  return new ChatOpenAI({
    modelName: config.model,
    openAIApiKey: apiKey,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4000,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: headers,
    },
  });
}

// Model presets for each agent
// Uses openrouter/free — OpenRouter's smart router that selects from all available free models.
// Each retry may hit a different model, providing natural fallback behavior.
export const MODEL_PRESETS = {
  analyzer: {
    model: 'openrouter/free',
    temperature: 0.3, // Lower for technical analysis
    maxTokens: 6000,
  },
  scorer: {
    model: 'openrouter/free',
    temperature: 0.2, // Very low for consistent scoring
    maxTokens: 2000,
  },
  reporter: {
    model: 'openrouter/free',
    temperature: 0.7, // Higher for creative writing
    maxTokens: 4000,
  },
} as const;

// Environment variable overrides
export function getModelConfig(agentName: keyof typeof MODEL_PRESETS): LLMConfig {
  const preset = MODEL_PRESETS[agentName];
  const envModel = process.env[`LLM_MODEL_${agentName.toUpperCase()}`];

  return {
    model: envModel || preset.model,
    temperature: preset.temperature,
    maxTokens: preset.maxTokens,
  };
}

// Check if error should trigger a retry (rate limit, service unavailable, etc.)
export function shouldRetry(error: unknown): boolean {
  if (!error) return false;

  const RETRY_ERROR_CODES = [429, 503, 502, 504, 500];
  const RETRY_ERROR_MESSAGES = [
    'rate limit',
    'rate_limit',
    'too many requests',
    'timeout',
    'timed out',
    'service unavailable',
    'model is overloaded',
    'capacity',
  ];

  const errorObj = error as Record<string, unknown>;

  // Check HTTP status code
  if (typeof errorObj.status === 'number' && RETRY_ERROR_CODES.includes(errorObj.status)) {
    return true;
  }

  // Check error message
  const message = (errorObj.message || errorObj.error || String(error)).toString().toLowerCase();
  return RETRY_ERROR_MESSAGES.some(pattern => message.includes(pattern));
}

// Validate that required API keys are set
export function validateApiKeys() {
  if (!process.env.OPEN_ROUTER_KEY) {
    throw new Error('[LLM] OPEN_ROUTER_KEY is required. Set it in your .env file.');
  }
}
