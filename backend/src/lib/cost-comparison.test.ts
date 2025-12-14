// Cost Comparison Test - Compare different models across all agents
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { createLLM } from './langchain-llm';
import type { LLMConfig } from './langchain-llm';
import riskPatterns from './risk-patterns';
import fs from 'fs';
import path from 'path';

// Simple test contract for consistent testing
const TEST_CONTRACT = {
  publicFunctions: [
    {
      module: 'test_contract',
      name: 'withdraw',
      params: [
        { kind: 'reference', type: 'struct', value: '0x2::coin::Coin', mutable: true },
        { kind: 'primitive', type: 'u64' }
      ]
    },
    {
      module: 'test_contract',
      name: 'transfer',
      params: [
        { kind: 'reference', type: 'address', mutable: false },
        { kind: 'primitive', type: 'u64' }
      ]
    }
  ],
  structDefinitions: {
    '0x2::coin::Coin': [
      { name: 'balance', type: 'u64' }
    ]
  },
  disassembledCode: {
    test_contract: {
      withdraw: 'public fun withdraw(coin: &mut Coin<SUI>, amount: u64) { coin::take(&mut coin.balance, amount) }',
      transfer: 'public fun transfer(recipient: address, amount: u64) { /* transfer logic */ }'
    }
  },
  riskPatterns
};

interface CostResult {
  model: string;
  agentName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  duration: number;
  responseLength: number;
}

const costResults: CostResult[] = [];

// Known pricing (per 1M tokens)
const MODEL_PRICING: { [key: string]: { input: number; output: number } } = {
  'meta-llama/llama-3.3-70b-instruct:free': { input: 0.00, output: 0.00 }, // Free tier
  'meta-llama/llama-3.3-70b-instruct': { input: 0.10, output: 0.32 },
  'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
};

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 0, output: 0 };
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

async function testSingleAgent(
  agentName: string,
  modelConfig: LLMConfig,
  prompt: string
): Promise<CostResult> {
  console.log(`\n🧪 Testing ${agentName} with ${modelConfig.model}...`);

  const llm = createLLM(modelConfig);
  const startTime = Date.now();

  const response = await llm.invoke(prompt);

  const duration = Date.now() - startTime;
  const content = response.content as string;

  // Extract usage from response metadata if available
  const usage = (response as any).response_metadata?.usage || {};
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || 0;

  const estimatedCost = calculateCost(modelConfig.model, promptTokens, completionTokens);

  console.log(`   ⏱️  Duration: ${duration}ms`);
  console.log(`   📊 Tokens: ${totalTokens} (${promptTokens} in, ${completionTokens} out)`);
  console.log(`   💰 Cost: $${estimatedCost.toFixed(6)}`);
  console.log(`   📝 Response: ${content.substring(0, 100)}...`);

  return {
    model: modelConfig.model,
    agentName,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCost,
    duration,
    responseLength: content.length
  };
}

