# Backend Services Quick Reference

## 🚀 Quick Start (5 minutes)

### 1. Setup Email (1 minute)

```bash
# Get Gmail app password from myaccount.google.com/apppasswords
# Add to functions/.env:
GMAIL_USER=noreply@switchcv.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
WEBSITE_URL=https://switchcv.com
```

### 2. Install & Deploy (2 minutes)

```bash
cd functions
npm install nodemailer @types/nodemailer
npm run build
cd ..
firebase deploy --only functions,firestore:rules
```

### 3. Test It (2 minutes)

```bash
firebase functions:shell
> const { emailService } = await import('./src/services/emailService');
> await emailService.sendEmail({
    to: 'test@gmail.com',
    template: 'welcomeEmail',
    data: { firstName: 'John' }
  })
```

---

## 📧 Email Service Cheatsheet

### Send Email

```typescript
import { emailService } from "@/services/emailService";

await emailService.sendEmail({
  to: "user@example.com",
  template: "welcomeEmail",
  data: { firstName: "John", onboardingUrl: "..." },
});
```

### Available Templates

| Template            | Use Case               | Required Data                                |
| ------------------- | ---------------------- | -------------------------------------------- |
| `welcomeEmail`      | New user signup        | firstName, onboardingUrl                     |
| `recruiterRequest`  | Recruiter wants access | companyName, position, message, dashboardUrl |
| `requestApproved`   | Approval notification  | candidateName, profileUrl                    |
| `requestDenied`     | Denial notification    | dashboardUrl                                 |
| `profileViewed`     | Weekly digest          | viewCount, dashboardUrl                      |
| `passwordReset`     | Password reset         | resetLink                                    |
| `adminNotification` | Admin alert            | alertType, details, adminUrl                 |

### Send Bulk Emails

```typescript
await emailService.sendBulkEmails(
  ["email1@example.com", "email2@example.com"],
  "profileViewed",
  { viewCount: 5, dashboardUrl: "..." }
);
```

---

## 🔐 Audit Logging Cheatsheet

### Log Actions in Backend

```typescript
import { auditLogger, AuditAction } from "@/services/auditLogger";

// Log user creation
await auditLogger.logUserCreated(userId, email, { firstName: "John" });

// Log profile access
await auditLogger.logProfileAccessed(userId, profileId, "recruiter");

// Log recruiter request
await auditLogger.logRecruiterRequest(
  requestId,
  recruiterId,
  candidateId,
  AuditAction.RECRUITER_REQUEST_CREATED
);

// Custom log
await auditLogger.log({
  userId,
  action: AuditAction.USER_UPDATED,
  resourceType: ResourceType.USER,
  resourceId: userId,
  status: "success",
});
```

### Log Actions in Frontend

```typescript
"use client";

import { useAuditLog } from "@/hooks/useAuditLog";

const { logProfileView, logSearch, logRequestSent } = useAuditLog();

// Log profile view
await logProfileView(profileId, { viewDuration: 30 });

// Log search
await logSearch("software engineer", { location: "NYC" });

// Log request sent
await logRequestSent(requestId, candidateId);
```

### Query Audit Logs

```typescript
// Get user's logs
const logs = await auditLogger.getUserAuditLogs(userId, 50);

// Get resource logs
const logs = await auditLogger.getResourceAuditLogs(
  resourceId,
  ResourceType.PROFILE
);

// Get date range
const logs = await auditLogger.getAuditLogsByDateRange(startDate, endDate);

// Export logs
const json = await auditLogger.exportAuditLogs(userId, "json");
const csv = await auditLogger.exportAuditLogs(userId, "csv");
```

---

## Cloud Functions Reference

```typescript
// These are automatically triggered:
onUserCreated          // → Welcome email
onRecruiterRequestCreated → Recruiter email
onRecruiterRequestApproved → Status email
sendProfileViewDigest  // → Weekly (Monday 9 AM)
cleanupAuditLogs       // → Daily (2 AM)
```

---

## Firestore Collections

### auditLogs

```javascript
{
  timestamp: Date,
  userId: string,
  action: AuditAction,
  resourceType: ResourceType,
  resourceId: string,
  status: 'success' | 'failure',
  details?: string,
  changes?: { before, after }
}
```

### emailLogs

```javascript
{
  timestamp: Date,
  userId: string,
  to: string,
  template: string,
  success: boolean,
  error?: string
}
```

### accessTokenAudit

```javascript
{
  timestamp: Date,
  recruiterId: string,
  userId: string,
  tokenId: string,
  action: AuditAction,
  details: string
}
```

---

## Audit Actions Enum

