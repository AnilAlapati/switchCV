const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp({ projectId: 'switchcv-e5136' });
const db = admin.firestore();

async function main() {
  const uid = 'pr2cdNhWizLmzehy6v6oVImRX6C3';

  // Check aiRequestSummaries (used by persistAIRequestSummary)
  const aiReqSnap = await db.collection('aiRequestSummaries').where('userId', '==', uid).orderBy('createdAt', 'desc').limit(5).get();
  console.log('\n=== aiRequestSummaries ===', aiReqSnap.size, 'docs');
  for (const d of aiReqSnap.docs) {
    const s = d.data();
    console.log('  id:', d.id);
    console.log('  outcome:', s.finalOutcome, '| createdResume:', s.createdResume, '| failure:', s.userVisibleFailure);
    console.log('  model:', s.model, '| tier:', s.userTier, '| entrypoint:', s.entrypoint);
    console.log('  created:', s.createdAt);
    console.log('  error:', s.errorMessage || '(none)');
    console.log();
  }

  // Check aiUsageLogs (different collection)
  const usageSnap2 = await db.collection('aiUsageLogs').limit(5).get();
  console.log('\n=== aiUsageLogs (all) ===', usageSnap2.size, 'docs');

  // Check aiMonitoring
  const monSnap = await db.collection('aiMonitoring').where('userId', '==', uid).limit(5).get();
  console.log('\n=== aiMonitoring ===', monSnap.size, 'docs');

  // Check requestSummaries
  const reqSumSnap = await db.collection('requestSummaries').where('userId', '==', uid).limit(5).get();
  console.log('\n=== requestSummaries ===', reqSumSnap.size, 'docs');

  // Check all top-level collections to understand structure
  const cols = await db.listCollections();
  console.log('\n=== All top-level collections ===');
  for (const c of cols) {
    const count = (await c.limit(1).get()).size;
    console.log(' -', c.id, '(has docs:', count > 0, ')');
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
