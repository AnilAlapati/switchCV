#!/usr/bin/env node
/**
 * Script to inspect resumes in Firestore to understand why count is high
 * 
 * Usage:
 * node scripts/inspect-prod-resumes.js --project switchcv-e5136
 */

const admin = require("firebase-admin");

// Parse command line arguments for --project
const args = process.argv.slice(2);
const projectArgIndex = args.indexOf('--project');
const projectId = projectArgIndex !== -1 ? args[projectArgIndex + 1] : "switchcv-e5136";

console.log(`📍 Using project: ${projectId}`);

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
    admin.initializeApp({
        projectId,
    });
}

const db = admin.firestore();

async function inspectResumes() {
    console.log("🔍 Inspecting resumes...\n");

    try {
        const resumesSnapshot = await db.collectionGroup("resumes").get();

        console.log(`Found ${resumesSnapshot.size} total documents in 'resumes' collection-group.`);

        // Group by status/type
        let drafts = 0;
        let published = 0;
        let valid = 0;
        let empty = 0;

        const samples = [];

        resumesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const isDraft = data.isDraft || data.status === 'draft';
            const isPublished = data.published === true;
            const hasContent = data.personalInfo || data.experience?.length > 0;

            if (isDraft) drafts++;
            if (isPublished) published++;
            if (hasContent) valid++;
            else empty++;

            // Print first 5 for inspection
            if (samples.length < 10) {
                samples.push({
                    id: doc.id,
                    path: doc.ref.path,
                    isDraft,
                    published: data.published,
                    status: data.status,
                    targetRole: data.targetRole,
                    hasContent
                });
            }
        });

        console.log("\n📊 Analysis:");
        console.log(`- Drafts (isDraft=true OR status='draft'): ${drafts}`);
        console.log(`- Published (published=true): ${published}`);
        console.log(`- Has Content: ${valid}`);
        console.log(`- Empty/Invalid: ${empty}`);

        console.log("\n📄 Sample Documents:");
        console.table(samples);

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

inspectResumes().then(() => process.exit(0));