describe('Cost Comparison Tests', () => {

  it('should test meta-llama/llama-3.3-70b-instruct on all agents', async () => {
    console.log('\n' + '='.repeat(70));
    console.log('📊 TESTING: meta-llama/llama-3.3-70b-instruct (All Agents)');
    console.log('='.repeat(70));

    const modelConfig: LLMConfig = {
      model: 'meta-llama/llama-3.3-70b-instruct',
      temperature: 0.5
    };

    // Test Agent 1 (Analyzer)
    const analyzerPrompt = `You are a security auditor. Analyze this function for risks:

public fun withdraw(coin: &mut Coin<SUI>, amount: u64) {
  coin::take(&mut coin.balance, amount)
}

Return a brief security assessment (2-3 sentences).`;

    const analyzerResult = await testSingleAgent('Analyzer', modelConfig, analyzerPrompt);
    costResults.push(analyzerResult);

    // Test Agent 2 (Scorer)
    const scorerPrompt = `Rate this security finding on a scale of 0-100:

Finding: Unrestricted withdraw function allows anyone to drain funds.

Return just a number.`;

    const scorerResult = await testSingleAgent('Scorer', modelConfig, scorerPrompt);
    costResults.push(scorerResult);

    // Test Agent 3 (Reporter)
    const reporterPrompt = `Explain this security risk in simple terms (2-3 sentences):

Technical finding: Function lacks access control, permitting arbitrary withdrawals.

Write user-friendly explanation.`;

    const reporterResult = await testSingleAgent('Reporter', modelConfig, reporterPrompt);
    costResults.push(reporterResult);

    const totalCost = analyzerResult.estimatedCost + scorerResult.estimatedCost + reporterResult.estimatedCost;
    const totalDuration = analyzerResult.duration + scorerResult.duration + reporterResult.duration;

    console.log('\n📈 SUMMARY FOR meta-llama/llama-3.3-70b-instruct:');
    console.log(`   Total Cost: $${totalCost.toFixed(6)}`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log(`   Avg Cost per Agent: $${(totalCost / 3).toFixed(6)}`);

    assert.ok(true);
  });

  it('should test meta-llama/llama-3.3-70b-instruct:free on all agents', async () => {
    console.log('\n' + '='.repeat(70));
    console.log('📊 TESTING: meta-llama/llama-3.3-70b-instruct:free (All Agents)');
    console.log('='.repeat(70));

    const modelConfig: LLMConfig = {
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      temperature: 0.5
    };

    // Test Agent 1 (Analyzer)
    const analyzerPrompt = `You are a security auditor. Analyze this function for risks:

public fun withdraw(coin: &mut Coin<SUI>, amount: u64) {
  coin::take(&mut coin.balance, amount)
}

Return a brief security assessment (2-3 sentences).`;

    const analyzerResult = await testSingleAgent('Analyzer', modelConfig, analyzerPrompt);
    costResults.push(analyzerResult);

    // Test Agent 2 (Scorer)
    const scorerPrompt = `Rate this security finding on a scale of 0-100:

Finding: Unrestricted withdraw function allows anyone to drain funds.

Return just a number.`;

    const scorerResult = await testSingleAgent('Scorer', modelConfig, scorerPrompt);
    costResults.push(scorerResult);

    // Test Agent 3 (Reporter)
    const reporterPrompt = `Explain this security risk in simple terms (2-3 sentences):

Technical finding: Function lacks access control, permitting arbitrary withdrawals.

Write user-friendly explanation.`;

    const reporterResult = await testSingleAgent('Reporter', modelConfig, reporterPrompt);
    costResults.push(reporterResult);

    const totalCost = analyzerResult.estimatedCost + scorerResult.estimatedCost + reporterResult.estimatedCost;
    const totalDuration = analyzerResult.duration + scorerResult.duration + reporterResult.duration;

    console.log('\n📈 SUMMARY FOR meta-llama/llama-3.3-70b-instruct:free:');
    console.log(`   Total Cost: $${totalCost.toFixed(6)}`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log(`   Avg Cost per Agent: $${(totalCost / 3).toFixed(6)}`);

    assert.ok(true);
  });

  it('should compare all tested models and save results', () => {
    console.log('\n' + '='.repeat(70));
    console.log('📊 COST COMPARISON RESULTS');
    console.log('='.repeat(70));

    // Group results by model
    const modelGroups: { [key: string]: CostResult[] } = {};
    for (const result of costResults) {
      if (!modelGroups[result.model]) {
        modelGroups[result.model] = [];
      }
      modelGroups[result.model].push(result);
    }

    // Print comparison table
    console.log('\n📋 Per-Model Summary:\n');

    const summaries: any[] = [];

    for (const [model, results] of Object.entries(modelGroups)) {
      const totalCost = results.reduce((sum, r) => sum + r.estimatedCost, 0);
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const totalTokens = results.reduce((sum, r) => sum + r.totalTokens, 0);
      const avgCostPerAgent = totalCost / results.length;

      const summary = {
        model,
        totalCost,
        totalDuration,
        totalTokens,
        avgCostPerAgent,
        agentCount: results.length
      };

      summaries.push(summary);

      console.log(`🔹 ${model}:`);
      console.log(`   Cost per Analysis: $${totalCost.toFixed(6)}`);
      console.log(`   Total Duration: ${totalDuration}ms`);
      console.log(`   Total Tokens: ${totalTokens}`);
      console.log(`   Avg Cost/Agent: $${avgCostPerAgent.toFixed(6)}`);
      console.log('');
    }

    // Sort by cost
    summaries.sort((a, b) => a.totalCost - b.totalCost);

    console.log('💰 RANKING (Cheapest to Most Expensive):\n');
    summaries.forEach((s, i) => {
      console.log(`${i + 1}. ${s.model.padEnd(40)} $${s.totalCost.toFixed(6)}`);
    });

    console.log('\n⚡ RANKING (Fastest to Slowest):\n');
    const speedSorted = [...summaries].sort((a, b) => a.totalDuration - b.totalDuration);
    speedSorted.forEach((s, i) => {
      console.log(`${i + 1}. ${s.model.padEnd(40)} ${s.totalDuration}ms`);
    });

    // Save results to file
    const resultsDir = path.join(__dirname, '../../cost-analysis');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(resultsDir, `cost-comparison-${timestamp}.json`);

    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summaries,
      detailedResults: costResults
    }, null, 2));

    console.log(`\n💾 Results saved to: ${resultsFile}\n`);
    console.log('='.repeat(70) + '\n');

    assert.ok(costResults.length > 0, 'Should have cost results');
  });
});
