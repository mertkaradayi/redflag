// OpenRouter via fal.ai - Basic Connection Tests
// Phase 1: Verify fal.ai OpenRouter endpoint is accessible and working

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import 'dotenv/config';

describe('OpenRouter via fal.ai - Basic Connection', () => {

  it('should have FAL_API_KEY configured', () => {
    assert.ok(process.env.FAL_API_KEY, 'FAL_API_KEY must be set in .env file');
    // fal.ai keys format: UUID:secret (e.g., "90d7571d-2570-4350-9af7-170607b5e9f3:fc4d517154bf2d76336038b5e5fc78a8")
    assert.match(process.env.FAL_API_KEY, /^[a-f0-9-]+:[a-f0-9]+$/, 'FAL_API_KEY should be in format UUID:secret');
  });

  it('should create OpenAI client with fal.ai OpenRouter endpoint', () => {
    // Note: fal.ai requires "Key" prefix in Authorization header instead of "Bearer"
    const client = new OpenAI({
      baseURL: 'https://fal.run/openrouter/router/openai/v1',
      apiKey: process.env.FAL_API_KEY,
      defaultHeaders: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,  // fal.ai auth format
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    assert.ok(client, 'OpenAI client should be created');
    assert.strictEqual(client.baseURL, 'https://fal.run/openrouter/router/openai/v1');
  });

  it('should authenticate and make a simple completion request', async () => {
    const client = new OpenAI({
      baseURL: 'https://fal.run/openrouter/router/openai/v1',
      apiKey: process.env.FAL_API_KEY,
      defaultHeaders: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,  // fal.ai auth format
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    const testPrompt = 'Say "Hello from OpenRouter!" and nothing else.';

    //Use GPT-4o-mini for basic testing (reliable and fast)
    console.log('🧪 Testing basic completion with openai/gpt-4o-mini...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 20
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Response received in ${duration}ms`);
    console.log(`📝 Response: ${response.choices[0].message.content}`);

    // Assertions
    assert.ok(response, 'Response should exist');
    assert.ok(response.choices, 'Response should have choices');
    assert.ok(response.choices[0], 'Response should have at least one choice');
    assert.ok(response.choices[0].message, 'Choice should have a message');
    assert.ok(response.choices[0].message.content, 'Message should have content');
    assert.strictEqual(response.choices[0].message.role, 'assistant');

    // Check that we got a response from the model
    const content = response.choices[0].message.content || '';
    assert.ok(content.length > 0, 'Response content should not be empty');

    console.log('✅ All assertions passed!');
  });

  it('should handle structured JSON output', async () => {
    const client = new OpenAI({
      baseURL: 'https://fal.run/openrouter/router/openai/v1',
      apiKey: process.env.FAL_API_KEY,
      defaultHeaders: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,  // fal.ai auth format
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    const testPrompt = `Return a JSON object with the following structure:
    {
      "test": "success",
      "number": 42,
      "message": "This is a test"
    }`;

    console.log('🧪 Testing structured JSON output with openai/gpt-4o-mini...');

    const response = await client.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: testPrompt }],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '';
    console.log(`📝 Raw response: ${content}`);

    // Parse JSON
    const jsonResponse = JSON.parse(content);
    console.log(`📦 Parsed JSON:`, jsonResponse);

    // Assertions
    assert.ok(jsonResponse, 'Should parse JSON response');
    assert.ok(typeof jsonResponse === 'object', 'Response should be an object');

    console.log('✅ Structured output test passed!');
  });

  it('should test with quality model (Claude Sonnet)', async () => {
    const client = new OpenAI({
      baseURL: 'https://fal.run/openrouter/router/openai/v1',
      apiKey: process.env.FAL_API_KEY,
      defaultHeaders: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,  // fal.ai auth format
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://redflag.app',
        'X-Title': 'RedFlag Smart Contract Analyzer'
      }
    });

    const testPrompt = 'What is 2+2? Answer with just the number.';

    console.log('🧪 Testing with anthropic/claude-3.5-sonnet...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 10
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0].message.content || '';

    console.log(`✅ Claude response received in ${duration}ms`);
    console.log(`📝 Response: ${content}`);

    // Assertions
    assert.ok(content, 'Should get response from Claude');
    assert.match(content, /4/, 'Response should contain the correct answer');

    console.log('✅ Claude Sonnet test passed!');
  });
});
