const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'switchcv-dev' });
}

async function checkUser() {
  const db = admin.firestore();
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', 'anilalapati.66@gmail.com').get();

  if (snapshot.empty) {
    console.log('No user found with email anilalapati.66@gmail.com');
    // Try listing all users to find matching ones
    const allUsers = await usersRef.limit(10).get();
    console.log('\nFirst 10 users:');
    allUsers.forEach(doc => {
      console.log(`  ${doc.id}: ${doc.data().email}`);
    });
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('User doc ID:', doc.id);
    console.log('approvalStatus:', data.approvalStatus);
    console.log('approvalRequestId:', data.approvalRequestId);
    console.log('role:', data.role);
    console.log('username:', data.username);
    console.log('needsUsername:', data.needsUsername);
    console.log('emailVerified:', data.emailVerified);
    console.log('authProvider:', data.authProvider);
    console.log('createdAt:', data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt);
    console.log('updatedAt:', data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt);
  });

  // Also check userApprovalRequests
  console.log('\n--- Approval Requests ---');
  const approvalReqs = await db.collection('userApprovalRequests')
    .where('email', '==', 'anilalapati.66@gmail.com')
    .get();
  if (approvalReqs.empty) {
    console.log('No approval requests found');
  } else {
    approvalReqs.forEach(doc => {
      const data = doc.data();
      console.log('Request ID:', doc.id);
      console.log('status:', data.status);
      console.log('createdAt:', data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt);
    });
  }

  // Check user approval config
  console.log('\n--- User Approval Config ---');
  const configDoc = await db.collection('systemConfig').doc('userApproval').get();
  if (configDoc.exists) {
    console.log(JSON.stringify(configDoc.data(), null, 2));
  } else {
    console.log('No userApproval config found in systemConfig');
  }
}

checkUser().then(() => process.exit(0)).catch(err => { console.error(err.message); process.exit(1); });
