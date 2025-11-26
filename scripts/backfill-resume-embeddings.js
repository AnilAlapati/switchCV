#!/usr/bin/env node

/**
 * Backfill Script: Generate embeddings for existing published resumes
 * 
 * This script finds all published resumes that don't have embeddings yet
 * and generates vector embeddings for AI-powered search.
 * 
 * Usage:
 *   node scripts/backfill-resume-embeddings.js
 *   node scripts/backfill-resume-embeddings.js --dry-run     # Preview without changes
 *   node scripts/backfill-resume-embeddings.js --batch=50    # Custom batch size
 *   node scripts/backfill-resume-embeddings.js --limit=100   # Process max N resumes
 * 
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set to service account key
 *   - GEMINI_API_KEY environment variable for embedding generation
 */

const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const BATCH_SIZE = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '25');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');

// Stats tracking
const stats = {
  total: 0,
  processed: 0,
  skipped: 0,
  failed: 0,
  errors: []
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
    path.join(__dirname, '..', 'serviceAccountKey.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✓ Firebase Admin initialized');
  } catch (err) {
    console.error('✗ Failed to initialize Firebase Admin:', err.message);
    console.error('  Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json in project root');
    process.exit(1);
  }
}

const db = admin.firestore();

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('✗ GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

/**
 * Build searchable text from resume data
 */
function buildSearchableText(resume) {
  const parts = [];

  // Personal info
  if (resume.title) {
    parts.push(`Title: ${resume.title}`);
  }

  // Profile / Summary
  const profile = resume.profile || resume.summary || resume.personalInfo?.summary;
  if (profile) {
    parts.push(`Summary: ${profile}`);
  }

  // Skills
  const skills = resume.skills || resume.personalInfo?.skills || [];
  if (Array.isArray(skills) && skills.length > 0) {
    // Handle both string arrays and object arrays
    const skillNames = skills.map(s => typeof s === 'string' ? s : s.name || s.skill).filter(Boolean);
    if (skillNames.length > 0) {
      parts.push(`Skills: ${skillNames.join(', ')}`);
    }
  }

  // Experience
  const experience = resume.experience || resume.workHistory || [];
  if (Array.isArray(experience)) {
    experience.forEach((exp, i) => {
      const expParts = [];
      if (exp.title || exp.position || exp.role) {
        expParts.push(exp.title || exp.position || exp.role);
      }
      if (exp.company || exp.organization) {
        expParts.push(`at ${exp.company || exp.organization}`);
      }
      if (exp.description || exp.responsibilities) {
        expParts.push(exp.description || (Array.isArray(exp.responsibilities) ? exp.responsibilities.join('. ') : exp.responsibilities));
      }
      if (expParts.length > 0) {
        parts.push(`Experience ${i + 1}: ${expParts.join(' - ')}`);
      }
    });
  }

  // Education
  const education = resume.education || [];
  if (Array.isArray(education)) {
    education.forEach((edu, i) => {
      const eduParts = [];
      if (edu.degree) eduParts.push(edu.degree);
      if (edu.field || edu.major) eduParts.push(edu.field || edu.major);
      if (edu.institution || edu.school || edu.university) {
        eduParts.push(`from ${edu.institution || edu.school || edu.university}`);
      }
      if (eduParts.length > 0) {
        parts.push(`Education ${i + 1}: ${eduParts.join(' ')}`);
      }
    });
  }

  // Projects
  const projects = resume.projects || [];
  if (Array.isArray(projects)) {
    projects.forEach((proj, i) => {
      const projParts = [];
      if (proj.name || proj.title) projParts.push(proj.name || proj.title);
      if (proj.description) projParts.push(proj.description);
      if (proj.technologies) {
        const tech = Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies;
        projParts.push(`Technologies: ${tech}`);
      }
      if (projParts.length > 0) {
        parts.push(`Project ${i + 1}: ${projParts.join(' - ')}`);
      }
    });
  }

  // Certifications
  const certifications = resume.certifications || [];
  if (Array.isArray(certifications)) {
    const certNames = certifications.map(c => typeof c === 'string' ? c : c.name || c.title).filter(Boolean);
    if (certNames.length > 0) {
      parts.push(`Certifications: ${certNames.join(', ')}`);
    }
  }

  const searchableText = parts.join('\n\n');
  
  // Truncate to avoid token limits (roughly 8000 chars for ~2000 tokens)
  return searchableText.slice(0, 8000);
}

/**
 * Generate embedding for text using Gemini
 */
async function generateEmbedding(text) {
  if (!text || text.trim().length < 10) {
    throw new Error('Text too short for embedding generation');
  }

  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

/**
 * Process a single resume
 */
async function processResume(resumeDoc) {
  const resumeId = resumeDoc.id;
  const resumeData = resumeDoc.data();

  // Skip if already has embedding
  if (resumeData.searchEmbedding && Array.isArray(resumeData.searchEmbedding) && resumeData.searchEmbedding.length === 768) {
    console.log(`  ⏭ Resume ${resumeId}: Already has embedding`);
    stats.skipped++;
    return;
  }

  // Skip if not public / visible
  const isPublic = resumeData.isPublic || resumeData.visibility === 'public';
  if (!isPublic) {
    console.log(`  ⏭ Resume ${resumeId}: Not public, skipping`);
    stats.skipped++;
    return;
  }

  // Skip if being edited
  if (resumeData.isBeingEdited) {
    console.log(`  ⏭ Resume ${resumeId}: Currently being edited, skipping`);
    stats.skipped++;
    return;
  }

  try {
    // Build searchable text
    const searchableText = buildSearchableText(resumeData);
    
    if (searchableText.length < 50) {
      console.log(`  ⚠ Resume ${resumeId}: Insufficient content for embedding`);
      stats.skipped++;
      return;
    }

    // Generate embedding
    console.log(`  ⏳ Resume ${resumeId}: Generating embedding (${searchableText.length} chars)...`);
    const embedding = await generateEmbedding(searchableText);

    if (!DRY_RUN) {
      // Update Firestore
      await resumeDoc.ref.update({
        searchEmbedding: admin.firestore.FieldValue.vector(embedding),
        searchEmbeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ Resume ${resumeId}: Embedding saved (${embedding.length} dimensions)`);
    } else {
      console.log(`  ✓ Resume ${resumeId}: Would save embedding (${embedding.length} dimensions) [DRY RUN]`);
    }

    stats.processed++;
  } catch (error) {
    console.error(`  ✗ Resume ${resumeId}: Failed - ${error.message}`);
    stats.failed++;
    stats.errors.push({ resumeId, error: error.message });
  }
}

/**
 * Main backfill function
 */
async function backfillEmbeddings() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Resume Embedding Backfill Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`  Batch Size: ${BATCH_SIZE}`);
  console.log(`  Limit: ${LIMIT || 'None'}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Query resumes that need embeddings
  let query = db.collection('resumes')
    .where('isPublic', '==', true);

  if (LIMIT > 0) {
    query = query.limit(LIMIT);
  }

  const snapshot = await query.get();
  stats.total = snapshot.size;

  console.log(`Found ${stats.total} public resumes to check`);
  console.log('');

  // Process in batches to avoid rate limits
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(docs.length / BATCH_SIZE);
    
    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} resumes):`);
    
    // Process batch sequentially to respect rate limits
    for (const doc of batch) {
      await processResume(doc);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Longer delay between batches
    if (i + BATCH_SIZE < docs.length) {
      console.log('  Waiting 2s before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total Checked:  ${stats.total}`);
  console.log(`  Processed:      ${stats.processed}`);
  console.log(`  Skipped:        ${stats.skipped}`);
  console.log(`  Failed:         ${stats.failed}`);
  
  if (stats.errors.length > 0) {
    console.log('');
    console.log('  Errors:');
    stats.errors.forEach(({ resumeId, error }) => {
      console.log(`    - ${resumeId}: ${error}`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (DRY_RUN) {
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply changes.');
  }
}

// Run the script
backfillEmbeddings()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
