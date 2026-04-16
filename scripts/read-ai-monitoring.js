const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp({ projectId: 'switchcv-e5136' });
const db = admin.firestore();

async function main() {
  const uid = 'pr2cdNhWizLmzehy6v6oVImRX6C3';

  // Check monitoring/aiRequestSummaries subcollections
  const subSnap = await db.collection('monitoring').doc('aiRequestSummaries').collection('requests').limit(10).get();
  console.log('\n=== monitoring/aiRequestSummaries/requests ===', subSnap.size, 'docs');
  for (const d of subSnap.docs) {
    const s = d.data();
    const match = s.userId === uid;
    console.log(`  ${match ? '>>> USER MATCH <<<' : ''} id=${d.id.substring(0,20)}... | userId=${(s.userId||'?').substring(0,20)} | outcome=${s.finalOutcome} | created=${s.createdResume} | entry=${s.entrypoint} | started=${s.startedAt}`);
  }

  // Check monitoring/aiFailureEvents
  const failSnap = await db.collection('monitoring').doc('aiFailureEvents').collection('events').limit(10).get();
  console.log('\n=== monitoring/aiFailureEvents/events ===', failSnap.size, 'docs');
  for (const d of failSnap.docs) {
    const s = d.data();
    const match = s.userId === uid;
    console.log(`  ${match ? '>>> USER <<<' : ''} ${d.id.substring(0,20)} | userId=${(s.userId||'none').substring(0,20)} | stage=${s.stage} | error=${(s.errorMessage||'').substring(0,80)} | at=${s.timestamp}`);
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
