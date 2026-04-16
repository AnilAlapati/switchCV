const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp({ projectId: 'switchcv-e5136' });
const db = admin.firestore();

async function main() {
  // Find the request that created a resume
  const snap = await db.collection('monitoring').doc('aiRequestSummaries').collection('requests')
    .where('finalOutcome', '==', 'resume_created').limit(20).get();
  console.log('\n=== resume_created requests ===', snap.size);
  for (const d of snap.docs) {
    const s = d.data();
    console.log('\n  id:', d.id);
    console.log('  ALL fields:', JSON.stringify(s, null, 4));
  }

  // Also get all fields for first 2 docs to understand schema
  const all = await db.collection('monitoring').doc('aiRequestSummaries').collection('requests').limit(2).get();
  console.log('\n=== Sample doc schema ===');
  for (const d of all.docs) {
    console.log(JSON.stringify(d.data(), null, 4));
    break;
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
