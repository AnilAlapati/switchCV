# Feedback / Contact Page Feature

## Overview

The `/contact` page provides users with a direct channel to submit feedback, bug reports, feature requests, and support inquiries. All submissions are delivered to the team's support inbox (`support@switchcv.com`) via **Firebase Trigger Email extension**.

**Hybrid Authentication**: The page is publicly accessible (no login required), but if the user is logged in, their account information is automatically attached to the feedback for better context.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    /contact (src/app/contact/page.tsx)          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Form Fields:                                               │ │
│  │  • Name (optional)                                          │ │
│  │  • Email (required)                                         │ │
│  │  • Category: bug | idea | data | billing | other            │ │
│  │  • Urgency: low | normal | urgent                           │ │
│  │  • Message (min 20 chars)                                   │ │
│  │  • Contact permission checkbox                              │ │
│  │                                                              │ │
│  │  [useAuth hook checks if user is logged in]                 │ │
│  │  → If logged in: attaches Bearer token to request           │ │
│  │  → If anonymous: proceeds without auth header               │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ POST /api/contact/feedback
                            │ (+ optional Authorization header)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Route                                │
│              src/app/api/contact/feedback/route.ts              │
│  • Parses request body                                          │
│  • Extracts metadata (IP, User-Agent)                           │
│  • Extracts auth token (if present)                             │
│  • Fetches user info from Firestore (if authenticated)          │
│  • Calls supportFeedbackService with authenticatedUser          │
│  • Returns success response with reference ID                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                               │
│           src/lib/services/supportFeedbackService.ts            │
│  • Validates payload (email, message, category, urgency)        │
│  • Builds HTML email with metadata + authenticated user section │
│  • Writes to Firestore `mail` collection                        │
│  • Generates unique reference ID (FB-xxxxx)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Firestore Write
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Firebase Trigger Email Extension                   │
│  • Watches `mail` collection for new documents                  │
│  • Sends email via configured SMTP provider                     │
│  • Updates document with delivery status                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ SMTP (SendGrid/Mailgun/Gmail)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Email Delivery                             │
│                   support@switchcv.com                          │
└─────────────────────────────────────────────────────────────────┘
```

## Files Created

| File                                         | Purpose                              |
| -------------------------------------------- | ------------------------------------ |
| `src/app/contact/page.tsx`                   | React page component with form UI    |
| `src/app/api/contact/feedback/route.ts`      | Next.js API route (POST handler)     |
| `src/lib/services/supportFeedbackService.ts` | Validation + Firestore write service |
| `src/config/supportFeedback.ts`              | Category and urgency configuration   |
| `src/types/supportFeedback.ts`               | TypeScript interfaces                |

## Firebase Setup (One-Time)

### 1. Install Trigger Email Extension

```bash
firebase ext:install firebase/firestore-send-email --project=YOUR_PROJECT_ID
```

During setup, configure:

- **SMTP Connection URI**: `smtps://user:password@smtp.gmail.com:465` (or SendGrid/Mailgun)
- **Email documents collection**: `mail`
- **Default FROM address**: `noreply@switchcv.com`
- **Default Reply-To**: Leave empty (we set per-document)

### 2. Firestore Security Rules

The `mail` collection is only accessible via Admin SDK (server-side):

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Mail collection - only server can write (via Admin SDK)
    match /mail/{mailId} {
      allow read, write: if false; // Only Admin SDK can access
    }
  }
}
```

### 3. Environment Variables

```env
# Optional: Override default support email destination
SUPPORT_FEEDBACK_TO=support@switchcv.com

# Development: Set to "true" to skip Firestore writes
SUPPORT_FEEDBACK_DRY_RUN=true
```

**No SMTP credentials needed in Next.js!** The Firebase extension handles all email delivery.

## Categories

| Category  | Label              | Description                                                             |
| --------- | ------------------ | ----------------------------------------------------------------------- |
| `bug`     | Product Bug        | Issues blocking resume creation, recruiter flows, or analytics          |
| `idea`    | Feature Idea       | Suggestions for improvements, AI prompts, or UI workflows               |
| `data`    | Profile/Data Issue | Profile inaccuracies, missing resumes, or privacy concerns              |
| `billing` | Billing or Access  | Questions about access tiers, recruiter credits, or subscription limits |
| `other`   | General Feedback   | Anything else for the team to review                                    |

## Urgency Levels

| Urgency  | Display | Color          |
| -------- | ------- | -------------- |
| `low`    | Low     | Default text   |
| `normal` | Normal  | Cyan highlight |
| `high`   | Urgent  | Default text   |

## Hybrid Authentication

The feedback form uses a hybrid authentication approach:

### Public Access

- No login required to submit feedback
- Anyone can report bugs or share ideas
- Email address is still required for follow-up

### Authenticated Users

- If logged in, user context is automatically attached
- Support email includes verified account details:
  - User ID (uid)
  - Verified email address
  - Display name
  - Account tier (free, pro, enterprise)
  - Role (user, recruiter, admin)

### How It Works

```typescript
// In contact page (client)
const { user } = useAuth();

// In handleSubmit
if (user) {
  const token = await user.getIdToken();
  headers["Authorization"] = `Bearer ${token}`;
}

