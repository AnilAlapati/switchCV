# Backend Services Implementation Guide

## Quick Start

This guide shows how to implement and use the Email Notifications and Audit Logging services in your SwitchCV features.

## Table of Contents

1. [Setting Up Email Notifications](#setting-up-email-notifications)
2. [Implementing Audit Logging](#implementing-audit-logging)
3. [Common Patterns](#common-patterns)
4. [Testing](#testing)
5. [Deployment](#deployment)

---

## Setting Up Email Notifications

### Step 1: Configure Email Credentials

1. **Create Gmail App Password**

   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer" (or your device)
   - Generate a 16-character password
   - Copy this password

2. **Update Cloud Functions Config**

   ```bash
   cd functions
   ```

3. **Create or update `.env` file**

   ```
   GMAIL_USER=noreply@switchcv.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   WEBSITE_URL=https://switchcv.com
   ```

4. **Set Firebase Secrets**
   ```bash
   firebase functions:config:set gmail.user="noreply@switchcv.com" gmail.password="xxxx xxxx xxxx xxxx"
   ```

### Step 2: Install Dependencies

Add nodemailer to functions/package.json if not already there:

```bash
cd functions
npm install nodemailer @types/nodemailer
```

### Step 3: Test Email Sending

```typescript
// Test file: functions/test-email.ts
import { emailService } from "./src/services/emailService";

async function testEmail() {
  const result = await emailService.sendEmail({
    to: "test@example.com",
    template: "welcomeEmail",
    data: {
      firstName: "John",
      onboardingUrl: "https://switchcv.com/onboarding",
    },
  });

  console.log(result);
}

testEmail();
```

Run the test:

```bash
firebase functions:shell
> testEmail()
```

---

## Implementing Audit Logging

### Step 1: Add Audit Logger to Your Functions

```typescript
import { auditLogger, AuditAction, ResourceType } from "./services/auditLogger";

export const updateUserProfile = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User not authenticated"
      );
    }

    try {
      // Update user profile
      const userId = context.auth.uid;
      await updateUserInDatabase(userId, data);

      // Log the action
      await auditLogger.log({
        userId,
        action: AuditAction.USER_UPDATED,
        resourceType: ResourceType.USER,
        resourceId: userId,
        changes: {
          after: data,
        },
        status: "success",
      });

      return { success: true };
    } catch (error) {
      // Log failure
      await auditLogger.log({
        userId: context.auth.uid,
        action: AuditAction.USER_UPDATED,
        resourceType: ResourceType.USER,
        resourceId: context.auth.uid,
        details: error instanceof Error ? error.message : "Unknown error",
        status: "failure",
      });

      throw new functions.https.HttpsError(
        "internal",
        "Failed to update profile"
      );
    }
  }
);
```

### Step 2: Add Audit Logging to React Components

Use the `useAuditLog` hook in your components:

```typescript
"use client";

import { useAuditLog, ClientAuditAction } from "@/hooks/useAuditLog";

export function ProfileView({ profile }) {
  const { logProfileView } = useAuditLog();

  useEffect(() => {
    // Log that this profile was viewed
    logProfileView(profile.id, {
      viewDuration: 45,
      deviceType: "mobile",
    });
  }, [profile.id, logProfileView]);

  return (
    <div>
      <h1>{profile.name}</h1>
      {/* Profile content */}
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Trigger Email on Firestore Document Change

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { emailService } from "./services/emailService";
import { auditLogger } from "./services/auditLogger";

export const sendEmailOnProfilePublish = onDocumentCreated(
  "resumeProfiles/{profileId}",
  async (event) => {
    const profile = event.data?.data();
    const userId = profile.userId;

    if (!profile.published) return; // Only if published

    try {
      // Get user email
      const userSnap = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .get();
      const userEmail = userSnap.data()?.email;

      if (!userEmail) return;

      // Send email
      await emailService.sendEmail({
        to: userEmail,
        template: "profileViewed",
        data: {
          viewCount: 0,
          dashboardUrl: "https://switchcv.com/dashboard",
        },
      });

      // Log it
      await auditLogger.logProfileAccessed(userId, profile.id, "own");
    } catch (error) {
      console.error("Error sending profile publish email:", error);
    }
  }
);
```

### Pattern 2: Track User Actions with Audit Log

```typescript
"use client";

import { useState } from "react";
import { useAuditLog } from "@/hooks/useAuditLog";

export function SearchProfiles({ onSearch }) {
  const [query, setQuery] = useState("");
  const { logSearch } = useAuditLog();

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    // Log search action
    if (value.length > 0) {
      await logSearch(value, {
        timestamp: new Date(),
        source: "profile_search",
      });
    }

    onSearch(value);
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleSearch}
      placeholder="Search profiles..."
    />
  );
}
```

### Pattern 3: Custom Audit Action

```typescript
import { auditLogger } from "@/services/auditLogger";

async function logRecruiterActivityReport() {
  await auditLogger.log({
    userId: "recruiter-123",
    action: "RECRUITER_ACTIVITY_REPORT_GENERATED",
    resourceType: "REPORT",
    resourceId: "report-456",
    details: "Monthly recruiter activity report generated",
    metadata: {
      requestsProcessed: 25,
      approvalsGiven: 18,
      denialsSent: 7,
    },
    status: "success",
  });
}
```

### Pattern 4: Bulk Email with Audit Trail

```typescript
import { emailService } from "./services/emailService";
import { auditLogger } from "./services/auditLogger";

async function sendWeeklyDigestToActiveUsers() {
  // Get all active users
  const usersSnap = await admin
    .firestore()
    .collection("users")
    .where("isActive", "==", true)
    .limit(1000)
    .get();

  const emails = usersSnap.docs.map((doc) => doc.data().email).filter(Boolean);

  // Send bulk emails
  const results = await emailService.sendBulkEmails(emails, "weeklyDigest", {
    dashboardUrl: "https://switchcv.com/dashboard",
  });

  // Log each result
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const email = emails[i];
    const userDoc = usersSnap.docs.find((doc) => doc.data().email === email);

    await auditLogger.logEmailSent(
      userDoc?.id || "unknown",
      email,
      "weeklyDigest",
      result.success,
      result.error
    );
  }
}
```

---

## Testing

### Unit Testing Email Service

```typescript
// functions/test/emailService.test.ts
import { emailService } from "../src/services/emailService";

describe("EmailService", () => {
  it("should send welcome email", async () => {
    const result = await emailService.sendEmail({
      to: "test@example.com",
      template: "welcomeEmail",
      data: {
        firstName: "John",
        onboardingUrl: "https://switchcv.com/onboarding",
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it("should handle template not found", async () => {
    const result = await emailService.sendEmail({
      to: "test@example.com",
      template: "nonExistent" as any,
      data: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
```

### Unit Testing Audit Logger

```typescript
// functions/test/auditLogger.test.ts
import {
  auditLogger,
  AuditAction,
  ResourceType,
} from "../src/services/auditLogger";

describe("AuditLogger", () => {
  it("should log user creation", async () => {
    const logId = await auditLogger.logUserCreated(
      "user-123",
      "user@example.com",
      { firstName: "John" }
    );

    expect(logId).toBeDefined();

    // Verify log was created
    const logs = await auditLogger.getUserAuditLogs("user-123", 1);
    expect(logs[0].action).toBe(AuditAction.USER_CREATED);
  });

  it("should retrieve logs by date range", async () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    const logs = await auditLogger.getAuditLogsByDateRange(startDate, endDate);

    expect(Array.isArray(logs)).toBe(true);
  });
});
```

### Integration Testing

```typescript
// functions/test/integration.test.ts
import * as firebase from "@firebase/testing";

describe("Email and Audit Integration", () => {
  let db: firebase.firestore.Firestore;

  beforeEach(() => {
    db = firebase.initializeTestApp().firestore();
  });

  afterEach(() => {
    firebase.clearFirestoreData();
  });

  it("should log email send and audit event together", async () => {
    const userId = "test-user";
    const email = "test@example.com";

    // Send email and log it
    const result = await emailService.sendEmail({
      to: email,
      template: "welcomeEmail",
      data: { firstName: "Test" },
    });

    await auditLogger.logEmailSent(
      userId,
      email,
      "welcomeEmail",
      result.success
    );

    // Verify audit log was created
    const logs = await auditLogger.getUserAuditLogs(userId, 1);
    expect(logs[0].action).toBe("EMAIL_SENT");
  });
});
```

---

## Deployment

### Step 1: Prepare Functions

```bash
cd functions
npm run build
npm test
```

### Step 2: Deploy to Firebase

```bash
# Deploy only Cloud Functions
firebase deploy --only functions

# Or with specific functions
firebase deploy --only "functions:onUserCreated,functions:onRecruiterRequestCreated"
```

### Step 3: Verify Deployment

```bash
# Check function status
firebase functions:list

# View recent logs
firebase functions:log --limit 50

# Check specific function
firebase functions:log onUserCreated --limit 20
```

### Step 4: Update Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### Step 5: Monitor in Console

Go to [Firebase Console](https://console.firebase.google.com/) → Functions → Logs to monitor function execution and errors.

---

## Troubleshooting Checklist

- [ ] Gmail App Password is correct and updated
- [ ] Email templates are spelled correctly
- [ ] Firestore rules are deployed
- [ ] Cloud Functions are deployed
- [ ] Check function logs for errors
- [ ] Verify database initialization in functions
- [ ] Test with development email before production
- [ ] Audit logs collection exists and is accessible
- [ ] Environment variables are set correctly
- [ ] Node.js version matches requirements

---

## Next Steps

1. **Implement in Your Features**

   - Add audit logging to profile updates
   - Add email notifications to recruiter requests
   - Add notification preferences to settings

2. **Monitor and Optimize**

   - Check email delivery rates
   - Monitor audit log storage
   - Optimize email templates based on engagement

3. **Enhance Features**

   - Add SMS notifications (optional)
   - Add in-app notifications
   - Build admin dashboard for audit logs

4. **Security Hardening**
   - Implement rate limiting for emails
   - Add email verification
   - Add suspicious activity detection

---

## Support & Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Nodemailer Documentation**: https://nodemailer.com
- **Firestore Security Rules**: https://firebase.google.com/docs/firestore/security/start
- **Project README**: See main README.md for overall architecture
