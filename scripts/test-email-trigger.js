
const admin = require('firebase-admin');

// Initialize Firebase Admin with default credentials AND explicit project ID
try {
    admin.initializeApp({
        projectId: 'switchcv-dev'
    });
} catch (e) {
    console.error("Failed to initialize admin:", e);
}

const db = admin.firestore();

async function sendTestEmail() {
    const mailCollection = 'mail';
    const recipient = 'support@switchcv.com';

    console.log(`Preparing to send test email to ${recipient} (Project: switchcv-dev)...`);

    try {
        const docRef = await db.collection(mailCollection).add({
            to: recipient,
            message: {
                subject: 'Gmail Restoration Verification - ' + new Date().toISOString(),
                text: 'This email is sent via Gmail SMTP to verify delivery to your Titan inbox.',
                html: '<p>This email is sent via <strong>Gmail SMTP</strong> to verify delivery to your Titan inbox.</p>'
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Successfully wrote to mail collection. Document ID: ${docRef.id}`);
    } catch (error) {
        console.error('Error writing to Firestore:', error);
    }
}

sendTestEmail();
