const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp({ projectId: 'switchcv-e5136' });
const db = admin.firestore();

async function main() {
  const uid = 'pr2cdNhWizLmzehy6v6oVImRX6C3';

  // aiRequestSummaries - no orderBy to avoid index requirement
  const aiReqSnap = await db.collection('aiRequestSummaries').where('userId', '==', uid).limit(5).get();
  console.log('\n=== aiRequestSummaries ===', aiReqSnap.size, 'docs');
  for (const d of aiReqSnap.docs) {
    const s = d.data();
    console.log('  id:', d.id);
    console.log('  outcome:', s.finalOutcome, '| createdResume:', s.createdResume, '| failure:', s.userVisibleFailure);
    console.log('  model:', s.model, '| tier:', s.userTier, '| entrypoint:', s.entrypoint);
    console.log('  created:', s.createdAt);
    console.log('  errorMessage:', s.errorMessage || '(none)');
    console.log();
  }

  // All top-level collections
  const cols = await db.listCollections();
  console.log('\n=== All top-level collections ===');
  for (const c of cols) {
    try {
      const snap = await c.limit(1).get();
      console.log(' -', c.id, '(has docs:', snap.size > 0, ')');
    } catch(e) {
      console.log(' -', c.id, '(error:', e.message.substring(0,80),')');
    }
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
