const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'switchcv-dev' });

const db = admin.firestore();
const auth = admin.auth();

(async () => {
  const token = '724573d0-c58c-4e4c-92f1-5927e289de9b';
  
  console.log('Testing verification flow...\n');
  
  // 1. Check if token exists
  const snapshot = await db.collection('verificationTokens')
    .where('token', '==', token)
    .where('used', '==', false)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    console.log('❌ Token not found in Firestore');
    process.exit(1);
  }
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  console.log('✅ Token found:', {
    userId: data.userId,
    used: data.used,
    expiresAt: data.expiresAt?.toDate?.() || data.expiresAt
  });
  
  // 2. Check user
  try {
    const userRecord = await auth.getUser(data.userId);
    console.log('\n✅ User found:', {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified
    });
    
    // 3. Update user
    await auth.updateUser(data.userId, { emailVerified: true });
    console.log('\n✅ User updated to emailVerified: true');
    
    // 4. Mark token as used
    await doc.ref.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Token marked as used');
    
    console.log('\n✅ Verification successful!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  process.exit(0);
})();
