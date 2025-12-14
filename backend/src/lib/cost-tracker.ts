// Cost Tracking Utility - Extract real cost data from OpenRouter responses
import type { BaseMessage } from "@langchain/core/messages";

export interface CostData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
}

// OpenRouter pricing per 1M tokens
export const MODEL_PRICING: { [key: string]: { input: number; output: number } } = {
  // Primary model - gpt-oss-120b via DeepInfra (ultra cheap + reliable)
  'openai/gpt-oss-120b': { input: 0.039, output: 0.19 },

  // Backup models
  'meta-llama/llama-3.3-70b-instruct': { input: 0.10, output: 0.32 },
  'meta-llama/llama-3.3-70b-instruct:free': { input: 0.00, output: 0.00 },

  // Premium models (Claude)
  'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'anthropic/claude-sonnet-4.5': { input: 3.00, output: 15.00 },

  // Mid-tier models (GPT)
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'openai/gpt-4o': { input: 2.50, output: 10.00 },

  // Other models
  'google/gemini-2.0-flash-exp:free': { input: 0.00, output: 0.00 },
};

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] || { input: 0, output: 0 };

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

export function extractCostFromResponse(response: BaseMessage, model: string): CostData {
  // Try to extract from multiple possible locations
  let promptTokens = 0;
  let completionTokens = 0;

  // Method 1: response_metadata.usage (standard OpenAI format)
  const metadata = (response as any).response_metadata;
  if (metadata?.usage) {
    promptTokens = metadata.usage.prompt_tokens || 0;
    completionTokens = metadata.usage.completion_tokens || 0;
  }

  // Method 2: additional_kwargs (sometimes used by LangChain)
  const additionalKwargs = (response as any).additional_kwargs;
  if (additionalKwargs?.usage) {
    promptTokens = additionalKwargs.usage.prompt_tokens || 0;
    completionTokens = additionalKwargs.usage.completion_tokens || 0;
  }

  // Method 3: OpenRouter-specific fields
  if (metadata?.openrouter) {
    promptTokens = metadata.openrouter.prompt_tokens || 0;
    completionTokens = metadata.openrouter.completion_tokens || 0;
  }

  // Method 4: Direct usage field (raw response)
  if ((response as any).usage) {
    const usage = (response as any).usage;
    promptTokens = usage.prompt_tokens || 0;
    completionTokens = usage.completion_tokens || 0;
  }

  const totalTokens = promptTokens + completionTokens;
  const estimatedCost = calculateCost(model, promptTokens, completionTokens);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCost,
    model
  };
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00 (FREE)';
  if (cost < 0.000001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

export function printCostBreakdown(costData: CostData): void {
  const pricing = MODEL_PRICING[costData.model];

  console.log('\n💰 Cost Breakdown:');
  console.log(`   Model: ${costData.model}`);
  console.log(`   Input:  ${costData.promptTokens.toLocaleString()} tokens × $${pricing?.input || 0}/1M = ${formatCost((costData.promptTokens / 1_000_000) * (pricing?.input || 0))}`);
  console.log(`   Output: ${costData.completionTokens.toLocaleString()} tokens × $${pricing?.output || 0}/1M = ${formatCost((costData.completionTokens / 1_000_000) * (pricing?.output || 0))}`);
  console.log(`   Total:  ${formatCost(costData.estimatedCost)}`);
}

// Example usage tracking
class CostTracker {
  private costs: CostData[] = [];

  addCost(costData: CostData): void {
    this.costs.push(costData);
  }

  getTotalCost(): number {
    return this.costs.reduce((sum, c) => sum + c.estimatedCost, 0);
  }

  getTotalTokens(): number {
    return this.costs.reduce((sum, c) => sum + c.totalTokens, 0);
  }

  getSummary(): string {
    const total = this.getTotalCost();
    const tokens = this.getTotalTokens();

    return `Total Cost: ${formatCost(total)} | Total Tokens: ${tokens.toLocaleString()}`;
  }

  printSummary(): void {
    console.log('\n📊 Cost Summary:');
    console.log(`   API Calls: ${this.costs.length}`);
    console.log(`   Total Tokens: ${this.getTotalTokens().toLocaleString()}`);
    console.log(`   Total Cost: ${formatCost(this.getTotalCost())}`);
    console.log(`   Avg Cost/Call: ${formatCost(this.getTotalCost() / this.costs.length)}`);

    // Group by model
    const byModel: { [key: string]: CostData[] } = {};
    for (const cost of this.costs) {
      if (!byModel[cost.model]) byModel[cost.model] = [];
      byModel[cost.model].push(cost);
    }

    console.log('\n   By Model:');
    for (const [model, costs] of Object.entries(byModel)) {
      const modelTotal = costs.reduce((sum, c) => sum + c.estimatedCost, 0);
      console.log(`   - ${model}: ${formatCost(modelTotal)} (${costs.length} calls)`);
    }
  }
}

export const globalCostTracker = new CostTracker();
