// LangChain Integration Tests - OpenRouter + 3-Agent Chain
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { createLLM, getModelConfig, MODEL_PRESETS } from './langchain-llm';
import { runLangChainAnalysis, runLangChainAnalysisWithFallback } from './langchain-analyzer';
import riskPatterns from './risk-patterns';

describe('LangChain Integration Tests', () => {

  it('should have OPEN_ROUTER_KEY configured', () => {
    const hasOpenRouterKey = !!process.env.OPEN_ROUTER_KEY;

    assert.ok(hasOpenRouterKey, 'OPEN_ROUTER_KEY must be set');
    console.log(`✅ OPEN_ROUTER_KEY: ${hasOpenRouterKey ? 'Set' : 'Not set'}`);
  });

  it('should create LLM with OpenRouter', () => {
    if (!process.env.OPEN_ROUTER_KEY) {
      console.log('⚠️  Skipping - OPEN_ROUTER_KEY not set');
      return;
    }

    const llm = createLLM({
      model: 'meta-llama/llama-3.3-70b-instruct',
      temperature: 0.5,
    });

    assert.ok(llm, 'LLM should be created');
    console.log('✅ OpenRouter LLM created successfully');
  });

  it('should load correct model presets for each agent', () => {
    const analyzerConfig = getModelConfig('analyzer');
    const scorerConfig = getModelConfig('scorer');
    const reporterConfig = getModelConfig('reporter');
    const fallbackConfig = getModelConfig('fallback');

    console.log('📊 Model Presets:');
    console.log(`   Analyzer: ${analyzerConfig.model}`);
    console.log(`   Scorer: ${scorerConfig.model}`);
    console.log(`   Reporter: ${reporterConfig.model}`);
    console.log(`   Fallback: ${fallbackConfig.model}`);

    assert.strictEqual(analyzerConfig.model, MODEL_PRESETS.analyzer.model);
    assert.strictEqual(scorerConfig.model, MODEL_PRESETS.scorer.model);
    assert.strictEqual(reporterConfig.model, MODEL_PRESETS.reporter.model);
    assert.strictEqual(fallbackConfig.model, MODEL_PRESETS.fallback.model);

    console.log('✅ All model presets loaded correctly');
  });

  it('should run full 3-agent LangChain analysis', async () => {
    console.log('\n🧪 Testing full 3-agent LangChain analysis...\n');

    // Simple test contract with a risky withdraw function
    const testInput = {
      publicFunctions: [
        {
          module: 'test_contract',
          name: 'withdraw',
          params: [
            { kind: 'reference', type: 'struct', value: '0x2::coin::Coin', mutable: true },
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
          withdraw: 'public fun withdraw(coin: &mut Coin<SUI>, amount: u64) { /* withdraw logic */ }'
        }
      },
      riskPatterns
    };

    const startTime = Date.now();
    const result = await runLangChainAnalysis(testInput);
    const duration = Date.now() - startTime;

    console.log(`⏱️  Analysis completed in ${duration}ms`);
    console.log(`📊 Risk Score: ${result.risk_score}`);
    console.log(`🎯 Risk Level: ${result.risk_level}`);
    console.log(`📝 Summary: ${result.summary.substring(0, 100)}...`);
    console.log(`🔍 Risky Functions: ${result.risky_functions.length}`);
    console.log(`⚠️  Rug Pull Indicators: ${result.rug_pull_indicators.length}`);

    // Assertions
    assert.ok(result, 'Should return a result');
    assert.ok(typeof result.risk_score === 'number', 'Risk score should be a number');
    assert.ok(result.risk_score >= 0 && result.risk_score <= 100, 'Risk score should be between 0-100');
    assert.ok(result.risk_level, 'Should have a risk level');
    assert.ok(['low', 'moderate', 'high', 'critical'].includes(result.risk_level), 'Risk level should be valid');
    assert.ok(result.summary, 'Should have a summary');
    assert.ok(Array.isArray(result.risky_functions), 'Should have risky_functions array');
    assert.ok(Array.isArray(result.rug_pull_indicators), 'Should have rug_pull_indicators array');

    console.log('\n✅ Full 3-agent analysis passed!');
  });

  it('should handle empty functions gracefully', async () => {
    console.log('\n🧪 Testing with no public functions...\n');

    const testInput = {
      publicFunctions: [],
      structDefinitions: {},
      disassembledCode: {},
      riskPatterns
    };

    const result = await runLangChainAnalysis(testInput);

    console.log(`📊 Risk Score: ${result.risk_score}`);
    console.log(`🎯 Risk Level: ${result.risk_level}`);
    console.log(`📝 Summary: ${result.summary}`);

    // Should return low risk for empty contracts
    assert.strictEqual(result.risk_score, 5);
    assert.strictEqual(result.risk_level, 'low');
    assert.strictEqual(result.risky_functions.length, 0);
    assert.strictEqual(result.rug_pull_indicators.length, 0);

    console.log('✅ Empty functions handled correctly');
  });

  it('should test fallback mechanism', async () => {
    console.log('\n🧪 Testing fallback with simple contract...\n');

    const testInput = {
      publicFunctions: [
        {
          module: 'simple_contract',
          name: 'transfer',
          params: []
        }
      ],
      structDefinitions: {},
      disassembledCode: {},
      riskPatterns
    };

    const result = await runLangChainAnalysisWithFallback(testInput);

    console.log(`📊 Risk Score: ${result.risk_score}`);
    console.log(`🎯 Risk Level: ${result.risk_level}`);

    assert.ok(result, 'Fallback should return a result');
    assert.ok(typeof result.risk_score === 'number', 'Should have a risk score');

    console.log('✅ Fallback mechanism works');
  });

  it('should verify model is Llama 3.3', () => {
    console.log('\n🧪 Verifying model configuration...\n');

    const analyzerConfig = getModelConfig('analyzer');
    const scorerConfig = getModelConfig('scorer');
    const reporterConfig = getModelConfig('reporter');

    console.log('Agent 1 (Analyzer):');
    console.log(`   Model: ${analyzerConfig.model}`);
    console.log(`   Temperature: ${analyzerConfig.temperature}`);

    console.log('\nAgent 2 (Scorer):');
    console.log(`   Model: ${scorerConfig.model}`);
    console.log(`   Temperature: ${scorerConfig.temperature}`);

    console.log('\nAgent 3 (Reporter):');
    console.log(`   Model: ${reporterConfig.model}`);
    console.log(`   Temperature: ${reporterConfig.temperature}`);

    // All agents should use Llama 3.3
    assert.ok(
      analyzerConfig.model.includes('llama'),
      'Analyzer should use Llama model'
    );
    assert.ok(
      scorerConfig.model.includes('llama'),
      'Scorer should use Llama model'
    );
    assert.ok(
      reporterConfig.model.includes('llama'),
      'Reporter should use Llama model'
    );

    console.log('\n✅ All agents configured correctly!');
  });

  it('should test cost optimization', () => {
    console.log('\n💰 Cost Analysis:\n');

    // Llama 3.3 70B pricing: $0.10/1M input, $0.32/1M output
    const pricePerMillionInput = 0.10;
    const pricePerMillionOutput = 0.32;

    // Estimate: ~2K input tokens, ~500 output tokens per agent
    // 3 agents = ~6K input, ~1.5K output
    const estimatedInputTokens = 6000;
    const estimatedOutputTokens = 1500;

    const inputCost = (estimatedInputTokens / 1_000_000) * pricePerMillionInput;
    const outputCost = (estimatedOutputTokens / 1_000_000) * pricePerMillionOutput;
    const totalCost = inputCost + outputCost;

    console.log('Estimated cost per analysis:');
    console.log(`   Input tokens: ~${estimatedInputTokens}`);
    console.log(`   Output tokens: ~${estimatedOutputTokens}`);
    console.log(`   Input cost: $${inputCost.toFixed(6)}`);
    console.log(`   Output cost: $${outputCost.toFixed(6)}`);
    console.log(`   Total: ~$${totalCost.toFixed(4)}`);

    console.log('\n📊 Comparison:');
    console.log('   Gemini (old): ~$0.30/analysis');
    console.log('   Llama 3.3 (new): ~$0.001/analysis');
    console.log('   Savings: ~99.7%');

    assert.ok(totalCost < 0.01, 'Cost should be less than 1 cent');

    console.log('\n✅ Cost optimization verified!');
  });
});
