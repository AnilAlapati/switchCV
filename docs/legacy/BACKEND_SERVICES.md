# Backend Services Documentation

## Overview

This documentation covers the Email Notifications and Audit Logging services implemented for SwitchCV. These low-priority backend services provide essential compliance, security, and communication features.

## Table of Contents

1. [Email Notifications Service](#email-notifications-service)
2. [Audit Logging Service](#audit-logging-service)
3. [Integration Guide](#integration-guide)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)

---

## Email Notifications Service

### Features

The Email Notifications Service handles all email communications between users and recruiters, and sends important notifications to users.

#### Email Templates

1. **Recruiter Request** (`recruiterRequest`)

   - Sent when a recruiter requests access to a candidate's profile
   - Contains recruiter company, position, and message
   - Includes link to review request in dashboard

2. **Request Approved** (`requestApproved`)

   - Sent to recruiter when their access request is approved
   - Contains candidate name and link to view profile
   - Includes access validity period (30 days)

3. **Request Denied** (`requestDenied`)

   - Sent to recruiter when their access request is denied
   - Encourages follow-up with personalized message
   - Links back to dashboard

4. **Profile Viewed** (`profileViewed`)

   - Sent weekly to users who received profile views
   - Contains view count for the week
   - Links to analytics dashboard

5. **Password Reset** (`passwordReset`)

   - Sent when user initiates password reset
   - Contains reset link (valid for 1 hour)
   - Security note about ignoring if not requested

6. **Welcome Email** (`welcomeEmail`)

   - Sent to new users upon registration
   - Outlines key features and next steps
   - Guides user to complete their profile

7. **Admin Notification** (`adminNotification`)
   - Sent to admins for suspicious activity
   - Contains activity type and details
   - Links to admin security dashboard

### Service Usage

```typescript
import { emailService } from "@/services/emailService";

// Send a single email
const result = await emailService.sendEmail({
  to: "user@example.com",
  template: "recruiterRequest",
  data: {
    companyName: "TechCorp",
    position: "Senior Engineer",
    message: "We have a great opportunity...",
    dashboardUrl: "https://switchcv.com/dashboard",
  },
});

// Send bulk emails
const results = await emailService.sendBulkEmails(
  ["user1@example.com", "user2@example.com"],
  "profileViewed",
  {
    viewCount: 5,
    dashboardUrl: "https://switchcv.com/dashboard/analytics",
  }
);

// Verify email configuration
const isConfigured = await emailService.verifyConnection();
```

### Cloud Functions

#### `onUserCreated`

- **Trigger**: When a new user is created in Firebase Auth
- **Action**: Sends welcome email to the new user
- **Logs**: Email sent event to audit logs

#### `onRecruiterRequestCreated`

- **Trigger**: When a new recruiter request document is created
- **Action**: Sends email to candidate about recruiter request
- **Logs**: Recruiter request creation to audit logs

#### `onRecruiterRequestApproved`

- **Trigger**: When recruiter request status changes to approved/denied
- **Action**: Sends status update email to recruiter
- **Logs**: Request approval/denial to audit logs

#### `sendProfileViewDigest`

- **Trigger**: Every Monday at 9:00 AM EST
- **Action**: Sends weekly profile view summary to all users
- **Logs**: Digest email sent events

#### `notifyAdminSuspiciousActivity`

- **Trigger**: Called via HTTPS when suspicious activity detected
- **Action**: Notifies all admins about security concern
- **Logs**: Suspicious activity event

---

## Audit Logging Service

### Features

The Audit Logging Service tracks all important system events for compliance, security, and debugging purposes.

#### Audit Actions

**User Actions**

- `USER_CREATED` - New user registered
- `USER_UPDATED` - User profile modified
- `USER_DELETED` - User account deleted
- `USER_ROLE_CHANGED` - User role modified

**Authentication**

- `LOGIN_SUCCESS` - Successful login
- `LOGIN_FAILED` - Failed login attempt
- `LOGOUT` - User logout
- `PASSWORD_CHANGED` - Password changed
- `PASSWORD_RESET` - Password reset initiated

**Profile Access**

- `PROFILE_ACCESSED` - Profile was viewed
- `PROFILE_SHARED` - Profile shared with someone
- `PROFILE_PUBLISHED` - Profile made public
- `PROFILE_UNPUBLISHED` - Profile made private

**Recruiter Access**

- `RECRUITER_REQUEST_CREATED` - New recruiter request
- `RECRUITER_REQUEST_APPROVED` - Request approved by admin
- `RECRUITER_REQUEST_DENIED` - Request denied by candidate
- `ACCESS_TOKEN_GENERATED` - Access token created
- `ACCESS_TOKEN_REVOKED` - Access token revoked

**Email Actions**

- `EMAIL_SENT` - Email successfully sent
- `EMAIL_FAILED` - Email failed to send
- `EMAIL_BOUNCED` - Email bounced

**Admin Actions**

- `ADMIN_ACTION` - Admin performed an action
- `DATA_EXPORT` - User data exported
- `BULK_UPDATE` - Bulk operation performed

**Security**

- `SUSPICIOUS_ACTIVITY` - Suspicious activity detected
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded

### Service Usage

```typescript
import { auditLogger, AuditAction, ResourceType } from "@/services/auditLogger";

// Log a custom event
await auditLogger.log({
  userId: "user123",
  userEmail: "user@example.com",
  action: AuditAction.PROFILE_ACCESSED,
  resourceType: ResourceType.PROFILE,
  resourceId: "profile456",
  details: "Profile accessed as recruiter",
  status: "success",
});

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

// Get audit logs for a user
const logs = await auditLogger.getUserAuditLogs(userId, 100);

// Get audit logs for a resource
const resourceLogs = await auditLogger.getResourceAuditLogs(
  profileId,
  ResourceType.PROFILE
);

// Get logs for date range
const logs = await auditLogger.getAuditLogsByDateRange(
  startDate,
  endDate,
  AuditAction.LOGIN_SUCCESS
);

// Export audit logs
const jsonData = await auditLogger.exportAuditLogs(userId, "json");
const csvData = await auditLogger.exportAuditLogs(userId, "csv");

// Cleanup old logs (automatic daily at 2 AM)
const deletedCount = await auditLogger.cleanupOldLogs(90);
```

### Firestore Collections

#### `auditLogs`

- Documents tracking all important system events
- Indexed by `userId` and `timestamp`
- Retention: 90 days (automatic cleanup)
- Access: Admins can read all; Users can read their own

**Schema:**

```typescript
{
  timestamp: Date,
  userId: string,
  userEmail?: string,
  action: AuditAction,
  resourceType: ResourceType,
  resourceId: string,
  changes?: {
    before?: Record<string, any>,
    after?: Record<string, any>
  },
  status: 'success' | 'failure',
  details?: string,
  ipAddress?: string,
  userAgent?: string,
}
```

#### `emailLogs`

- Tracks all email sending attempts
- Contains template name and recipient info
- Helps debug delivery issues

#### `accessTokenAudit`

- Tracks all access token creations and revocations
- Records who generated tokens and when
- Logs all token usage attempts

---

## Integration Guide

### 1. Email Service Integration

#### In Cloud Functions

```typescript
import { emailService } from "./services/emailService";
import { auditLogger } from "./services/auditLogger";

export const myFunction = functions.https.onCall(async (data, context) => {
  try {
    const result = await emailService.sendEmail({
      to: data.email,
      template: "welcomeEmail",
      data: { firstName: data.name },
    });

    if (result.success) {
      await auditLogger.logEmailSent(
        context.auth.uid,
        data.email,
        "welcomeEmail",
        true
      );
    }

    return result;
  } catch (error) {
    console.error("Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to send email");
  }
});
```

#### In React Components

```typescript
"use client";

import { useAuditLog } from "@/hooks/useAuditLog";

export function ProfileCard({ profile }) {
  const { logProfileView } = useAuditLog();

  useEffect(() => {
    // Log that user viewed this profile
    logProfileView(profile.id, { viewDuration: 30 });
  }, [profile.id, logProfileView]);

  return <div>{profile.name}</div>;
}
```

### 2. Audit Logging Integration

#### Automatic Logging

Most audit events are automatically logged in Cloud Functions. However, you can manually log events:

```typescript
import { auditLogger, AuditAction } from "@/services/auditLogger";

// In any backend function
await auditLogger.logSuspiciousActivity(
  userId,
  "EXCESSIVE_API_CALLS",
  "User made 100 API calls in 1 minute"
);
```

#### Client-Side Audit Logging

Use the `useAuditLog` hook in React components:

```typescript
"use client";

import { useAuditLog, ClientAuditAction } from "@/hooks/useAuditLog";

export function SearchPage() {
  const { logSearch } = useAuditLog();

  const handleSearch = async (query, filters) => {
    await logSearch(query, filters);
    // Perform search...
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

---

## Configuration

### Environment Variables

#### For Email Service (Firebase Cloud Functions)

```bash
# functions/.env
GMAIL_USER=noreply@switchcv.com
GMAIL_APP_PASSWORD=your_app_password
WEBSITE_URL=https://switchcv.com
```

**Note**: Use Gmail App Passwords, not your regular Gmail password.

#### For Development

```bash
# .env.local (Next.js)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

### Firestore Rules

The following rules are already configured in `firestore.rules`:

```javascript
// Audit logs - only admins can read, backend can write
match /auditLogs/{logId} {
  allow read: if isAdmin();
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if false;
  allow update: if false;
  allow delete: if false;
}

// Email logs - similar to audit logs
match /emailLogs/{logId} {
  allow read: if isAdmin();
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if false;
  allow update: if false;
  allow delete: if false;
}
```

---

## API Reference

### EmailService

#### `sendEmail(options: EmailOptions): Promise<EmailResult>`

Sends a single email with a template.

**Parameters:**

- `options.to`: Recipient email address
- `options.template`: Email template name
- `options.data`: Data to interpolate in template

**Returns:**

- `success`: Boolean indicating success
- `messageId`: Email message ID (if successful)
- `error`: Error message (if failed)
- `timestamp`: When the email was sent

#### `sendBulkEmails(recipients, template, data): Promise<EmailResult[]>`

Sends emails to multiple recipients.

### AuditLogger

#### `log(entry): Promise<string>`

Logs a custom audit event.

**Returns:** Document ID of the audit log

#### `logUserCreated(userId, email, metadata)`

Convenience method for logging user creation.

#### `logProfileAccessed(userId, profileId, accessType)`

Convenience method for logging profile access.

#### `getUserAuditLogs(userId, limit): Promise<AuditLogEntry[]>`

Retrieves all audit logs for a user.

**Parameters:**

- `limit`: Maximum number of logs (default: 100)

#### `getResourceAuditLogs(resourceId, resourceType?, limit): Promise<AuditLogEntry[]>`

Retrieves audit logs for a specific resource.

#### `getAuditLogsByDateRange(startDate, endDate, action?): Promise<AuditLogEntry[]>`

Retrieves audit logs for a date range.

#### `exportAuditLogs(userId, format): Promise<string>`

Exports audit logs in JSON or CSV format.

**Parameters:**

- `format`: 'json' or 'csv' (default: 'json')

#### `cleanupOldLogs(retentionDays): Promise<number>`

Deletes audit logs older than specified days.

**Parameters:**

- `retentionDays`: Keep logs newer than this (default: 90)

---

## Security Considerations

1. **Sensitive Data**: Audit logs are encrypted at rest in Firestore
2. **Access Control**: Only admins and users can read their own audit logs
3. **Email Validation**: Email addresses are validated before sending
4. **Token Expiration**: Access tokens expire after 30 days
5. **Rate Limiting**: Implement rate limiting for email sending (future enhancement)
6. **GDPR Compliance**: Users can export their data and request deletion
7. **Retention Policy**: Audit logs are automatically deleted after 90 days

---

## Troubleshooting

### Email Not Sending

1. **Check Gmail Configuration**

   ```bash
   firebase functions:log --limit 50
   ```

   Look for "Email service configuration error"

2. **Verify App Password**

   - Create a new App Password in Google Account settings
   - Update `.env` file in functions directory
   - Redeploy functions: `firebase deploy --only functions`

3. **Check Email Template**
   - Ensure template name matches exactly
   - Verify data object contains all required variables

### Audit Logs Not Recording

1. **Check Firestore Rules**

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Verify Backend Service**

   - Check audit logger initialization
   - Ensure `admin.initializeApp()` is called before using auditLogger

3. **Monitor Logs**
   ```bash
   firebase functions:log --limit 100
   ```

---

## Future Enhancements

1. **Email Provider Integration**

   - SendGrid for better deliverability
   - Mailgun for advanced features
   - Postmark for transactional emails

2. **Analytics**

   - Email open rates
   - Click tracking
   - Bounce handling

3. **Rate Limiting**

   - Prevent email flooding
   - Per-user limits
   - Per-recipient limits

4. **Audit Log Analysis**

   - Anomaly detection
   - Security reports
   - Compliance dashboards

5. **Notification Center**
   - In-app notifications
   - SMS notifications
   - Push notifications

---

## Support

For issues or questions about the Email Notifications and Audit Logging services:

1. Check the troubleshooting section above
2. Review Firebase functions logs
3. Check Firestore rules configuration
4. Consult the main project README
