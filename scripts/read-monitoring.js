const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp({ projectId: 'switchcv-e5136' });
const db = admin.firestore();

async function main() {
  const uid = 'pr2cdNhWizLmzehy6v6oVImRX6C3';

  // Check monitoring collection structure
  const monSnap = await db.collection('monitoring').limit(5).get();
  console.log('\n=== monitoring docs ===', monSnap.size);
  for (const d of monSnap.docs) {
    console.log('  monitoring/', d.id);
    const subcols = await d.ref.listCollections();
    for (const sub of subcols) {
      const subSnap = await sub.orderBy(admin.firestore.FieldPath.documentId(), 'desc').limit(3).get();
      console.log('    subcollection:', sub.id, '(', subSnap.size, 'docs, recent first)');
      for (const sd of subSnap.docs) {
        const s = sd.data();
        // filter by userId
        if (s.userId === uid || !s.userId) {
          console.log('    ---', sd.id);
          console.log('      userId:', s.userId);
          console.log('      entrypoint:', s.entrypoint);
          console.log('      finalOutcome:', s.finalOutcome);
          console.log('      createdResume:', s.createdResume);
          console.log('      status:', s.status);
          console.log('      userVisibleFailure:', s.userVisibleFailure);
          console.log('      startedAt:', s.startedAt);
          console.log('      completedAt:', s.completedAt);
          console.log('      durationMs:', s.durationMs);
        }
      }
    }
  }

  // Check monitoring/aiRequests if it exists
  const aiReqDoc = await db.collection('monitoring').doc('aiRequests').get();
  if (aiReqDoc.exists) {
    console.log('\n=== monitoring/aiRequests doc fields ===');
    console.log(Object.keys(aiReqDoc.data() || {}));
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
