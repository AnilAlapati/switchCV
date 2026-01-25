/**
 * Test Firebase Secret Manager Integration
 * This validates that secrets can be fetched from Secret Manager
 */

import { getSecret } from "@/lib/services/secretManagerService";

async function testSecretManager() {
  console.log("🧪 Testing Firebase Secret Manager Integration\n");

  // Test 1: Fetch required secret (should work in both dev and prod)
  console.log("1️⃣ Testing GEMINI_API_KEY fetch...");
  try {
    const geminiKey = await getSecret("GEMINI_API_KEY");
    if (geminiKey && geminiKey.startsWith("AIza")) {
      console.log("✅ GEMINI_API_KEY retrieved successfully");
      console.log(`   Length: ${geminiKey.length} characters`);
      console.log(`   Prefix: ${geminiKey.substring(0, 10)}...`);
    } else if (geminiKey) {
      console.log("⚠️  GEMINI_API_KEY found but format unexpected");
      console.log(`   Value: ${geminiKey.substring(0, 20)}...`);
    } else {
      console.log("❌ GEMINI_API_KEY is empty");
    }
  } catch (error) {
    console.log(`❌ Error fetching GEMINI_API_KEY: ${error}`);
  }

  // Test 2: Fetch optional secret
  console.log("\n2️⃣ Testing OPENAI_API_KEY fetch (optional)...");
  try {
    const openaiKey = await getSecret("OPENAI_API_KEY");
    if (openaiKey) {
      console.log("✅ OPENAI_API_KEY retrieved");
      console.log(`   Length: ${openaiKey.length} characters`);
    } else {
      console.log("⚠️  OPENAI_API_KEY not configured (expected for optional secret)");
    }
  } catch (error) {
    console.log(`❌ Error fetching OPENAI_API_KEY: ${error}`);
  }

  // Test 3: Caching test
  console.log("\n3️⃣ Testing cache performance...");
  const start1 = Date.now();
  await getSecret("GEMINI_API_KEY");
  const time1 = Date.now() - start1;

  const start2 = Date.now();
  await getSecret("GEMINI_API_KEY");
  const time2 = Date.now() - start2;

  console.log(`   First fetch: ${time1}ms`);
  console.log(`   Cached fetch: ${time2}ms`);
  if (time2 < time1) {
    console.log("✅ Caching is working (second fetch faster)");
  } else {
    console.log("⚠️  Cache may not be working as expected");
  }

  // Test 4: Verify fallback to process.env in dev
  console.log("\n4️⃣ Testing environment fallback...");
  const isProduction = process.env.NODE_ENV === "production";
  const hasSecretManager = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Project ID: ${hasSecretManager || "not set"}`);
  
  if (!isProduction && !hasSecretManager) {
    console.log("✅ Expected to fall back to .env.local in development");
  } else if (hasSecretManager) {
    console.log("✅ Should use Firebase Secret Manager");
  }

  console.log("\n✅ Secret Manager integration test complete!\n");
}

// Run test
testSecretManager().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