// API route extracts user info
const authHeader = request.headers.get("Authorization");
if (authHeader?.startsWith("Bearer ")) {
  const token = authHeader.slice(7);
  const decodedToken = await adminAuth.verifyIdToken(token);
  // Fetch additional user info from Firestore
}
```

### Email Format with Authenticated User

When a logged-in user submits feedback, the email includes:

```html
<h3>🔐 Authenticated User</h3>
<ul>
  <li><strong>UID:</strong> user-abc123</li>
  <li><strong>Email:</strong> user@verified.com</li>
  <li><strong>Name:</strong> John Doe</li>
  <li><strong>Tier:</strong> pro</li>
  <li><strong>Role:</strong> recruiter</li>
</ul>
```

## API Reference

### POST `/api/contact/feedback`

Submit feedback to the support team.

**Request Body:**

```json
{
  "email": "user@example.com", // Required, valid email
  "message": "Detailed feedback...", // Required, min 20 chars
  "name": "John Doe", // Optional
  "category": "bug", // Optional, defaults to "other"
  "urgency": "normal", // Optional, defaults to "normal"
  "allowContact": true, // Optional, defaults to true
  "pageContext": "https://..." // Optional, current page URL
}
```

**Success Response (200):**

```json
{
  "success": true,
  "referenceId": "FB-abc123def456",
  "message": "Feedback delivered to support",
  "deliveredTo": "support@switchcv.com"
}
```

**Dry Run Response (200):**

```json
{
  "success": true,
  "referenceId": "FB-abc123def456",
  "message": "Feedback captured (email delivery simulated)",
  "simulated": true
}
```

**Error Response (400/500):**

```json
{
  "error": "Email is required",
  "details": "Validation failed"
}
```

## Firestore Document Structure

When feedback is submitted, a document is created in the `mail` collection:

```javascript
// mail/{referenceId}
{
  to: "support@switchcv.com",
  replyTo: "user@example.com",
  message: {
    subject: "[Feedback] Product Bug (FB-abc123)",
    html: "<styled HTML email>",
    text: "Plain text fallback"
  },
  feedback: {
    category: "bug",
    urgency: "normal",
    name: "John Doe",
    email: "user@example.com",
    message: "Full feedback message...",
    allowContact: true,
    pageContext: "/contact"
  },
  meta: {
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0..."
  },
  createdAt: Timestamp,
  // Added by Firebase extension after sending:
  delivery: {
    state: "SUCCESS",
    endTime: Timestamp,
    leaseExpireTime: Timestamp
  }
}
```

## Testing

### Test Files

| File                                                        | Tests | Description                             |
| ----------------------------------------------------------- | ----- | --------------------------------------- |
| `src/__tests__/lib/services/supportFeedbackService.test.ts` | 20    | Service validation and Firestore writes |
| `src/__tests__/api/contact/feedback.test.ts`                | 6     | API route handling                      |
| `src/__tests__/app/contact/page.test.tsx`                   | 18    | UI rendering, form interaction, auth    |

### Running Tests

```bash
# All feedback tests
npm test -- src/__tests__/lib/services/supportFeedbackService.test.ts src/__tests__/api/contact/feedback.test.ts src/__tests__/app/contact/page.test.tsx

# Individual test files
npm test -- src/__tests__/app/contact/page.test.tsx
```

### Test Coverage

The tests cover:

- ✅ Payload validation (email format, message length, category/urgency values)
- ✅ Firestore document creation with correct structure
- ✅ Reference ID generation (FB-xxxxx format)
- ✅ Error handling (validation errors, Firestore failures)
- ✅ Dry-run mode for development
- ✅ Form rendering and interaction
- ✅ Submit button states (idle, loading, success, error)
- ✅ Success/error message display
- ✅ Authenticated user context attached when logged in
- ✅ Anonymous submission when not logged in

## Development

### Dry Run Mode

During development, set `SUPPORT_FEEDBACK_DRY_RUN=true` to:

- Skip Firestore writes
- Log feedback content to console
- Return simulated success response

### Local Testing

1. Start the dev server: `npm run dev:enterprise` (or `npm run dev`)
2. Navigate to `http://localhost:3000/contact`
3. Fill out the form and submit
4. Check console for feedback data (dry run mode)

### Production Deployment

1. Install Firebase Trigger Email extension (one-time)
2. Configure SMTP in Firebase Console (extension settings)
3. Remove or set `SUPPORT_FEEDBACK_DRY_RUN=false`
4. Deploy and verify email delivery in Firebase Console

## Monitoring

### Firebase Console

View email delivery status:

1. Go to Firebase Console → Firestore
2. Browse `mail` collection
3. Check `delivery.state` field: `SUCCESS`, `PENDING`, `ERROR`

### Failed Deliveries

The extension automatically retries failed emails. Check:

- `delivery.error` for failure reason
- `delivery.attempts` for retry count

## Design Notes

### UI/UX

- Glassmorphic design matching app theme
- Real-time urgency button toggle
- Category-specific help text
- Success state shows reference ID for follow-up
- Error state allows retry without losing form data

### Security

- Server-side validation of all inputs
- IP address logged for abuse prevention
- Firestore rules prevent client-side access to `mail` collection
- No sensitive data stored client-side

### Accessibility

- Form inputs have associated labels
- Button states clearly indicated
- Error messages prominently displayed
- Keyboard navigation supported
