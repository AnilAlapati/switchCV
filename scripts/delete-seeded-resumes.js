const admin = require('firebase-admin');

// Initialize Firebase Admin with dev project
admin.initializeApp({
  projectId: 'switchcv-dev'
});

const db = admin.firestore();

const SEEDED_TITLES = [
  "Senior Full Stack Engineer",
  "DevOps Engineer",
  "Machine Learning Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Security Engineer",
  "Data Engineer",
  "QA Automation Engineer",
  "Mobile Engineer",
  "Solutions Architect"
];

async function deleteSeeded() {
  try {
    console.log('🔍 Searching for seeded resumes to delete...');

    // Firestore supports `in` queries with up to 10 elements
    const q = db.collection('resumes').where('title', 'in', SEEDED_TITLES);
    const snap = await q.get();

    if (snap.empty) {
      console.log('✅ No seeded resumes found (nothing to delete).');
      return;
    }

    console.log(`⚠️ Found ${snap.size} seeded resumes. Deleting...`);

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`✅ Deleted ${snap.size} seeded resumes.`);
  } catch (err) {
    console.error('❌ Error deleting seeded resumes:', err);
  } finally {
    admin.app().delete();
  }
}

deleteSeeded();