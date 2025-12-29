# Email Service Troubleshooting Guide

## Overview

This guide documents the email service configuration and troubleshooting process for SwitchCV. The email service uses Gmail SMTP for transactional emails (welcome emails, recruiter requests, notifications, etc.).

## Architecture

- **SMTP Provider**: Gmail (smtp.gmail.com:587)
- **From Address**: SwitchCV <switchcvs@gmail.com>
- **Firebase Functions**: Handles email sending via nodemailer
- **Configuration**: Legacy functions.config() API (deprecated, migrate to env vars by March 2026)

## Quick Health Check

### 1. Test SMTP Connection

```bash
cd functions
node -e "
const nodemailer = require('nodemailer');
(async () => {
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: 'switchcvs@gmail.com', pass: process.env.SMTP_PASS }
  });
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful');
  } catch (err) {
    console.error('❌ SMTP failed:', err.message);
  }
})();
"
```

### 2. Send Test Email

```bash
cd functions
node -e "
const nodemailer = require('nodemailer');
(async () => {
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: 'switchcvs@gmail.com', pass: process.env.SMTP_PASS }
  });
  try {
    const info = await transporter.sendMail({
      from: 'SwitchCV <switchcvs@gmail.com>',
      to: 'support@switchcv.com',
      subject: 'SMTP Test',
      text: 'Test email sent at ' + new Date().toISOString()
    });
    console.log('✅ Email sent:', info.messageId);
  } catch (err) {
    console.error('❌ Send failed:', err.message);
  }
})();
"
```

### 3. Check Firebase Functions Logs

```bash
firebase functions:log --limit 50 --only emailFunctions
```

## Common Issues & Solutions

### Issue: Authentication Failed (535 Error)

**Symptoms**: `Error: Invalid login: 535 5.7.8 Error: authentication failed`
**Cause**: Incorrect SMTP credentials or account issues
**Solutions**:

1. Verify Gmail App Password is correct and active
2. Check if 2FA is enabled on Google account
3. Regenerate App Password if expired
4. Ensure account isn't locked/suspended

### Issue: Email Not Received

**Symptoms**: No emails in inbox despite successful send
**Possible Causes**:

1. **Spam/Junk Folder**: Check spam folder
2. **Domain Reputation**: Gmail may filter based on sending patterns
3. **Rate Limiting**: Gmail has sending limits (500/day for free accounts)
4. **Recipient Filters**: Check recipient's spam settings

### Issue: Functions Config Not Updated

**Symptoms**: Email service uses old credentials after deployment
**Solution**:

```bash
# For dev environment
firebase use dev
firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="587" smtp.user="switchcvs@gmail.com" smtp.pass="[APP_PASSWORD]"

# For prod environment
firebase use prod
firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="587" smtp.user="switchcvs@gmail.com" smtp.pass="[APP_PASSWORD]"

# Deploy
firebase deploy --only functions
```

### Issue: Environment Variables Not Quoted

**Symptoms**: Shell parsing errors when sourcing .env files
**Solution**: Always quote passwords in .env files:

```dotenv
SMTP_PASS='your_app_password_here'
```

## Configuration Files

### Firebase Functions Config (Legacy)

```bash
firebase functions:config:set smtp.host="smtp.gmail.com"
firebase functions:config:set smtp.port="587"
firebase functions:config:set smtp.user="switchcvs@gmail.com"
firebase functions:config:set smtp.pass="[APP_PASSWORD]"
```

### Environment Variables (Future - v7 Migration)

```dotenv
USE_LEGACY_CONFIG=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=switchcvs@gmail.com
SMTP_PASS=your_app_password_here
```

## Deployment Checklist

### Pre-Deployment

- [ ] Run `npm run lint` - no errors
- [ ] Run `npm test` - all tests pass
- [ ] Test SMTP connection locally
- [ ] Send test email to support@switchcv.com

### Deployment Steps

```bash
# Dev deployment
npm run env:dev
firebase functions:config:set smtp.pass="[APP_PASSWORD]"
firebase deploy --only functions

# Prod deployment
./scripts/deploy-prod.sh
```

### Post-Deployment

- [ ] Check Firebase Functions logs for errors
- [ ] Test email functionality (user signup, contact form)
- [ ] Verify emails arrive at support@switchcv.com
- [ ] Monitor error rates in Firebase Console

## Gmail App Password Setup

1. Enable 2FA on Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate password for "Mail" application
4. Use the 16-character password (not your regular password)

## Monitoring

### Firebase Console

- Functions → Logs → Filter by function name
- Functions → Metrics → Error rate, execution time
- Check for circuit breaker activations

### Email Delivery Monitoring

- Check support@switchcv.com inbox regularly
- Monitor bounce rates and spam complaints
- Review Firebase Functions logs for sendEmail calls

## Emergency Procedures

### If Email Service Completely Down

1. Check SMTP credentials validity
2. Verify Gmail account status
3. Test with different App Password
4. Consider temporary fallback to alternative SMTP provider

### Rollback

```bash
git checkout [previous_commit]
firebase deploy --only functions
```

## Future Improvements

### Migrate to Environment Variables

The current setup uses deprecated `functions.config()`. Migrate to environment variables:

1. Set `USE_LEGACY_CONFIG=false` in functions/.env
2. Move SMTP config to environment variables
3. Update ConfigLoader to use process.env
4. Test thoroughly before production deployment

### Alternative SMTP Providers

Consider these for higher reliability:

- SendGrid (free tier: 100 emails/day)
- Mailgun (free tier: 5,000 emails/month)
- AWS SES (pay per use, high deliverability)

## Key Files to Monitor

- `functions/src/services/emailService.ts` - Main email service
- `functions/src/lib/configLoader.ts` - Configuration loading
- `functions/.env` - Environment variables
- `.env.dev` - Development environment
- `firebase.json` - Firebase configuration

## Prevention Measures

1. **Regular Testing**: Test email service weekly
2. **Credential Rotation**: Rotate App Passwords quarterly
3. **Monitoring Alerts**: Set up alerts for email failures
4. **Documentation**: Keep this guide updated
5. **Backup Provider**: Have alternative SMTP ready

## Contact Information

For email service issues:

- Check Firebase Functions logs first
- Test SMTP connection manually
- Verify credentials and account status
- Escalate to development team if needed

---

**Last Updated**: December 28, 2025
**Issue Resolved**: Gmail SMTP authentication and configuration
**Prevention**: Regular credential validation and monitoring
