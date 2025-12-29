const admin = require('firebase-admin');

// Initialize Firebase Admin with dev project
admin.initializeApp({
    projectId: 'switchcv-dev'
});

const db = admin.firestore();

async function sendTestEmail() {
    try {
        const timestamp = new Date().toISOString();
        const testEmailDoc = await db.collection('mail').add({
            to: ['support@switchcv.com'],
            from: 'SwitchCV <switchcvs@gmail.com>',
            replyTo: 'switchcvs@gmail.com',
            message: {
                subject: 'Test Email - Delivery Verification',
                text: `This is a test email to verify email delivery is working correctly.\n\nTimestamp: ${timestamp}\nEnvironment: Development`,
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #667eea;">Email Delivery Test</h2>
            <p>This is a test email to verify that email delivery is working correctly.</p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <p><strong>Environment:</strong> Development</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">SwitchCV Email System</p>
          </div>
        `
            }
        });

        console.log('✓ Test email queued successfully!');
        console.log('Document ID:', testEmailDoc.id);
        console.log('Monitor this in Firebase logs');
        process.exit(0);
    } catch (error) {
        console.error('✗ Error sending test email:', error);
        process.exit(1);
    }
}

sendTestEmail();
