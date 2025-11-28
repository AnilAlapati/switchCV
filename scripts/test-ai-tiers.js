#!/usr/bin/env node
/**
 * Test script for AI Provider Tiered System
 * Run with: node scripts/test-ai-tiers.js
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

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

async function testGemini(model) {
  const url = 'https://generativelanguage.googleapis.com/v1/models/' + model + ':generateContent?key=' + process.env.GEMINI_API_KEY;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say hello in 5 words' }] }],
      generationConfig: { maxOutputTokens: 50 },
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'Gemini error');
  return data.candidates[0].content.parts[0].text;
}

async function runAllTests() {
  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│ BASIC TIER (Cheapest models - for free users)                │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  await testProvider('Groq Llama 3.1 8B ($0.05/1M) [PRIMARY]', () => testGroq('llama-3.1-8b-instant'));
  await testProvider('Groq Gemma 2 9B ($0.10/1M)', () => testGroq('gemma2-9b-it'));
  await testProvider('Gemini 2.0 Flash ($0.10/1M)', () => testGemini('gemini-2.0-flash'));
  
  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│ PREMIUM TIER (Better models - for paying users)              │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  await testProvider('Gemini 2.5 Flash ($0.15/1M) [PRIMARY]', () => testGemini('gemini-2.5-flash-preview-05-20'));
  await testProvider('GPT-4o-mini ($0.60/1M)', () => testOpenAI('gpt-4o-mini'));
  await testProvider('Groq Llama 3.3 70B ($0.59/1M)', () => testGroq('llama-3.3-70b-versatile'));
  
  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│ ENTERPRISE TIER (Best models - for enterprise users)         │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  await testProvider('GPT-4o ($10/1M) [PRIMARY]', () => testOpenAI('gpt-4o'));
  await testProvider('Gemini 2.5 Pro ($2.50/1M)', () => testGemini('gemini-2.5-pro-preview-05-06'));
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST COMPLETE                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

runAllTests().catch(console.error);
