
const admin = require('firebase-admin');

// Initialize Firebase Admin with explicit project ID for local dev
try {
    admin.initializeApp({
        projectId: 'switchcv-dev'
    });
} catch {
    // Ignore if already initialized 
}

const db = admin.firestore();

async function checkLatestMail() {
    const mailCollection = 'mail';

    try {
        const snapshot = await db.collection(mailCollection)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log("No documents found in mail collection.");
            return;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        console.log(`Latest Document ID: ${doc.id}`);
        console.log(`Created At: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
        console.log(`To: ${data.to}`);
        console.log(`Delivery Status:`, JSON.stringify(data.delivery, null, 2));

        if (data.delivery && data.delivery.state === 'SUCCESS') {
            console.log("✅ Email successfully delivered by extension.");
        } else if (data.delivery && data.delivery.state === 'ERROR') {
            console.log("❌ Email delivery failed.");
            console.log("Error:", JSON.stringify(data.delivery.error, null, 2));
        } else {
            console.log("⏳ Email pending or processing...");
        }

    } catch (error) {
        console.error('Error reading Firestore:', error);
    }
}

checkLatestMail();
