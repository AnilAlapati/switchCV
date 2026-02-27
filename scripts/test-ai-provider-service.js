/**
 * Test AI Provider Service Integration
 * 
 * Verifies that the AI provider service correctly fetches secrets
 * and can generate text using the tiered selection logic.
 */

const { generateTextWithTier } = require('../src/server/services/aiProviderService');
const { logger } = require('../src/lib/logger');

async function testAIService() {
    console.log('🚀 Testing AI Provider Service Integration...');

    try {
        const result = await generateTextWithTier({
            prompt: 'Say "System check passed" if you can read this.',
            maxTokens: 20,
            temperature: 0.7,
            userTier: 'basic'
        });

        console.log('\n✅ Success!');
        console.log(`🤖 Model: ${result.model} (${result.provider})`);
        console.log(`📝 Response: ${result.text}`);
        console.log(`💰 Estimated Cost: $${result.estimatedCost}`);

    } catch (error) {
        console.error('\n❌ Test Failed:');
        console.error(error.message);
        if (error.stack) {
            // console.error(error.stack);
        }
        process.exit(1);
    }
}

testAIService();
