/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'switchcv-dev' });

(async () => {
  const auth = admin.auth();
  const db = admin.firestore();
  
  console.log('🗑️  Cleaning up dev data...\n');
  
  // Delete users
  console.log('Deleting Auth users...');
  let count = 0;
  try {
    let users = await auth.listUsers(1000);
    const allUIDs = users.users.map(u => u.uid);
    
    for (const uid of allUIDs) {
      await auth.deleteUser(uid);
      count++;
    }
    console.log(`✅ Deleted ${count} users\n`);
  } catch (e) {
    console.log('Auth error:', e.message, '\n');
  }
  
  // Delete Firestore
  console.log('Deleting Firestore data...');
  const collections = ['users', 'userProfiles', 'resumes', 'resumeProfiles', 'verificationTokens', 'accessRequests', 'recruiterRequests'];
  
  for (const col of collections) {
    const snap = await db.collection(col).get();
    for (const doc of snap.docs) {
      await doc.ref.delete();
    }
    console.log(`✅ Cleaned ${col} (${snap.docs.length} docs)`);
  }
  
  console.log('\n✅ Done! Ready for fresh start with new verification method.\n');
  process.exit(0);
})();