```typescript
// User
USER_CREATED, USER_UPDATED, USER_DELETED, USER_ROLE_CHANGED;

// Auth
LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PASSWORD_CHANGED, PASSWORD_RESET;

// Profile
PROFILE_ACCESSED, PROFILE_SHARED, PROFILE_PUBLISHED, PROFILE_UNPUBLISHED;

// Recruiter
RECRUITER_REQUEST_CREATED,
  RECRUITER_REQUEST_APPROVED,
  RECRUITER_REQUEST_DENIED,
  ACCESS_TOKEN_GENERATED,
  ACCESS_TOKEN_REVOKED;

// Email
EMAIL_SENT, EMAIL_FAILED, EMAIL_BOUNCED;

// Admin
ADMIN_ACTION,
  DATA_EXPORT,
  BULK_UPDATE,
  SUSPICIOUS_ACTIVITY,
  RATE_LIMIT_EXCEEDED;
```

---

## UI Components

### Settings Page

```typescript
import { SettingsPage } from "@/components/settings/NotificationAndAuditUI";

export function MySettings() {
  return <SettingsPage />;
}
```

### Just Notifications

```typescript
import { NotificationSettings } from "@/components/settings/NotificationAndAuditUI";

export function NotifyPrefs() {
  return <NotificationSettings />;
}
```

### Just Activity Log

```typescript
import { AuditLogViewer } from "@/components/settings/NotificationAndAuditUI";

export function ActivityLog() {
  return <AuditLogViewer />;
}
```

---

## Common Patterns

### Pattern: Log After Successful Operation

```typescript
try {
  await updateUserProfile(userId, data);
  await auditLogger.log({
    userId,
    action: AuditAction.USER_UPDATED,
    resourceType: ResourceType.USER,
    resourceId: userId,
    status: "success",
  });
} catch (error) {
  await auditLogger.log({
    userId,
    action: AuditAction.USER_UPDATED,
    resourceType: ResourceType.USER,
    resourceId: userId,
    status: "failure",
    details: error.message,
  });
}
```

### Pattern: Send Email + Log

```typescript
const result = await emailService.sendEmail({
  to: email,
  template: "welcomeEmail",
  data: { firstName },
});

if (result.success) {
  await auditLogger.logEmailSent(userId, email, "welcomeEmail", true);
} else {
  await auditLogger.logEmailSent(
    userId,
    email,
    "welcomeEmail",
    false,
    result.error
  );
}
```

### Pattern: Track User Action (Client)

```typescript
"use client";
const { logProfileView } = useAuditLog();

useEffect(() => {
  logProfileView(profileId, {
    duration: calculateDuration(),
    source: "search",
  });
}, [profileId]);
```

---

## Troubleshooting

### Email Not Sending

```bash
# Check logs
firebase functions:log -n 50

# Verify credentials
# 1. Gmail app password correct?
# 2. functions/.env updated?
# 3. Functions redeployed?
```

### Audit Logs Not Created

```bash
# Check Firestore rules deployed
firebase deploy --only firestore:rules

# Verify collection created in Firebase Console

# Check function logs for errors
firebase functions:log
```

### Template Variable Not Replaced

```typescript
// ✅ Correct:
data: { firstName: 'John', dashboardUrl: 'https://...' }

// ❌ Wrong:
data: { name: 'John' }  // Template expects 'firstName'
```

---

## Environment Variables

```bash
# functions/.env
GMAIL_USER=noreply@switchcv.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
WEBSITE_URL=https://switchcv.com
GEMINI_API_KEY=...existing...
HUGGINGFACE_TOKEN=...existing...
```

---

## Deployment Checklist

- [ ] Gmail app password created
- [ ] functions/.env updated
- [ ] `npm install nodemailer` in functions
- [ ] `firebase deploy --only functions`
- [ ] `firebase deploy --only firestore:rules`
- [ ] Check logs for errors
- [ ] Test email sending
- [ ] Verify audit logs created
- [ ] Test UI components
- [ ] Monitor for issues

---

## Performance Tips

- Email: Batch up to 1000 per call
- Audit logs: Query with limits (default 100)
- Cleanup: Automatic daily at 2 AM
- Retention: 90 days (configurable)

---

## Support Resources

1. **Full Docs**: `BACKEND_SERVICES.md`
2. **Implementation Guide**: `BACKEND_SERVICES_IMPLEMENTATION.md`
3. **Summary**: `BACKEND_SERVICES_SUMMARY.md`
4. **Firebase Docs**: https://firebase.google.com/docs
5. **Nodemailer**: https://nodemailer.com

---

## Quick Links

- Email Service: `functions/src/services/emailService.ts`
- Audit Logger: `functions/src/services/auditLogger.ts`
- Cloud Functions: `functions/src/emailFunctions.ts`
- React Hook: `src/hooks/useAuditLog.ts`
- UI Components: `src/components/settings/NotificationAndAuditUI.tsx`
- Firestore Rules: `firestore.rules`

---

## API Endpoints (Future)

```
POST /api/email/send          → Send email via HTTP
GET  /api/audit-logs          → Fetch user's audit logs
GET  /api/audit-logs/:userId  → Admin: fetch user logs
POST /api/data/export         → Export user data
POST /api/notifications/prefs → Update notification preferences
```

---

**Last Updated**: November 15, 2025  
**Version**: 1.0  
**Status**: Production Ready ✅
