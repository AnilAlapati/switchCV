# User Approval System

> **Simple Token-Based Approval - No Admin Dashboard Required**  
> **Version:** 2.0.0  
> **Last Updated:** February 2, 2026

## Overview

The User Approval System allows you to manually approve new registrations during MVP. **No admin login or dashboard required** - approve/decline directly from email buttons using secure one-time tokens.

## How It Works

1. **User signs up** → Approval request created
2. **Admin receives email** with Approve/Decline buttons
3. **Admin clicks button** in email → Action completed instantly
4. **User receives next email** (verification or decline notification)

**Key benefit:** Zero admin overhead - no dashboards, no logins, just click a button in your email.

## Setup

### 1. Enable in Firestore

Go to Firebase Console → Firestore → `config/system` document:

```json
{
  "userApproval": {
    "enabled": true,
    "adminEmail": "support@switchcv.com",
    "declineReason": "We appreciate your interest in SwitchCV. Unfortunately, we are unable to approve your registration at this time. Please contact support@switchcv.com for more information.",
    "autoApproveDomains": []
  }
}
```

### 2. Configuration Options

| Field                | Type    | Purpose                                                                    |
| -------------------- | ------- | -------------------------------------------------------------------------- |
| `enabled`            | boolean | `true` = manual approval required<br>`false` = instant verification emails |
| `adminEmail`         | string  | Where approval request emails are sent                                     |
| `declineReason`      | string  | Message shown to declined users                                            |
| `autoApproveDomains` | array   | Domains that skip approval (e.g., `["yourcompany.com"]`)                   |

### 3. Auto-Approve Trusted Domains (Optional)

```json
{
  "userApproval": {
    "enabled": true,
    "adminEmail": "support@switchcv.com",
    "autoApproveDomains": ["yourcompany.com", "partnerdomain.com"]
  }
}
```

Users from these domains get instant verification emails.

## Admin Email Example

When a user signs up, you receive:

```
Subject: New User Registration Approval - jane@example.com

─────────────────────────────
NEW USER REGISTRATION

Name: Jane Doe
Email: jane@example.com
Username: janedoe
User ID: abc123xyz
Registered: Feb 2, 2026 10:30 AM
─────────────────────────────

[✓ Approve User]  [✗ Decline]
```

**Click once** → Done. No login required.

## User Experience

### Scenario A: Pending Approval

User receives:

```
Subject: SwitchCV - Registration Received

Thank you for registering!

Your registration is currently under review. We'll send you a
verification email once approved (usually within 24 hours).
```

### Scenario B: Approved

After admin clicks "Approve", user receives:

```
Subject: Verify Your SwitchCV Account

Great news! Your registration has been approved.

[Verify Email Address]

(Link expires in 24 hours)
```

### Scenario C: Declined

User receives:

```
Subject: SwitchCV Registration Update

{Your custom decline reason from config}

Questions? Contact support@switchcv.com
```

## Security Features

- **One-time tokens**: Each approve/decline button uses a unique SHA-256 hashed token
- **Expiration**: Links expire after 7 days
- **No authentication needed**: Security is in the token itself
- **Public endpoints**: `/api/user-approval/approve` and `/api/user-approval/decline`
- **Firestore verification**: Token hash validated against stored hash before any action

## Technical Details

### Token Format

```
approve_requestId_64CharRandomHex
```

Example:

```
approve_abc123_f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3
```

### Firestore Schema

**Collection:** `userApprovalRequests`

```javascript
{
  userId: "firebase-auth-uid",
  email: "user@example.com",
  firstName: "Jane",
  username: "janedoe",
  status: "pending" | "approved" | "declined",
  approveTokenHash: "sha256-hash",
  approveTokenExpiresAt: Timestamp,
  declineTokenHash: "sha256-hash",
  declineTokenExpiresAt: Timestamp,
  createdAt: Timestamp,
  processedAt: Timestamp | null
}
```

### API Endpoints

**Approve:**

```
GET /api/user-approval/approve?token=SECURE_TOKEN
```

**Decline:**

```
GET /api/user-approval/decline?token=SECURE_TOKEN
```

Both endpoints:

- Validate token against stored hash
- Check expiration (7 days)
- Update Firestore documents
- Send appropriate email to user
- Return HTML success/error page

### Cloud Function Integration

The `onUserCreated` trigger:

1. Checks `userApproval.enabled` in config
2. Checks if email domain is in `autoApproveDomains`
3. If manual approval needed:
   - Generates two secure tokens (approve + decline)
   - Stores hashes in Firestore
   - Emails admin with token-based links
   - Emails user "pending" notification
4. If auto-approved or disabled:
   - Sends verification email directly

## Troubleshooting

### Email not received

**Admin email:**

- Check `userApproval.adminEmail` in Firestore config
- Check spam folder
- Verify Firebase Trigger Email extension is configured

**User email:**

- Check Firebase `mail` collection in Firestore
- Verify SMTP settings in Firebase config

### Token expired/invalid

Tokens expire after 7 days. Admin must:

1. Check Firestore for the user's approval request
2. Manually update status or resend approval email via Cloud Functions console

### How to disable the system

Set `userApproval.enabled: false` in Firestore:

```javascript
// Firebase Console → Firestore → config/system
{
  "userApproval": {
    "enabled": false  // ← Users get instant verification emails
  }
}
```

### How to check pending approvals

Query Firestore:

```javascript
// Collection: userApprovalRequests
// Filter: status == "pending"
```

Or check your email inbox for approval request emails.

## Best Practices

1. **Check email regularly** during MVP phase
2. **Set realistic auto-reply expectations** if approval takes >24hrs
3. **Use auto-approve domains** for trusted partners/beta testers
4. **Customize decline reason** to match your brand voice
5. **Monitor** the `userApprovalRequests` collection size - clean up old requests periodically

## Migration from Admin Dashboard Version

If you previously had admin dashboard endpoints, they've been removed. The new token-based system:

- ✅ No admin authentication needed
- ✅ Works from any device (just check email)
- ✅ Simpler codebase (no role management)
- ✅ More secure (one-time tokens vs. persistent auth)

Old files removed:

- `/src/app/admin/user-approvals/page.tsx` (dashboard)
- `/src/app/api/admin/user-approval/**` (authenticated endpoints)

New files:

- `/src/app/api/user-approval/approve/route.ts` (public, token-based)
- `/src/app/api/user-approval/decline/route.ts` (public, token-based)
- `/src/lib/utils/approval-tokens.ts` (token utilities)

## Support

Questions? Check:

- Firebase Console → Firestore → `config/system` (current settings)
- Firebase Console → Firestore → `userApprovalRequests` (pending requests)
- Firebase Console → Firestore → `mail` (email delivery status)

For issues, contact the development team or file a GitHub issue.
