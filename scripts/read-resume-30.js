const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp({ projectId: 'switchcv-e5136' });
const db = admin.firestore();

async function main() {
  const uid = 'pr2cdNhWizLmzehy6v6oVImRX6C3';

  // Top-level resumes collection - doc ID "30"
  const r1 = await db.collection('resumes').doc('30').get();
  console.log('\n=== resumes/30 (top-level) ===');
  if (r1.exists) {
    const d = r1.data();
    console.log('userId:', d.userId);
    console.log('status:', d.status);
    console.log('visibility:', d.visibility);
    console.log('isPublic:', d.isPublic);
    console.log('numericId:', d.numericId);
    console.log('name/personalInfo.name:', d.personalInfo?.name || d.name);
    console.log('templateId:', d.templateId);
    console.log('experience:', (d.experience||[]).length, 'roles');
    console.log('education:', (d.education||[]).length, 'entries');
    console.log('skills:', (d.skills||[]).length, 'skills');
    console.log('All keys:', Object.keys(d).join(', '));
    // Print whole experience section
    (d.experience||[]).forEach((e, i) => {
      console.log(`  Exp[${i}]:`, JSON.stringify(e));
    });
    (d.education||[]).forEach((e, i) => {
      console.log(`  Edu[${i}]:`, JSON.stringify(e));
    });
    console.log('Skills:', d.skills);
    if (d.personalInfo) console.log('personalInfo:', JSON.stringify(d.personalInfo));
  } else {
    console.log('NOT FOUND in resumes collection');
    // Try by numericId
    const snap = await db.collection('resumes').where('numericId', '==', 30).get();
    if (!snap.empty) {
      console.log('Found by numericId=30, doc ID:', snap.docs[0].id);
      console.log(JSON.stringify(snap.docs[0].data(), null, 2));
    } else {
      console.log('Also not found by numericId query');
    }
  }

  // User subcollection: users/{uid}/resumes
  const subResumes = await db.collection('users').doc(uid).collection('resumes').limit(5).get();
  console.log(`\n=== users/${uid}/resumes (subcollection) ===`);
  console.log('count:', subResumes.size);
  for (const d of subResumes.docs) {
    console.log('  subcollection doc ID:', d.id, JSON.stringify(d.data()));
  }

  // User subcollection: users/{uid}/userResumes
  const subUR = await db.collection('users').doc(uid).collection('userResumes').limit(5).get();
  console.log(`\n=== users/${uid}/userResumes (subcollection) ===`);
  console.log('count:', subUR.size);
  for (const d of subUR.docs) {
    console.log('  doc ID:', d.id, JSON.stringify(d.data()));
  }

  // conversationSessions
  const sessions = await db.collection('users').doc(uid).collection('conversationSessions').limit(10).get();
  console.log(`\n=== users/${uid}/conversationSessions ===`);
  console.log('count:', sessions.size);
  for (const doc of sessions.docs) {
    const s = doc.data();
    console.log(`\n  Session: ${doc.id}`);
    console.log(`  outcome: ${s.outcome}, turns: ${s.turnCount}, msgs: ${(s.messages||[]).length}`);
    console.log(`  resumeId: ${s.resumeId}, tier: ${s.metadata?.userTier}`);
    (s.messages||[]).forEach((m, i) => {
      console.log(`  [${i+1}] ${m.role.toUpperCase()}: ${(m.content||'').substring(0, 200)}`);
    });
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
