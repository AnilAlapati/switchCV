# Development Mode Guide

## Overview

SwitchCV includes a **dev mode override system** that allows developers to bypass subscription tier and role restrictions during local development, while still using **real Firebase and real LLM APIs**.

> ⚠️ **Production Safety**: Dev mode is **impossible to enable in production**. The code has a hard block: `NODE_ENV !== "production"` must be true for any overrides to work.

---

## Quick Start

```bash
# Full enterprise access (tier only, role from Firestore)
npm run dev:enterprise

# Enterprise tier + recruiter role (for AI search, contacts, etc.)
npm run dev:enterprise:recruiter

# Enterprise tier + jobseeker role (for resume features)
npm run dev:enterprise:jobseeker

# Test with real Firestore values (no overrides)
npm run dev
```

---

## Available Scripts

| Command                            | Tier Override | Role Override | Use Case                |
| ---------------------------------- | ------------- | ------------- | ----------------------- |
| `npm run dev`                      | None          | None          | Production-like testing |
| `npm run dev:enterprise`           | Enterprise    | None          | Full tier, real role    |
| `npm run dev:enterprise:recruiter` | Enterprise    | Recruiter     | Full recruiter access   |
| `npm run dev:enterprise:jobseeker` | Enterprise    | Jobseeker     | Full jobseeker access   |
| `npm run dev:premium`              | Premium       | None          | Premium tier testing    |
| `npm run dev:basic`                | Basic         | None          | Basic tier limitations  |

---

## What Gets Overridden vs What Stays Real

### ✅ Always REAL (unchanged)

| Feature               | Description                     |
| --------------------- | ------------------------------- |
| **Firebase Auth**     | Real login, real user accounts  |
| **Firestore Data**    | Real database reads/writes      |
| **Resume Operations** | Create, edit, delete — all real |
| **LLM Calls**         | Real Gemini API for AI features |
| **Search Results**    | Real resume data from Firestore |
| **Analytics/Logging** | Real tracking and audit logs    |

### 🔄 BYPASSED (permission checks only)

| Check                   | Normal Behavior                          | Dev Mode Behavior              |
| ----------------------- | ---------------------------------------- | ------------------------------ |
| **Tier Check**          | Read from `users/{uid}.subscriptionTier` | Return override value          |
| **Role Check**          | Read from `users/{uid}.role`             | Return override value          |
| **Quota Check**         | Decrement and enforce limits             | Skip (unlimited)               |
| **Premium UI Features** | Hidden for basic tier                    | Enabled for premium/enterprise |

---

## How It Works

### Environment Variables

```bash
# Required to enable dev mode
NEXT_PUBLIC_DEV_MODE=true

# Optional: Override subscription tier
NEXT_PUBLIC_DEV_TIER=enterprise  # or: basic, premium

# Optional: Override user role
NEXT_PUBLIC_DEV_ROLE=recruiter   # or: jobseeker, admin
```

### Safety Mechanism

The core safety check in `src/lib/config.ts`:

```typescript
export const DEV_MODE_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_MODE === "true";
```

| Environment     | NODE_ENV    | DEV_MODE_ENABLED    | Overrides Work? |
| --------------- | ----------- | ------------------- | --------------- |
| `npm run dev`   | development | ✅ Yes (if env set) | Yes             |
| `npm run build` | production  | ❌ Always false     | **Never**       |
| `npm start`     | production  | ❌ Always false     | **Never**       |
| Vercel deploy   | production  | ❌ Always false     | **Never**       |
| Firebase deploy | production  | ❌ Always false     | **Never**       |

---

## Visual Indicator

When dev mode is active, a floating badge appears in the **bottom-right corner**:

```
┌─────────────────┐
│ 🔧 DEV MODE     │
├─────────────────┤
│ Tier: ENTERPRISE│
│ Role: RECRUITER │
└─────────────────┘
```

This helps you:

- Know when overrides are active
- See which tier/role you're simulating
- Avoid confusion about feature behavior

---

## Cloud Functions (Firebase Emulator)

For AI Search and other Cloud Functions, create `functions/.env.local`:

```bash
# Enable dev bypass (only works in emulator)
DEV_BYPASS_CHECKS=true

# Required for AI features
GEMINI_API_KEY=your_api_key
```

Then run:

```bash
firebase emulators:start --only functions
```

