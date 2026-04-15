#!/usr/bin/env node
/**
 * Read all data for a user: conversations, progress, resumes, quota, billing.
 *
 * Usage:
 *   node scripts/read-user-data.js <email> [--project <projectId>]
 *
 * Defaults to production project (switchcv-e5136).
 * Pass --project switchcv-dev to query dev instead.
 *
 * Examples:
 *   node scripts/read-user-data.js anilalapati.66@gmail.com
 *   node scripts/read-user-data.js anilalapati.66@gmail.com --project switchcv-dev
 */
const admin = require('firebase-admin');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const projectFlagIndex = args.indexOf('--project');
const projectId = process.env.PROJECT_ID ||
  (projectFlagIndex !== -1 ? args[projectFlagIndex + 1] : 'switchcv-e5136');
const email = process.env.USER_EMAIL ||
  args.find((a) => !a.startsWith('--') && a !== args[projectFlagIndex + 1]);

if (!email) {
  console.error('Usage: node scripts/read-user-data.js <email> [--project <projectId>]');
  console.error('   Or: USER_EMAIL=user@example.com node scripts/read-user-data.js');
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const auth = admin.auth();

// ── Helpers ──────────────────────────────────────────────────────────────────
function ts(val) {
  if (!val) return '(none)';
  if (val._seconds) return new Date(val._seconds * 1000).toISOString();
  return String(val);
}

function shortContent(str, maxLen = 200) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  User Data Report`);
  console.log(`  Project : ${projectId}`);
  console.log(`  Email   : ${email}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Firebase Auth lookup
  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
  } catch (err) {
    console.error(`❌ Auth user not found for "${email}" in project "${projectId}"`);
    console.error(`   Code: ${err.code}`);
    process.exit(1);
  }

  const uid = authUser.uid;
  console.log('── Auth ─────────────────────────────────────────────────');
  console.log(`  UID          : ${uid}`);
  console.log(`  Display Name : ${authUser.displayName || '(none)'}`);
  console.log(`  Email Verified: ${authUser.emailVerified}`);
  console.log(`  Provider     : ${authUser.providerData.map((p) => p.providerId).join(', ')}`);
  console.log(`  Custom Claims: ${JSON.stringify(authUser.customClaims || {})}`);
  console.log(`  Last Sign-In : ${authUser.metadata.lastSignInTime || '(unknown)'}`);

  // 2. User Firestore document
  const userDoc = await db.collection('users').doc(uid).get();
  console.log('\n── Firestore User Document ──────────────────────────────');
  if (userDoc.exists) {
    const u = userDoc.data();
    console.log(`  Role            : ${u.role}`);
    console.log(`  Tier            : ${u.subscriptionTier || u.tier || '(not set)'}`);
    console.log(`  Approval        : ${u.approvalStatus}`);
    console.log(`  Username        : ${u.username}`);
    console.log(`  Needs Username  : ${u.needsUsername}`);
    console.log(`  Is Recruiter    : ${u.isRecruiter}`);
    console.log(`  Lifetime Resumes: ${u.lifetimeResumeCreations ?? 0}`);
    console.log(`  Role Updated At : ${ts(u.roleUpdatedAt)}`);
    console.log(`  Created At      : ${ts(u.createdAt)}`);
    console.log(`  Updated At      : ${ts(u.updatedAt)}`);
  } else {
    console.log('  ⚠️  No user document found in Firestore.');
  }

  // 3. All subcollections under the user doc
  const subcols = await db.collection('users').doc(uid).listCollections();
  const subcolNames = subcols.map((c) => c.id);
  console.log(`\n── User Subcollections: [${subcolNames.join(', ') || 'none'}]`);

  // 4. Conversation sessions
  console.log('\n── Conversation Sessions ────────────────────────────────');
  const sessionsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('conversationSessions')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  if (sessionsSnap.empty) {
    console.log('  No conversation sessions found.');
    console.log('  NOTE: Sessions are stored per-API-call, not per "chat window".');
    console.log('  If the chat hit a quota/billing error before the API returned,');
    console.log('  no session document is written (fire-and-forget in the `finally` block).');
  } else {
    console.log(`  Found ${sessionsSnap.size} session(s):\n`);
    for (const doc of sessionsSnap.docs) {
      const s = doc.data();
      console.log(`  ┌─ Session ID: ${doc.id}`);
      console.log(`  │  Created   : ${s.createdAt}`);
      console.log(`  │  Updated   : ${s.updatedAt}`);
      console.log(`  │  Outcome   : ${s.outcome}`);
      console.log(`  │  Turns     : ${s.turnCount}`);
      console.log(`  │  Resume ID : ${s.resumeId || '(none)'}`);
      console.log(`  │  Tier      : ${s.metadata?.userTier}`);
      console.log(`  │  Pipeline  : ${s.metadata?.pipeline}`);
      console.log(`  │  Model     : ${s.metadata?.model || '(not set)'}`);

      // Progress
      if (s.progress) {
        console.log(`  │  ── Progress ──`);
        console.log(`  │    Completeness : ${s.progress.completenessPercentage}%`);
        console.log(`  │    Collected    : ${(s.progress.collectedFields || []).join(', ')}`);
        console.log(`  │    Missing      : ${(s.progress.missingFields || []).join(', ')}`);
        console.log(`  │    Ready        : ${s.progress.isReadyToCreate}`);
      }

      // Collected data (preview data)
      const data = s.collectedData || (s.sessionData && s.sessionData.collectedData);
      if (data) {
        console.log(`  │  ── Collected Data (Preview) ──`);
        console.log(`  │    Name     : ${data.name || '(none)'}`);
        console.log(`  │    Email    : ${data.email || '(none)'}`);
        console.log(`  │    Phone    : ${data.phone || '(none)'}`);
        console.log(`  │    Summary  : ${shortContent(data.summary, 120)}`);
        console.log(`  │    Skills   : ${(data.skills || []).slice(0, 10).join(', ')}${(data.skills || []).length > 10 ? '...' : ''}`);
        console.log(`  │    Experience: ${(data.experience || []).length} role(s)`);
        console.log(`  │    Education : ${(data.education || []).length} entry(ies)`);
        console.log(`  │    Projects  : ${(data.projects || []).length} project(s)`);
      }

      // Messages
      if (s.messages && s.messages.length > 0) {
        console.log(`  │  ── Messages (${s.messages.length} total) ──`);
        for (let i = 0; i < s.messages.length; i++) {
          const m = s.messages[i];
          console.log(`  │  [${String(i + 1).padStart(2, '0')}] ${m.role.toUpperCase().padEnd(9)} ${shortContent(m.content, 160)}`);
        }
      }

      console.log(`  └${'─'.repeat(58)}\n`);
    }
  }

  // 5. Resumes
  console.log('── Resumes ──────────────────────────────────────────────');
  const resumesSnap = await db.collection('resumes').where('userId', '==', uid).limit(10).get();
  if (resumesSnap.empty) {
    console.log('  No resumes found.');
  } else {
    console.log(`  Found ${resumesSnap.size} resume(s):\n`);
    for (const doc of resumesSnap.docs) {
      const r = doc.data();
      const sections = [];
      if (r.personalInfo?.name || r.name) sections.push('name');
      if (r.experience?.length) sections.push(`exp×${r.experience.length}`);
      if (r.education?.length) sections.push(`edu×${r.education.length}`);
      if (r.skills?.length) sections.push(`skills×${r.skills.length}`);
      if (r.projects?.length) sections.push(`projects×${r.projects.length}`);
      console.log(`  Resume: ${doc.id}`);
      console.log(`    Numeric ID : ${r.numericId || '(none)'}`);
      console.log(`    Name       : ${r.personalInfo?.name || r.name || '(none)'}`);
      console.log(`    Status     : ${r.status || '(none)'}`);
      console.log(`    Template   : ${r.templateId || r.template || '(none)'}`);
      console.log(`    Created    : ${ts(r.createdAt)}`);
      console.log(`    Sections   : ${sections.join(', ') || '(empty)'}`);
      console.log('');
    }
  }

  // 6. Legacy resumeProfiles
  const rpSnap = await db.collection('resumeProfiles').where('userId', '==', uid).limit(10).get();
  if (!rpSnap.empty) {
    console.log('── Legacy Resume Profiles ───────────────────────────────');
    console.log(`  Found ${rpSnap.size} profile(s):`);
    rpSnap.docs.forEach((d) => {
      const p = d.data();
      console.log(`  - ${d.id}: name=${p.name || '(none)'}, created=${ts(p.createdAt)}`);
    });
    console.log('');
  }

  // 7. Quota / Billing
  console.log('── Quota & Billing ──────────────────────────────────────');
  const quotaSnap = await db.collection('searchQuotas').where('userId', '==', uid).limit(5).get();
  if (!quotaSnap.empty) {
    console.log(`  Search quotas (${quotaSnap.size}):`);
    quotaSnap.docs.forEach((d) => console.log(`    ${d.id}: ${JSON.stringify(d.data())}`));
  }

  // Check billing in the user doc itself
  const billingSnap = await db.collection('users').doc(uid).collection('billing').limit(5).get();
  if (!billingSnap.empty) {
    console.log(`  Billing docs (${billingSnap.size}):`);
    billingSnap.docs.forEach((d) => console.log(`    ${d.id}: ${JSON.stringify(d.data()).substring(0, 200)}`));
  }

  // Check AI request summaries (real collection path)
  const crypto = require('crypto');
  const userIdHash = crypto.createHash('sha256').update(uid).digest('hex');
  const summariesSnap = await db
    .collection('monitoring')
    .doc('aiRequestSummaries')
    .collection('requests')
    .where('userIdHash', '==', userIdHash)
    .orderBy('startedAt', 'desc')
    .limit(5)
    .get();
  if (!summariesSnap.empty) {
    console.log(`  AI Request Summaries (last ${summariesSnap.size}):`);
    summariesSnap.docs.forEach((d) => {
      const s = d.data();
      const startedAt = s.startedAt?.toDate?.()?.toISOString?.() ?? s.startedAt ?? '?';
      console.log(`    ${startedAt} | status=${s.status} | outcome=${s.finalOutcome} | fallbacks=${s.fallbackCount}`);
    });
  } else {
    console.log('  No AI request summaries found for this user.');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('  Done.');
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error).finally(() => process.exit(0));
