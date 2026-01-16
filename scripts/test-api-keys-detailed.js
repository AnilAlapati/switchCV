/**
 * Detailed API Key Validation Test
 */

require('dotenv').config({ path: '.env.local' });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing Gemini API Key:', apiKey?.substring(0, 20) + '...');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say hello' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    }
  );
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
  console.log('');
}

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('Testing OpenAI API Key:', apiKey?.substring(0, 20) + '...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    })
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
  console.log('');
}

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  console.log('Testing Groq API Key:', apiKey?.substring(0, 20) + '...');
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    })
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
  console.log('');
}

async function main() {
  await testGemini();
  await testOpenAI();
  await testGroq();
}

main().catch(console.error);
