#!/usr/bin/env node
/**
 * Test script for AI Provider Tiered System
 * Run with: node scripts/test-ai-tiers.js
 */

const fs = require('fs');
const path = require('path');

// Load .env.local (optional)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;

    const key = match[1].trim();
    const value = match[2].trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
} else {
  console.log('ℹ️  .env.local not found; using existing environment variables');
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║           TIERED AI SYSTEM - COMPREHENSIVE TEST              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

console.log('\n=== CONFIGURED PROVIDERS ===');
console.log('Groq:', process.env.GROQ_API_KEY ? '✅' : '❌');
console.log('Gemini:', process.env.GEMINI_API_KEY ? '✅' : '❌');
console.log('OpenAI:', process.env.OPENAI_API_KEY ? '✅' : '❌');

async function testProvider(name, testFn) {
  try {
    const result = await testFn();
    const preview = result.slice(0, 40).replace(/\n/g, ' ');
    console.log('✅ ' + name + ': "' + preview + '"');
    return true;
  } catch (e) {
    console.log('❌ ' + name + ': ' + (e.message || e).slice(0, 50));
    return false;
  }
}

async function testGroq(model) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: 'Say hello in 5 words' }],
      max_tokens: 50,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'Groq error');
  return data.choices[0].message.content;
}

async function testOpenAI(model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: 'Say hello in 5 words' }],
      max_tokens: 50,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'OpenAI error');
  return data.choices[0].message.content;
}

async function testGemini(model, maxOutputTokens = 128) {
  const url = 'https://generativelanguage.googleapis.com/v1/models/' + model + ':generateContent?key=' + process.env.GEMINI_API_KEY;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say hello in 5 words' }] }],
      generationConfig: { maxOutputTokens, temperature: 0.2 },
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    const body = await response.text().catch(() => '');
    throw new Error('Gemini HTTP ' + response.status + ': ' + (body || 'Invalid JSON response'));
  }

  if (!response.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error('Gemini HTTP ' + response.status + ': ' + String(msg));
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Gemini error');
  }

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error('Gemini blocked: ' + blockReason);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new Error('Gemini returned no text' + (finishReason ? ' (finishReason: ' + finishReason + ')' : ''));
  }

  return text;
}

async function runAllTests() {
  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│ BASIC TIER (Cheapest models - for free users)                │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  await testProvider('Groq Llama 3.1 8B ($0.05/1M) [PRIMARY]', () => testGroq('llama-3.1-8b-instant'));
  await testProvider('Gemini 2.0 Flash ($0.10/1M)', () => testGemini('gemini-2.0-flash'));
  
  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│ PREMIUM TIER (Better models - for paying users)              │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  await testProvider('Gemini 2.5 Flash ($0.15/1M) [PRIMARY]', () => testGemini('gemini-2.5-flash'));
  await testProvider('GPT-4o-mini ($0.60/1M)', () => testOpenAI('gpt-4o-mini'));
  await testProvider('Groq Llama 3.3 70B ($0.59/1M)', () => testGroq('llama-3.3-70b-versatile'));
  
  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│ ENTERPRISE TIER (Best models - for enterprise users)         │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  await testProvider('GPT-4o ($10/1M) [PRIMARY]', () => testOpenAI('gpt-4o'));
  // Note: Gemini 2.5 Pro can consume a large internal "thoughts" budget.
  await testProvider('Gemini 2.5 Pro ($2.50/1M)', () => testGemini('gemini-2.5-pro', 1024));
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST COMPLETE                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

runAllTests().catch(console.error);
