/**
 * Test AI Provider API Keys
 * 
 * This script validates API keys for all configured AI providers
 * without exposing the actual key values.
 */

require('dotenv').config({ path: '.env.local' });

const providers = [
  {
    name: 'Gemini (Google)',
    envVar: 'GEMINI_API_KEY',
    test: async (apiKey) => {
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
      return { ok: response.ok, status: response.status, statusText: response.statusText };
    }
  },
  {
    name: 'OpenAI (GPT)',
    envVar: 'OPENAI_API_KEY',
    test: async (apiKey) => {
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
      return { ok: response.ok, status: response.status, statusText: response.statusText };
    }
  },
  {
    name: 'Anthropic (Claude)',
    envVar: 'ANTHROPIC_API_KEY',
    test: async (apiKey) => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say hello' }]
        })
      });
      return { ok: response.ok, status: response.status, statusText: response.statusText };
    }
  }
];

async function testProvider(provider) {
  const apiKey = process.env[provider.envVar];

  if (!apiKey) {
    return {
      provider: provider.name,
      status: '❌ NOT CONFIGURED',
      message: `${provider.envVar} not found in .env.local`
    };
  }

  // Show key is present without exposing it
  const keyPrefix = apiKey.substring(0, 8);
  const keyLength = apiKey.length;
  const maskedKey = `${keyPrefix}...(${keyLength} chars)`;

  try {
    console.log(`Testing ${provider.name}...`);
    const result = await provider.test(apiKey);

    if (result.ok) {
      return {
        provider: provider.name,
        status: '✅ VALID',
        message: `Key works (${maskedKey})`
      };
    } else {
      return {
        provider: provider.name,
        status: '❌ INVALID',
        message: `HTTP ${result.status}: ${result.statusText} (${maskedKey})`
      };
    }
  } catch (error) {
    return {
      provider: provider.name,
      status: '❌ ERROR',
      message: `${error.message} (${maskedKey})`
    };
  }
}

async function main() {
  console.log('🔑 Testing AI Provider API Keys...\n');
  console.log('Reading from: .env.local\n');

  const results = [];

  for (const provider of providers) {
    const result = await testProvider(provider);
    results.push(result);

    // Print result immediately
    console.log(`${result.status} ${result.provider}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const valid = results.filter(r => r.status === '✅ VALID').length;
  const invalid = results.filter(r => r.status === '❌ INVALID').length;
  const notConfigured = results.filter(r => r.status === '❌ NOT CONFIGURED').length;
  const errors = results.filter(r => r.status === '❌ ERROR').length;

  console.log(`✅ Valid:          ${valid}/${providers.length}`);
  console.log(`❌ Invalid:        ${invalid}/${providers.length}`);
  console.log(`⚠️  Not Configured: ${notConfigured}/${providers.length}`);
  console.log(`❌ Errors:         ${errors}/${providers.length}`);

  if (valid === 0) {
    console.log('\n⚠️  WARNING: No valid API keys found!');
    console.log('   Your resume generation will NOT work.');
    console.log('   Please configure at least one provider in .env.local');
  } else if (valid < providers.length) {
    console.log(`\n✓ You have ${valid} working provider(s). Resume generation should work.`);
  } else {
    console.log('\n✓ All providers configured and working!');
  }

  process.exit(valid > 0 ? 0 : 1);
}

main().catch(console.error);
