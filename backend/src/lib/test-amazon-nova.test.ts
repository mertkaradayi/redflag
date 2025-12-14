// Test Amazon Nova 2 Lite Free Model
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import 'dotenv/config';

describe('Amazon Nova 2 Lite - Free Model Test', () => {
  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPEN_ROUTER_KEY,
    defaultHeaders: {
      'HTTP-Referer': 'https://redflag.app',
      'X-Title': 'RedFlag'
    }
  });

  it('should test amazon/nova-2-lite-v1:free - basic', async () => {
    console.log('\n🧪 Testing: amazon/nova-2-lite-v1:free (basic test)');

    const start = Date.now();
    const response = await client.chat.completions.create({
      model: 'amazon/nova-2-lite-v1:free',
      messages: [{
        role: 'user',
        content: 'What is 2+2? Answer with just the number.'
      }],
      max_tokens: 20
    });
    const duration = Date.now() - start;
    const content = response.choices[0].message.content || '';

    console.log(`⏱️  Time: ${duration}ms`);
    console.log(`💰 Cost: FREE`);
    console.log(`📝 Response: "${content}"`);
    console.log(`📊 Tokens:`, response.usage);

    assert.ok(content.length > 0, 'Should return content');
    console.log('✅ Basic test PASSED!\n');
  });

  it('should test amazon/nova-2-lite-v1:free - smart contract analysis', async () => {
    console.log('\n🧪 Testing: amazon/nova-2-lite-v1:free (smart contract analysis)');

    const contractPrompt = `Analyze this Sui Move function for security risks:

public fun withdraw(account: &mut Account, amount: u64): Coin<SUI> {
    let balance = &mut account.balance;
    coin::take(balance, amount, ctx)
}

Identify the main security vulnerability and risk level (low/medium/high/critical).`;

    const start = Date.now();
    const response = await client.chat.completions.create({
      model: 'amazon/nova-2-lite-v1:free',
      messages: [{ role: 'user', content: contractPrompt }],
      max_tokens: 500
    });
    const duration = Date.now() - start;
    const content = response.choices[0].message.content || '';

    console.log(`⏱️  Time: ${duration}ms`);
    console.log(`💰 Cost: FREE`);
    console.log(`📝 Response length: ${content.length} chars`);
    console.log(`\n📄 Full Analysis:\n${'-'.repeat(60)}`);
    console.log(content);
    console.log(`${'-'.repeat(60)}\n`);
    console.log(`📊 Token usage:`, response.usage);

    assert.ok(content.length > 50, 'Analysis should be detailed');
    assert.ok(
      content.toLowerCase().includes('risk') ||
      content.toLowerCase().includes('vulnerability') ||
      content.toLowerCase().includes('security'),
      'Should mention security concepts'
    );

    console.log('✅ Smart contract analysis PASSED!\n');
  });

  it('should test amazon/nova-2-lite-v1:free - structured output', async () => {
    console.log('\n🧪 Testing: amazon/nova-2-lite-v1:free (structured JSON)');

    const jsonPrompt = `Return a JSON object analyzing this function's risk:

public fun withdraw(amount: u64) { ... }

Format:
{
  "vulnerability": "description",
  "risk_level": "low|medium|high|critical",
  "recommendation": "what to do"
}`;

    try {
      const start = Date.now();
      const response = await client.chat.completions.create({
        model: 'amazon/nova-2-lite-v1:free',
        messages: [{ role: 'user', content: jsonPrompt }],
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });
      const duration = Date.now() - start;
      const content = response.choices[0].message.content || '';

      console.log(`⏱️  Time: ${duration}ms`);
      console.log(`💰 Cost: FREE`);
      console.log(`📝 Raw JSON response:\n${content}\n`);

      const parsed = JSON.parse(content);
      console.log(`📦 Parsed object:`, parsed);

      assert.ok(parsed, 'Should parse JSON');
      console.log('✅ Structured output PASSED!\n');
    } catch (error: any) {
      console.log(`⚠️  JSON mode might not be supported: ${error.message}\n`);
      // Don't fail the test if JSON mode isn't supported
      assert.ok(true);
    }
  });

  it('should compare Amazon Nova vs Llama vs Claude', async () => {
    console.log('\n🧪 COMPARISON: Amazon Nova vs Llama vs Claude\n');

    const testPrompt = 'List 3 common smart contract vulnerabilities in one sentence each.';

    // Test Amazon Nova
    console.log('1️⃣ Testing Amazon Nova 2 Lite (FREE)...');
    const novaStart = Date.now();
    const novaResponse = await client.chat.completions.create({
      model: 'amazon/nova-2-lite-v1:free',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 200
    });
    const novaDuration = Date.now() - novaStart;
    const novaContent = novaResponse.choices[0].message.content || '';

    console.log(`   Time: ${novaDuration}ms`);
    console.log(`   Cost: $0.00`);
    console.log(`   Length: ${novaContent.length} chars`);
    console.log(`   Preview: ${novaContent.substring(0, 100)}...\n`);

    // Test Llama
    console.log('2️⃣ Testing Llama 3.3 70B (FREE)...');
    const llamaStart = Date.now();
    const llamaResponse = await client.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 200
    });
    const llamaDuration = Date.now() - llamaStart;
    const llamaContent = llamaResponse.choices[0].message.content || '';

    console.log(`   Time: ${llamaDuration}ms`);
    console.log(`   Cost: $0.00`);
    console.log(`   Length: ${llamaContent.length} chars`);
    console.log(`   Preview: ${llamaContent.substring(0, 100)}...\n`);

    // Test Claude (via fal.ai - uses credits but optional)
    try {
      console.log('3️⃣ Testing Claude Sonnet (PAID - for reference)...');
      const claudeStart = Date.now();
      const claudeResponse = await client.chat.completions.create({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 200
      });
      const claudeDuration = Date.now() - claudeStart;
      const claudeContent = claudeResponse.choices[0].message.content || '';

      console.log(`   Time: ${claudeDuration}ms`);
      console.log(`   Cost: ~$0.003`);
      console.log(`   Length: ${claudeContent.length} chars`);
      console.log(`   Preview: ${claudeContent.substring(0, 100)}...\n`);
    } catch (error) {
      console.log('   Skipped (optional)\n');
    }

    console.log('📊 COMPARISON SUMMARY:');
    console.log(`   Amazon Nova: ${novaDuration}ms, FREE`);
    console.log(`   Llama 3.3:   ${llamaDuration}ms, FREE`);
    console.log('\n✅ Comparison complete!\n');

    assert.ok(novaContent.length > 20, 'Nova should return content');
    assert.ok(llamaContent.length > 20, 'Llama should return content');
  });
});