The bypass only works when `FUNCTIONS_EMULATOR=true` (automatically set by emulator).

---

## Example Workflows

### 1. Building a New Feature (Full Access)

```bash
npm run dev:enterprise:recruiter
```

- All features unlocked
- Test without worrying about tier limits
- Real data operations

### 2. Testing Basic User Experience

```bash
npm run dev:basic
```

- See what basic users see
- Verify upgrade prompts work
- Test tier-locked UI elements

### 3. Pre-Deploy QA (Production-like)

```bash
npm run dev
```

- No overrides
- Uses real Firestore tier/role
- Matches production behavior

### 4. Testing Jobseeker with Premium Features

```bash
npm run dev:enterprise:jobseeker
```

- Jobseeker role (no recruiter features)
- Enterprise tier (unlimited resumes, no expiry)

---

## Using the `useTier` Hook (Client Components)

For client-side components that need to check the user's tier, use the `useTier` hook:

```tsx
import { useTier } from "@/hooks/useTier";

function MyComponent() {
  const { tier, isPremiumOrHigher, loading, isEnterprise } = useTier();

  if (loading) return <Spinner />;

  if (!isPremiumOrHigher) {
    return <UpgradePrompt />;
  }

  return <PremiumFeature />;
}
```

### Hook Return Values

| Property            | Type               | Description                              |
| ------------------- | ------------------ | ---------------------------------------- |
| `tier`              | `SubscriptionTier` | Current tier: basic, premium, enterprise |
| `loading`           | `boolean`          | True while fetching tier                 |
| `error`             | `string \| null`   | Error message if fetch failed            |
| `isBasic`           | `boolean`          | True if tier is basic                    |
| `isPremium`         | `boolean`          | True if tier is premium                  |
| `isEnterprise`      | `boolean`          | True if tier is enterprise               |
| `isPremiumOrHigher` | `boolean`          | True if premium or enterprise            |
| `refetch`           | `() => Promise`    | Re-fetch tier from server                |

The hook automatically uses `DEV_TIER_OVERRIDE` in dev mode, skipping the API call entirely.

---

## Subscription Tiers Reference

| Feature          | Basic      | Premium  | Enterprise |
| ---------------- | ---------- | -------- | ---------- |
| Resume Creation  | 1          | 50       | Unlimited  |
| Resume Editing   | ❌         | ✅       | ✅         |
| Resume Retention | 7 days     | Forever  | Forever    |
| AI Search        | ❌         | 50/month | Unlimited  |
| Contact Requests | 2 lifetime | 50/month | Unlimited  |

---

## User Roles Reference

| Role          | Capabilities                                    |
| ------------- | ----------------------------------------------- |
| **jobseeker** | Create/manage own resume, view profile          |
| **recruiter** | Search resumes, request contact info, AI search |
| **admin**     | All recruiter features + admin dashboard        |

---

## Troubleshooting

### Dev mode not working?

1. Check that you're using the right script: `npm run dev:enterprise`
2. Verify the banner appears in bottom-right corner
3. Check console for `[DEV MODE]` log messages

### Overrides not applying?

1. Restart the dev server after changing env vars
2. Ensure `NEXT_PUBLIC_DEV_MODE=true` is set
3. Check that tier/role values are valid

### Cloud Function bypass not working?

1. Must be running in Firebase emulator
2. Create `functions/.env.local` with `DEV_BYPASS_CHECKS=true`
3. Restart emulator after adding env file

---

## Files Reference

| File                                   | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `src/lib/config.ts`                    | Dev mode constants and safety checks              |
| `src/lib/services/userService.ts`      | `getUserTier()` and `getUserRole()` with bypass   |
| `src/hooks/useTier.ts`                 | Client-side hook to get tier with dev mode bypass |
| `src/components/dev/DevModeBanner.tsx` | Visual indicator component                        |
| `functions/src/searchResumeService.ts` | Cloud Function bypass for AI search               |
| `.env.example`                         | Documentation for env variables                   |
| `functions/.env.example`               | Cloud Functions env documentation                 |

---

## Security Notes

1. **Never commit** `.env.local` files (they're in `.gitignore`)
2. Dev mode **cannot work** in production builds
3. The `NODE_ENV` check is **compile-time** — the code path is eliminated in prod
4. Even if env vars leak, production builds ignore them completely
