const nodemailer = require('nodemailer');

// Gmail SMTP Configuration
// NOTE: You need a Gmail App Password (not your regular password)
// 1. Enable 2FA on your Google account
// 2. Go to: https://myaccount.google.com/apppasswords
// 3. Create an app password for "Mail"
// 4. Replace 'YOUR_APP_PASSWORD' below with the 16-character password

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'switchcvs@gmail.com',
    pass: process.env.SMTP_PASS || 'REPLACE_ME_SMTP_PASS' // Supply via env when testing
  }
};

const transporter = nodemailer.createTransport({
  ...SMTP_CONFIG,
  debug: true,
  logger: true
});

async function verify() {
  try {
    console.log('Verifying Gmail SMTP connection...');
    console.log('Host:', SMTP_CONFIG.host);
    console.log('Port:', SMTP_CONFIG.port);
    console.log('User:', SMTP_CONFIG.auth.user);
    console.log('');

    await transporter.verify();
    console.log('✅ Gmail SMTP connection successful!');

    // Optionally send a test email
    const sendTest = process.argv.includes('--send-test');
    if (sendTest) {
      console.log('\nSending test email...');
      const recipient = process.argv[3] || 'switchcvs@gmail.com'; // Can pass custom recipient
      console.log('Sending to:', recipient);
      const info = await transporter.sendMail({
        from: '"SwitchCV" <switchcvs@gmail.com>',
        to: recipient,
        subject: 'SwitchCV SMTP Test',
        text: 'If you receive this, Gmail SMTP is working correctly!',
        html: '<h1>✅ SMTP Working!</h1><p>If you receive this, Gmail SMTP is configured correctly.</p>'
      });
      console.log('✅ Test email sent! Message ID:', info.messageId);
    } else {
      console.log('\nTip: Run with --send-test to send a test email');
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Make sure you:');
      console.error('   1. Have 2FA enabled on your Google account');
      console.error('   2. Created an App Password at https://myaccount.google.com/apppasswords');
      console.error('   3. Used the 16-character App Password (not your Gmail password)');
    }
  }
}

verify();
