const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with environment variables
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'switchcv-prod';

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY env var not set');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
} catch (e) {
  console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
  process.exit(1);
}

const db = admin.firestore();

async function checkResume() {
  console.log('🔍 Fetching resume #44 from Firestore...\n');
  
  try {
    // Try resumes collection first
    const resumeDoc = await db.collection('resumes').doc('44').get();
    
    if (resumeDoc.exists) {
      const data = resumeDoc.data();
      console.log('📄 Resume #44 exists in "resumes" collection');
      
      // Check experience array
      if (data.experience && Array.isArray(data.experience)) {
        console.log(`\n📊 EXPERIENCE ENTRIES: ${data.experience.length} entries found\n`);
        
        data.experience.forEach((exp, idx) => {
          console.log(`[${idx}] ${exp.company || '⚠️  MISSING COMPANY'}`);
          console.log(`    Role: ${exp.role || exp.title || '⚠️  MISSING ROLE'}`);
          console.log(`    Date: ${exp.startDate || '⚠️  EMPTY'} → ${exp.endDate || exp.endDate === null ? 'Present' : '⚠️  EMPTY'}`);
          console.log(`    Description: ${exp.description ? '✅ ' + exp.description.substring(0, 80) + '...' : '⚠️  EMPTY'}`);
          console.log(`    Achievements: ${Array.isArray(exp.achievements) ? '✅ ' + exp.achievements.length + ' items' : '⚠️  MISSING/EMPTY'}`);
          console.log('');
        });
        
        // Check for JPMC specifically
        const jpmc = data.experience.find(e => 
          (e.company && (
            e.company.toLowerCase().includes('jpmorgan') || 
            e.company.toLowerCase().includes('jp morgan') ||
            e.company.toLowerCase().includes('jpm') ||
            e.company.toLowerCase().includes('chase')
          )) || 
          (e.role && e.role.toLowerCase().includes('jpmorgan'))
        );
        
        if (jpmc) {
          console.log('✅ JPMC ENTRY FOUND:');
          console.log(JSON.stringify(jpmc, null, 2));
        } else {
          console.log('❌ ⚠️  NO JPMC ENTRY FOUND in experience array!');
          console.log('\n📋 Companies found in experience:');
          data.experience.forEach((exp, idx) => {
            console.log(`   [${idx}] ${exp.company || 'MISSING'}`);
          });
        }
      } else {
        console.log('\n❌ No experience array found!');
      }
      
    } else {
      console.log('Resume #44 not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await admin.app().delete();
    process.exit(0);
  }
}

checkResume();
