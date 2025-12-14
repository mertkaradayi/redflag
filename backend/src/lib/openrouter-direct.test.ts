// OpenRouter Direct - Test free models without fal.ai
// Testing direct OpenRouter access for free models

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import 'dotenv/config';

describe('OpenRouter Direct - Free Models', () => {

  it('should have OPEN_ROUTER_KEY configured', () => {
    assert.ok(process.env.OPEN_ROUTER_KEY, 'OPEN_ROUTER_KEY must be set in .env file');
  });

  it('should create OpenAI client with direct OpenRouter endpoint', () => {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPEN_ROUTER_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    assert.ok(client, 'OpenAI client should be created');
    assert.strictEqual(client.baseURL, 'https://openrouter.ai/api/v1');
  });

  it('should test free model: tngtech/deepseek-r1t2-chimera:free', async () => {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPEN_ROUTER_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    const testPrompt = 'What is 2+2? Answer with just the number.';

    console.log('🧪 Testing free model: tngtech/deepseek-r1t2-chimera:free...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: 'tngtech/deepseek-r1t2-chimera:free',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 50
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0].message.content || '';

    console.log(`✅ Response received in ${duration}ms`);
    console.log(`📝 Response: ${content}`);
    console.log(`💰 Cost: $${response.usage ? 'FREE' : 'N/A'}`);

    // Assertions
    assert.ok(response, 'Should get response');
    assert.ok(response.choices, 'Should have choices');
    assert.ok(content, 'Should have content');

    console.log('✅ Free model test passed!');
  });

  it('should analyze smart contract with free model', async () => {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPEN_ROUTER_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    const contractPrompt = `Analyze this Sui Move function for security risks:

public fun withdraw(account: &mut Account, amount: u64): Coin<SUI> {
    let balance = &mut account.balance;
    coin::take(balance, amount, ctx)
}

Identify potential vulnerabilities and risk level (low/medium/high/critical).`;

    console.log('🧪 Testing smart contract analysis with free model...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: 'tngtech/deepseek-r1t2-chimera:free',
      messages: [{ role: 'user', content: contractPrompt }],
      max_tokens: 500
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0].message.content || '';

    console.log(`✅ Analysis completed in ${duration}ms`);
    console.log(`📝 Analysis:\n${content}`);
    console.log(`\n📊 Token usage:`, response.usage);

    // Assertions
    assert.ok(content.length > 50, 'Analysis should be detailed');
    assert.ok(
      content.toLowerCase().includes('risk') ||
      content.toLowerCase().includes('vulnerability') ||
      content.toLowerCase().includes('security'),
      'Analysis should mention security concepts'
    );

    console.log('✅ Smart contract analysis test passed!');
  });

  it('should test another free model: meta-llama/llama-3.3-70b-instruct:free', async () => {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPEN_ROUTER_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    const testPrompt = 'Explain what a rug pull is in cryptocurrency in one sentence.';

    console.log('🧪 Testing free model: meta-llama/llama-3.3-70b-instruct:free...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 100
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0].message.content || '';

    console.log(`✅ Response received in ${duration}ms`);
    console.log(`📝 Response: ${content}`);

    // Assertions
    assert.ok(content, 'Should get response');
    assert.ok(content.length > 10, 'Response should be meaningful');

    console.log('✅ Llama free model test passed!');
  });

  it('should compare response quality: free vs paid models', async () => {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPEN_ROUTER_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    const testPrompt = 'List 3 common smart contract vulnerabilities.';

    console.log('🧪 Comparing free model vs Claude Sonnet...\n');

    // Test free model
    console.log('Testing FREE model (deepseek)...');
    const freeStart = Date.now();
    const freeResponse = await client.chat.completions.create({
      model: 'tngtech/deepseek-r1t2-chimera:free',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 200
    });
    const freeDuration = Date.now() - freeStart;
    const freeContent = freeResponse.choices[0].message.content || '';

    console.log(`\n📊 FREE MODEL (deepseek):`);
    console.log(`   Time: ${freeDuration}ms`);
    console.log(`   Cost: $0.00 (FREE)`);
    console.log(`   Response:\n   ${freeContent.substring(0, 200)}...\n`);

    // Test paid model (Claude)
    console.log('Testing PAID model (Claude Sonnet)...');
    const paidStart = Date.now();
    const paidResponse = await client.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 200
    });
    const paidDuration = Date.now() - paidStart;
    const paidContent = paidResponse.choices[0].message.content || '';

    console.log(`\n📊 PAID MODEL (Claude):`);
    console.log(`   Time: ${paidDuration}ms`);
    console.log(`   Cost: ~$0.003-0.005`);
    console.log(`   Response:\n   ${paidContent.substring(0, 200)}...\n`);

    // Assertions
    assert.ok(freeContent, 'Free model should respond');
    assert.ok(paidContent, 'Paid model should respond');

    console.log('✅ Comparison complete! Review outputs above to compare quality.');
  });
});
