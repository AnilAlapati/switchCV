const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'switchcv-dev' });
}

async function main() {
  const db = admin.firestore();

  // Create or update the config/system document to disable user approval in dev
  const configRef = db.collection('config').doc('system');
  const configDoc = await configRef.get();

  const existingData = configDoc.exists ? configDoc.data() : {};
  console.log('Existing config/system data:', JSON.stringify(existingData, null, 2));

  await configRef.set({
    ...existingData,
    userApproval: {
      enabled: false,
      adminEmail: existingData?.userApproval?.adminEmail || 'support@switchcv.com',
      autoApproveDomains: existingData?.userApproval?.autoApproveDomains || [],
    },
  }, { merge: true });

  console.log('\nUpdated config/system.userApproval.enabled = false');
  console.log('User approval is now DISABLED in dev environment.');
  console.log('New users will be auto-approved and get verification emails directly.');

  // Verify
  const updated = await configRef.get();
  console.log('\nFinal config:', JSON.stringify(updated.data()?.userApproval, null, 2));
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
