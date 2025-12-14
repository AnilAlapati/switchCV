const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials (Firebase CLI auth)
admin.initializeApp({
  projectId: 'switchcv-dev'
});

const db = admin.firestore();

async function checkUsers() {
  try {
    console.log('📋 Checking registered users and resumes in dev database...\n');

    // Get all users
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();

    console.log(`✅ Total registered users: ${usersSnapshot.size}\n`);

    // Get all resumes
    const resumesRef = db.collection('resumes');
    const resumesSnapshot = await resumesRef.get();

    console.log(`📄 Total resumes created: ${resumesSnapshot.size}\n`);

    if (resumesSnapshot.empty) {
      console.log('No resumes found yet.');
      return;
    }

    console.log('Resumes by user:');
    const resumesByUser = {};
    
    resumesSnapshot.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      if (!resumesByUser[userId]) {
        resumesByUser[userId] = [];
      }
      resumesByUser[userId].push({
        resumeId: doc.id,
        publishedAt: data.publishedAt?.toDate() || 'N/A'
      });
    });

    Object.entries(resumesByUser).forEach(([userId, resumes]) => {
      console.log(`  User ID: ${userId}`);
      resumes.forEach((resume, idx) => {
        console.log(`    ${idx + 1}. Resume ${resume.resumeId} - Published: ${resume.publishedAt}`);
      });
    });

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    admin.app().delete();
  }
}

checkUsers();