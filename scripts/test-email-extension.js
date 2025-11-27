const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
  projectId: 'switchcv-e5136'
});

const db = admin.firestore();

async function sendTestEmail() {
  const recipient = process.argv[2] || 'support@switchcv.com';
  
  console.log('Sending test email via Firebase Extension...');
  console.log('Recipient:', recipient);
  
  try {
    const docRef = await db.collection('mail').add({
      to: recipient,
      message: {
        subject: 'SwitchCV Email Extension Test',
        text: 'This email was sent via Firebase Extension with Gmail SMTP!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #10B981;">✅ Firebase Email Extension Working!</h1>
            <p>This email was sent via the <strong>firestore-send-email</strong> extension using Gmail SMTP.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">
              Timestamp: ${new Date().toISOString()}<br/>
              From: switchcvs@gmail.com
            </p>
          </div>
        `
      }
    });
    
    console.log('✅ Email document created with ID:', docRef.id);
    console.log('');
    console.log('The extension will process this and send the email shortly.');
    console.log('Check the Firestore document for delivery status updates.');
    
    // Wait a moment and check the status
    console.log('\nWaiting 5 seconds to check delivery status...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const doc = await db.collection('mail').doc(docRef.id).get();
    const data = doc.data();
    
    if (data.delivery) {
      console.log('\nDelivery Status:', JSON.stringify(data.delivery, null, 2));
    } else {
      console.log('\nDelivery status not yet available. Check Firestore console.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

sendTestEmail();
