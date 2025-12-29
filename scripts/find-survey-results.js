#!/usr/bin/env node

/**
 * Find Willingness To Pay Survey Results
 * 
 * Usage:
 * node scripts/find-survey-results.js
 * 
 * This script scans all users for the 'willingnessToPay' survey and 
 * prints out those who voted 'Yes', 'No', or 'Maybe'.
 */

const admin = require("firebase-admin");
const path = require("path");

// Parse command line arguments for --project
const args = process.argv.slice(2);
const projectArgIndex = args.indexOf('--project');
const projectOverride = projectArgIndex !== -1 ? args[projectArgIndex + 1] : null;

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(
    __dirname,
    "../firebase-service-account.json"
);

let serviceAccount;
let projectId;

try {
    // Try to load service account
    try {
        serviceAccount = require(serviceAccountPath);
        projectId = projectOverride || serviceAccount.project_id;
        console.log("🔑 Found service account key file.");
        console.log(`📍 Using project: ${projectId}`);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId,
        });
    } catch {
        // Fallback to ADC
        console.log("⚠️ Service account key not found. Trying Application Default Credentials...");
        projectId = projectOverride || "switchcv-e5136"; // Default/Fallback
        console.log(`📍 Using project: ${projectId}`);

        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: projectId,
        });
        console.log("✅ Initialized with Application Default Credentials.");
    }
} catch (error) {
    console.error("\n❌ Authentication Failed");
    console.error(error);
    process.exit(1);
}

const db = admin.firestore();

async function findSurveyResults() {
    console.log("🔍 Scanning for survey results...");

    try {
        // 1. Get all users
        // Note: If you have thousands of users, use listUsers() from auth or paginate. 
        // For now/MVP, iterating user docs is fine if 'users' collection matches auth users.
        const usersSnapshot = await db.collection("users").get();

        if (usersSnapshot.empty) {
            console.log("No users found.");
            return;
        }

        console.log(`Checking ${usersSnapshot.size} users...`);

        let yesVotes = 0;
        let maybeVotes = 0;
        let totalResponses = 0;
        const results = [];

        // 2. Iterate and check subcollection
        // Using Promise.all for parallelism
        const checks = usersSnapshot.docs.map(async (userDoc) => {
            const surveyDoc = await userDoc.ref
                .collection("surveys")
                .doc("willingnessToPay")
                .get();

            if (surveyDoc.exists) {
                const data = surveyDoc.data();
                const userData = userDoc.data();
                return {
                    uid: userDoc.id,
                    email: userData.email || "Unknown Email", // Assumes email is stored in user doc
                    response: data.response,
                    timestamp: data.timestamp ? data.timestamp.toDate() : null
                };
            }
            return null;
        });

        const surveyData = await Promise.all(checks);

        // Filter nulls
        const validResponses = surveyData.filter(r => r !== null);

        // Process results
        validResponses.forEach(r => {
            totalResponses++;
            if (r.response === "Yes") yesVotes++;
            if (r.response === "Maybe") maybeVotes++;

            results.push(r);
        });

        // Sort by timestamp desc
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        console.log("\n------- SURVEY RESULTS -------");
        if (results.length === 0) {
            console.log("No survey responses found.");
        } else {
            results.forEach(r => {
                const icon = r.response === "Yes" ? "✅" : (r.response === "Maybe" ? "🤔" : "❌");
                console.log(`${icon} [${r.response}] - ${r.email} (${r.uid}) - ${r.timestamp}`);
            });
        }
        console.log("------------------------------");
        console.log(`Total Responses: ${totalResponses}`);
        console.log(`Yes: ${yesVotes}`);
        console.log(`Maybe: ${maybeVotes}`);

    } catch (error) {
        console.error("Error finding survey results:", error);
        process.exit(1);
    }
}

findSurveyResults()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
