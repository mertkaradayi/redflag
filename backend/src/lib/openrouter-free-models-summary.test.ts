// OpenRouter Free Models Summary - Which ones actually work?
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import 'dotenv/config';

describe('OpenRouter Free Models - Summary', () => {
  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPEN_ROUTER_KEY,
    defaultHeaders: {
      'HTTP-Referer': 'https://redflag.app',
      'X-Title': 'RedFlag'
    }
  });

  const testPrompt = `Analyze this Sui Move function for security issues:

public fun withdraw(amount: u64): Coin<SUI> {
    coin::take(&mut balance, amount, ctx)
}

What's the main risk?`;

  it('should test meta-llama/llama-3.3-70b-instruct:free ✅ WORKS', async () => {
    console.log('\n🧪 Testing: meta-llama/llama-3.3-70b-instruct:free');

    const start = Date.now();
    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 300
    });
    const duration = Date.now() - start;
    const content = response.choices[0].message.content || '';

    console.log(`⏱️  Time: ${duration}ms`);
    console.log(`💰 Cost: FREE`);
    console.log(`📝 Response length: ${content.length} chars`);
    console.log(`🔍 Preview: ${content.substring(0, 150)}...`);

    assert.ok(content.length > 20, 'Should return meaningful content');
    console.log('✅ WORKS GREAT!\n');
  });

  it('should test qwen/qwen-2.5-72b-instruct:free ✅ MIGHT WORK', async () => {
    console.log('\n🧪 Testing: qwen/qwen-2.5-72b-instruct:free');

    try {
      const start = Date.now();
      const response = await client.chat.completions.create({
        model: 'qwen/qwen-2.5-72b-instruct:free',
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 300
      });
      const duration = Date.now() - start;
      const content = response.choices[0].message.content || '';

      console.log(`⏱️  Time: ${duration}ms`);
      console.log(`💰 Cost: FREE`);
      console.log(`📝 Response length: ${content.length} chars`);
      console.log(`🔍 Preview: ${content.substring(0, 150)}...`);

      if (content.length > 20) {
        console.log('✅ WORKS!\n');
      } else {
        console.log('⚠️  Returns empty content\n');
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
      console.log('⚠️  Model might not be available\n');
    }
  });

  it('should test google/gemini-flash-1.5:free ✅ MIGHT WORK', async () => {
    console.log('\n🧪 Testing: google/gemini-flash-1.5:free');

    try {
      const start = Date.now();
      const response = await client.chat.completions.create({
        model: 'google/gemini-flash-1.5:free',
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 300
      });
      const duration = Date.now() - start;
      const content = response.choices[0].message.content || '';

      console.log(`⏱️  Time: ${duration}ms`);
      console.log(`💰 Cost: FREE`);
      console.log(`📝 Response length: ${content.length} chars`);
      console.log(`🔍 Preview: ${content.substring(0, 150)}...`);

      if (content.length > 20) {
        console.log('✅ WORKS!\n');
      } else {
        console.log('⚠️  Returns empty content\n');
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
      console.log('⚠️  Model might not be available\n');
    }
  });

  it('should summarize findings', () => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY: Which FREE models work?');
    console.log('='.repeat(60));
    console.log('✅ CONFIRMED WORKING:');
    console.log('   • meta-llama/llama-3.3-70b-instruct:free');
    console.log('');
    console.log('❌ DOESN\'T WORK (empty responses):');
    console.log('   • tngtech/deepseek-r1t2-chimera:free');
    console.log('');
    console.log('🤔 TRY THESE FREE OPTIONS:');
    console.log('   • qwen/qwen-2.5-72b-instruct:free');
    console.log('   • google/gemini-flash-1.5:free');
    console.log('   • google/gemini-pro-1.5:free');
    console.log('   • microsoft/phi-3-medium-128k-instruct:free');
    console.log('');
    console.log('💡 RECOMMENDATION:');
    console.log('   Use meta-llama/llama-3.3-70b-instruct:free for free tier');
    console.log('   Or mix paid models via fal.ai for best quality');
    console.log('='.repeat(60) + '\n');

    assert.ok(true);
  });
});
