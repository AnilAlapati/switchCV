/**
 * Clean delete of a dev user and all associated data.
 * Usage: node scripts/clean-delete-dev-user.js <email>
 */
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'switchcv-dev' });
}

async function main() {
  const email = process.argv[2] || 'anilalapati.66@gmail.com';
  const db = admin.firestore();

  console.log(`\nCleaning up user: ${email}\n`);

  // 1. Find the user in Firebase Auth
  let authUser;
  try {
    authUser = await admin.auth().getUserByEmail(email);
    console.log(`Found Auth user: ${authUser.uid}`);
  } catch (err) {
    console.log(`No Auth user found for ${email}: ${err.code}`);
    return;
  }

  const uid = authUser.uid;

  // 2. Find and show Firestore user doc
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    console.log(`Firestore user doc exists:`);
    console.log(`  username: ${data.username}`);
    console.log(`  approvalStatus: ${data.approvalStatus}`);
    console.log(`  approvalRequestId: ${data.approvalRequestId}`);

    // 3. Delete username reservation
    if (data.username) {
      const usernameDoc = await db.collection('usernames').doc(data.username).get();
      if (usernameDoc.exists && usernameDoc.data().uid === uid) {
        await db.collection('usernames').doc(data.username).delete();
        console.log(`  Deleted username reservation: ${data.username}`);
      }
    }

    // 4. Delete approval request
    if (data.approvalRequestId) {
      await db.collection('userApprovalRequests').doc(data.approvalRequestId).delete();
      console.log(`  Deleted approval request: ${data.approvalRequestId}`);
    }

    // 5. Delete resumes (if any)
    const resumes = await db.collection('resumes').where('userId', '==', uid).get();
    for (const doc of resumes.docs) {
      await doc.ref.delete();
      console.log(`  Deleted resume: ${doc.id}`);
    }

    // 6. Delete resume profiles (legacy collection)
    const profiles = await db.collection('resumeProfiles').where('userId', '==', uid).get();
    for (const doc of profiles.docs) {
      await doc.ref.delete();
      console.log(`  Deleted resumeProfile: ${doc.id}`);
    }

    // 7. Delete the user document
    await db.collection('users').doc(uid).delete();
    console.log(`  Deleted Firestore users/${uid}`);
  } else {
    console.log('No Firestore user doc found');
  }

  // 8. Delete Firebase Auth user
  await admin.auth().deleteUser(uid);
  console.log(`  Deleted Firebase Auth user: ${uid}`);

  console.log(`\nDone. User ${email} fully cleaned up.`);
  console.log('You can now sign in fresh with Google — the onUserCreated function will fire again.');
}

main().then(() => process.exit(0)).catch(err => { console.error('Error:', err.message); process.exit(1); });
