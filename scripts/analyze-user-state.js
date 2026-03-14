const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'switchcv-dev' });
}

async function main() {
  const db = admin.firestore();
  const email = 'anilalapati.66@gmail.com';
  const userId = '8rq3ipgHRQXDMZK9EUPYRlu3wVh2';

  console.log('=== FULL USER STATE ANALYSIS ===\n');

  // 1. Firebase Auth user record
  console.log('--- 1. Firebase Auth Record ---');
  try {
    const authUser = await admin.auth().getUser(userId);
    console.log('UID:', authUser.uid);
    console.log('Email:', authUser.email);
    console.log('Email Verified:', authUser.emailVerified);
    console.log('Display Name:', authUser.displayName);
    console.log('Provider:', authUser.providerData.map(p => p.providerId).join(', '));
    console.log('Created:', authUser.metadata.creationTime);
    console.log('Last Sign-In:', authUser.metadata.lastSignInTime);
    console.log('Custom Claims:', JSON.stringify(authUser.customClaims || {}));
    console.log('Disabled:', authUser.disabled);
  } catch (err) {
    console.log('Error fetching auth user:', err.message);
  }

  // 2. Firestore users/ doc
  console.log('\n--- 2. Firestore users/ Document ---');
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    // Print all fields
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && val.toDate) {
        console.log(`${key}: ${val.toDate().toISOString()}`);
      } else {
        console.log(`${key}: ${JSON.stringify(val)}`);
      }
    }
  } else {
    console.log('NO users/ document found');
  }

  // 3. Username reservation
  console.log('\n--- 3. Username Reservation ---');
  const userData = userDoc.exists ? userDoc.data() : {};
  if (userData.username) {
    const usernameDoc = await db.collection('usernames').doc(userData.username).get();
    if (usernameDoc.exists) {
      console.log(`usernames/${userData.username}:`, JSON.stringify(usernameDoc.data()));
    } else {
      console.log(`usernames/${userData.username}: NOT FOUND (orphaned reference)`);
    }
  } else {
    console.log('No username set on user doc');
  }

  // 4. Approval requests
  console.log('\n--- 4. Approval Requests ---');
  const approvalReqs = await db.collection('userApprovalRequests')
    .where('userId', '==', userId)
    .get();
  if (approvalReqs.empty) {
    console.log('No approval requests found for this user');
  } else {
    approvalReqs.forEach(doc => {
      const data = doc.data();
      console.log(`Request ${doc.id}:`);
      for (const [key, val] of Object.entries(data)) {
        if (key.includes('Token')) continue; // skip sensitive tokens
        if (val && typeof val === 'object' && val.toDate) {
          console.log(`  ${key}: ${val.toDate().toISOString()}`);
        } else {
          console.log(`  ${key}: ${JSON.stringify(val)}`);
        }
      }
    });
  }

  // 5. Mail queue entries for this user
  console.log('\n--- 5. Mail Queue (last 5 for this email) ---');
  const mailDocs = await db.collection('mail')
    .where('to', '==', email)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  if (mailDocs.empty) {
    console.log('No mail queue entries found');
  } else {
    mailDocs.forEach(doc => {
      const data = doc.data();
      console.log(`Mail ${doc.id}:`);
      console.log(`  to: ${data.to}`);
      console.log(`  subject: ${data.message?.subject || 'N/A'}`);
      console.log(`  createdAt: ${data.createdAt?.toDate?.()?.toISOString() || 'N/A'}`);
      console.log(`  delivery: ${JSON.stringify(data.delivery?.state || 'N/A')}`);
    });
  }

  // 6. Resumes
  console.log('\n--- 6. Resumes ---');
  const resumes = await db.collection('resumes').where('userId', '==', userId).get();
  console.log(`Found ${resumes.size} resume(s)`);
  resumes.forEach(doc => {
    const data = doc.data();
    console.log(`  ${doc.id}: "${data.title || data.name || 'untitled'}" (created: ${data.createdAt?.toDate?.()?.toISOString() || 'N/A'})`);
  });

  // 7. Config state
  console.log('\n--- 7. Approval Config (config/system.userApproval) ---');
  const configDoc = await db.collection('config').doc('system').get();
  if (configDoc.exists) {
    console.log(JSON.stringify(configDoc.data()?.userApproval || 'NOT SET', null, 2));
  } else {
    console.log('config/system doc does not exist');
  }

  // 8. Timeline summary
  console.log('\n--- 8. TIMELINE & GAP ANALYSIS ---');
  try {
    const authUser = await admin.auth().getUser(userId);
    const authCreated = new Date(authUser.metadata.creationTime);
    const firestoreCreated = userData.createdAt?.toDate?.();
    const firestoreUpdated = userData.updatedAt?.toDate?.();

    console.log(`Auth user created:      ${authCreated.toISOString()}`);
    console.log(`Firestore doc created:  ${firestoreCreated?.toISOString() || 'N/A'}`);
    console.log(`Firestore doc updated:  ${firestoreUpdated?.toISOString() || 'N/A'}`);

    if (authCreated && firestoreCreated) {
      const gapMs = firestoreCreated.getTime() - authCreated.getTime();
      console.log(`Gap (auth→firestore):   ${gapMs}ms`);
      if (gapMs > 5000) {
        console.log('  ⚠ Large gap — onUserCreated may have fired before ensureUserProfile wrote the doc');
      }
    }

    console.log(`\nApproval status:        ${userData.approvalStatus || 'NOT SET'}`);
    console.log(`Email verified (Auth):  ${authUser.emailVerified}`);
    console.log(`Email verified (FS):    ${userData.emailVerified}`);
    console.log(`Needs username:         ${userData.needsUsername}`);
    console.log(`Auth provider:          ${userData.authProvider}`);
  } catch (err) {
    console.log('Error in timeline analysis:', err.message);
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
