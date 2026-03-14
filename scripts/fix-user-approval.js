const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'switchcv-dev' });
}

async function main() {
  const db = admin.firestore();

  // Check approval config
  console.log('--- User Approval Config ---');
  const configDoc = await db.collection('systemConfig').doc('userApproval').get();
  if (configDoc.exists) {
    console.log(JSON.stringify(configDoc.data(), null, 2));
  } else {
    console.log('No userApproval config found');
  }

  // Fix: Update the user to approved
  const userId = '8rq3ipgHRQXDMZK9EUPYRlu3wVh2';
  console.log('\n--- Fixing user approval status ---');
  await db.collection('users').doc(userId).update({
    approvalStatus: 'approved',
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvalNote: 'Manually approved - existing dev user',
  });
  console.log('Updated approvalStatus to "approved" for user', userId);

  // Verify
  const userDoc = await db.collection('users').doc(userId).get();
  console.log('New approvalStatus:', userDoc.data().approvalStatus);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
