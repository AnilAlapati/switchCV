#!/usr/bin/env node
/**
 * Setup approval system in Firestore Emulator
 * This enables the approval flow for testing
 */

const fetch = require('node-fetch');

const FIRESTORE_URL = 'http://127.0.0.1:8080/v1/projects/switchcv-dev/databases/(default)/documents';

async function createApprovalConfig() {
  console.log('\n📋 Setting up approval system configuration...\n');

  const config = {
    fields: {
      userApproval: {
        mapValue: {
          fields: {
            enabled: { booleanValue: true },
            adminEmail: { stringValue: 'admin@example.com' },
            autoApproveDomains: { arrayValue: { values: [] } },
          },
        },
      },
    },
  };

  try {
    const response = await fetch(`${FIRESTORE_URL}/config/system`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (response.ok) {
      console.log('✅ Approval system enabled');
      console.log('   - Admin email: admin@example.com');
      console.log('   - Auto-approve domains: none (manual approval required)\n');
      return true;
    } else {
      console.error('❌ Failed to create config');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n🔧 SwitchCV Approval System Setup');
  console.log('=====================================');

  const success = await createApprovalConfig();

  if (success) {
    console.log('📱 Next steps:');
    console.log('   1. Go to http://localhost:3000');
    console.log('   2. Register a new user');
    console.log('   3. Check Emulator UI → Firestore → userApprovalRequests');
    console.log('   4. Grab the approval token from that document');
    console.log('   5. Go to http://localhost:3000/api/user-approval/approve?token=<TOKEN>');
    console.log('   6. Check Firestore → mail for verification email');
    console.log('   7. Grab verification URL and test\n');
  }
}

main().catch(console.error);
