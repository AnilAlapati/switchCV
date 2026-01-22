#!/usr/bin/env node

/**
 * Firebase Configuration Setup Script
 * 
 * This script helps setup the system configuration in Firebase Firestore
 * for both DEV and PROD environments.
 * 
 * Usage:
 *   node scripts/setup-firebase-config.js dev
 *   node scripts/setup-firebase-config.js prod
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration objects
const DEV_CONFIG = {
  maintenance: {
    isActive: false,
    message: "",
    blocking: false
  },
  auth: {
    registrationClosed: false,
    loginDisabled: false
  },
  features: {
    enableAnalytics: false,
    enableMockData: true
  },
  rateLimits: {
    api: {
      windowMs: 60000,
      maxRequests: 100
    },
    search: {
      perMinute: 50
    },
    aiEnhancement: {
      basic: { perHour: 10, perDay: 100 },
      premium: { perHour: 50, perDay: 500 },
      enterprise: { perHour: 200, perDay: 2000 }
    },
    usernameCheck: {
      maxRequests: 50,
      windowMs: 60000
    },
    supportFeedback: {
      maxPerHour: 20,
      windowMs: 3600000
    }
  },
  tiers: {
    basic: {
      resumeLimit: 5,
      canEdit: true,
      retentionDays: null,
      deletionGracePeriodDays: null,
      expiryWarningHours: null,
      recruiterContacts: { total: 100 },
      recruiterSearches: 9999
    },
    premium: {
      resumeLimit: 50,
      canEdit: true,
      retentionDays: null,
      deletionGracePeriodDays: null,
      expiryWarningHours: null,
      recruiterContacts: { perMonth: 50 },
      recruiterSearches: 9999
    },
    enterprise: {
      resumeLimit: 9999,
      canEdit: true,
      retentionDays: null,
      deletionGracePeriodDays: null,
      expiryWarningHours: null,
      recruiterContacts: { perMonth: 9999 },
      recruiterSearches: 9999
    }
  },
  search: {
    basicQuota: 9999,
    premiumQuota: 999999,
    similarityThreshold: 0.3,
    maxResults: 50,
    costPerSearch: 0.5
  },
  ai: {
    defaultModel: "gemini-2.5-flash-lite",
    embeddingModel: "text-embedding-004",
    embeddingDimension: 768,
    maxRetries: 3,
    timeoutMs: 30000,
    maxTokens: 4096,
    preferredModels: [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gpt-4o-mini",
      "groq/llama-3.1-8b"
    ],
    enableCostWarnings: true
  },
  validation: {
    username: { minLength: 3, maxLength: 30 },
    fields: { maxLength: 200, maxDescriptionLength: 2000 },
    resume: {
      maxSkills: 50,
      maxExperiences: 20,
      maxEducations: 10,
      maxProjects: 20
    }
  },
  cache: {
    systemConfigTtlMs: 3600000,
    templateCacheTtlMs: 1800000,
    tierCacheTtlMs: 86400000,
    aiCacheTtlMs: 86400000
  }
};

const PROD_CONFIG = {
  maintenance: {
    isActive: false,
    message: "",
    blocking: false
  },
  auth: {
    registrationClosed: false,
    loginDisabled: false
  },
  features: {
    enableAnalytics: true,
    enableMockData: false
  },
  rateLimits: {
    api: {
      windowMs: 60000,
      maxRequests: 20
    },
    search: {
      perMinute: 10
    },
    aiEnhancement: {
      basic: { perHour: 2, perDay: 5 },
      premium: { perHour: 10, perDay: 40 },
      enterprise: { perHour: 30, perDay: 200 }
    },
    usernameCheck: {
      maxRequests: 10,
      windowMs: 60000
    },
    supportFeedback: {
      maxPerHour: 5,
      windowMs: 3600000
    }
  },
  tiers: {
    basic: {
      resumeLimit: 1,
      canEdit: false,
      retentionDays: 7,
      deletionGracePeriodDays: 3,
      expiryWarningHours: 72,
      recruiterContacts: { total: 2 },
      recruiterSearches: 2
    },
    premium: {
      resumeLimit: 50,
      canEdit: true,
      retentionDays: null,
      deletionGracePeriodDays: null,
      expiryWarningHours: null,
      recruiterContacts: { perMonth: 50 },
      recruiterSearches: 9999
    },
    enterprise: {
      resumeLimit: 9999,
      canEdit: true,
      retentionDays: null,
      deletionGracePeriodDays: null,
      expiryWarningHours: null,
      recruiterContacts: { perMonth: 9999 },
      recruiterSearches: 9999
    }
  },
  search: {
    basicQuota: 50,
    premiumQuota: 999999,
    similarityThreshold: 0.5,
    maxResults: 10,
    costPerSearch: 0.5
  },
  ai: {
    defaultModel: "gemini-2.5-flash-lite",
    embeddingModel: "text-embedding-004",
    embeddingDimension: 768,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokens: 2048,
    preferredModels: [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gpt-4o-mini",
      "groq/llama-3.1-8b"
    ],
    enableCostWarnings: true
  },
  validation: {
    username: { minLength: 3, maxLength: 30 },
    fields: { maxLength: 200, maxDescriptionLength: 2000 },
    resume: {
      maxSkills: 50,
      maxExperiences: 20,
      maxEducations: 10,
      maxProjects: 20
    }
  },
  cache: {
    systemConfigTtlMs: 60000,
    templateCacheTtlMs: 1800000,
    tierCacheTtlMs: 86400000,
    aiCacheTtlMs: 86400000
  }
};

async function setupFirebaseConfig(environment) {
  const env = environment.toLowerCase();

  if (env !== 'dev' && env !== 'prod') {
    console.error('❌ Invalid environment. Use "dev" or "prod"');
    process.exit(1);
  }

  const config = env === 'dev' ? DEV_CONFIG : PROD_CONFIG;
  const projectId = env === 'dev' ? 'switchcv-dev' : 'switchcv-e5136';

  console.log(`\n🔥 Setting up Firebase config for ${env.toUpperCase()} environment`);
  console.log(`📦 Project ID: ${projectId}`);

  try {
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      const serviceAccountPath = path.join(__dirname, '..', 'key.json');

      if (!fs.existsSync(serviceAccountPath)) {
        console.error('❌ Service account key not found at:', serviceAccountPath);
        console.log('💡 Please download your service account key and save it as key.json');
        console.log('\n📝 To download:');
        console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
        console.log('2. Click "Generate new private key"');
        console.log('3. Save as key.json in project root');
        process.exit(1);
      }

      const serviceAccount = require(serviceAccountPath);

      // Verify project ID matches
      if (serviceAccount.project_id !== projectId) {
        console.error(`❌ Service account key is for project "${serviceAccount.project_id}"`);
        console.error(`   but you're trying to setup "${projectId}"`);
        console.log('\n💡 Solutions:');
        console.log(`   1. Use correct project: node scripts/setup-firebase-config.js ${serviceAccount.project_id.includes('dev') ? 'dev' : 'prod'}`);
        console.log(`   2. Download key for ${projectId} and replace key.json`);
        process.exit(1);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    }

    const db = admin.firestore();
    const docRef = db.collection('config').doc('system');

    // Check if document already exists
    const doc = await docRef.get();
    if (doc.exists) {
      console.log('⚠️  Warning: config/system document already exists!');
      console.log('Current data:', JSON.stringify(doc.data(), null, 2));
      console.log('\n❓ Do you want to overwrite it? (This action cannot be undone)');
      // For automated scripts, you may want to add confirmation logic here
    }

    // Write the configuration
    await docRef.set(config);

    console.log('✅ Successfully created config/system document!');
    console.log('\n📋 Configuration Summary:');
    console.log(`   Environment: ${env.toUpperCase()}`);
    console.log(`   Analytics: ${config.features.enableAnalytics ? 'Enabled' : 'Disabled'}`);
    console.log(`   Mock Data: ${config.features.enableMockData ? 'Enabled' : 'Disabled'}`);
    console.log(`   Basic Tier Resume Limit: ${config.tiers.basic.resumeLimit}`);
    console.log(`   Basic Tier Can Edit: ${config.tiers.basic.canEdit ? 'Yes' : 'No'}`);
    console.log(`   AI Model: ${config.ai.defaultModel}`);
    console.log(`   Config Cache TTL: ${config.cache.systemConfigTtlMs / 1000}s`);

    console.log('\n🎉 Setup complete! You can now:');
    console.log('   1. View the config in Firebase Console');
    console.log('   2. Edit values directly in Firestore');
    console.log('   3. Changes will be picked up within the cache TTL');

  } catch (error) {
    console.error('❌ Error setting up Firebase config:', error.message);

    if (error.message.includes('PERMISSION_DENIED') || error.message.includes('insufficient permissions')) {
      console.log('\n🔐 Permission Error Detected!');
      console.log('\n💡 Solutions:');
      console.log('   1. Verify service account has "Cloud Datastore User" or "Firebase Admin" role');
      console.log('   2. Go to Firebase Console → Project Settings → Service Accounts');
      console.log('   3. Verify you downloaded the key for the correct project');
      console.log(`   4. Current project should be: ${projectId}`);
      console.log('\n   OR use manual setup (see docs/MIGRATION_STATUS.md)');
    }

    process.exit(1);
  }

  process.exit(0);
}

// Run the script
const environment = process.argv[2];
if (!environment) {
  console.error('❌ Missing environment argument');
  console.log('Usage: node scripts/setup-firebase-config.js [dev|prod]');
  process.exit(1);
}

setupFirebaseConfig(environment);
