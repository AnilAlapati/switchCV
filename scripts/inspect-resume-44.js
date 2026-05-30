const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "switchcv-e5136",
    });
}

const db = admin.firestore();

async function inspectResume44() {
    console.log("🔍 Searching for resume 44...\n");

    try {
        // 1. Search in collection group "resumes" by ID
        console.log("--- Collection Group 'resumes' by ID ---");
        const docRef = db.collectionGroup("resumes");
        const snap = await docRef.get();
        for (const doc of snap.docs) {
            const data = doc.data();
            if (doc.id === "44" || data.resumeId === 44 || data.numericId === 44) {
                console.log(`FOUND in ${doc.ref.path}:`);
                console.log(JSON.stringify(data, null, 2));
            }
        }

        // 2. Search in collection group "drafts" by ID
        console.log("\n--- Collection Group 'drafts' ---");
        const draftsSnap = await db.collectionGroup("drafts").get();
        for (const doc of draftsSnap.docs) {
            const data = doc.data();
            if (doc.id === "44" || data.draftId === "44" || data.resumeId === 44) {
                console.log(`FOUND in ${doc.ref.path}:`);
                console.log(JSON.stringify(data, null, 2));
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

inspectResume44().then(() => process.exit(0));
