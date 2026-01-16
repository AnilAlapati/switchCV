# Manual Firebase Configuration Setup

Since the automated script requires the correct service account key, here's how to manually setup the configuration in Firebase Console.

## Setup Instructions

### DEV Environment (switchcv-dev)

1. **Go to Firebase Console:**

   - Navigate to: https://console.firebase.google.com/
   - Select project: **switchcv-dev**

2. **Open Firestore:**

   - Click "Firestore Database" in the left menu
   - Click "Start collection" or navigate to existing collections

3. **Create the config collection:**

   - Collection ID: `config`
   - Document ID: `system`

4. **Paste this JSON** (click "Add field" → Switch to "Raw" mode or add fields manually):

```json
{
  "maintenance": {
    "isActive": false,
    "message": "",
    "blocking": false
  },
  "auth": {
    "registrationClosed": false,
    "loginDisabled": false
  },
  "features": {
    "enableAnalytics": false,
    "enableMockData": true
  },
  "rateLimits": {
    "api": {
      "windowMs": 60000,
      "maxRequests": 100
    },
    "search": {
      "perMinute": 50
    },
    "aiEnhancement": {
      "basic": {
        "perHour": 10,
        "perDay": 100
      },
      "premium": {
        "perHour": 50,
        "perDay": 500
      },
      "enterprise": {
        "perHour": 200,
        "perDay": 2000
      }
    },
    "usernameCheck": {
      "maxRequests": 50,
      "windowMs": 60000
    },
    "supportFeedback": {
      "maxPerHour": 20,
      "windowMs": 3600000
    }
  },
  "tiers": {
    "basic": {
      "resumeLimit": 5,
      "canEdit": true,
      "retentionDays": null,
      "deletionGracePeriodDays": null,
      "expiryWarningHours": null,
      "recruiterContacts": {
        "total": 100
      },
      "recruiterSearches": 9999
    },
    "premium": {
      "resumeLimit": 50,
      "canEdit": true,
      "retentionDays": null,
      "deletionGracePeriodDays": null,
      "expiryWarningHours": null,
      "recruiterContacts": {
        "perMonth": 50
      },
      "recruiterSearches": 9999
    },
    "enterprise": {
      "resumeLimit": 9999,
      "canEdit": true,
      "retentionDays": null,
      "deletionGracePeriodDays": null,
      "expiryWarningHours": null,
      "recruiterContacts": {
        "perMonth": 9999
      },
      "recruiterSearches": 9999
    }
  },
  "search": {
    "basicQuota": 9999,
    "premiumQuota": 999999,
    "similarityThreshold": 0.3,
    "maxResults": 50,
    "costPerSearch": 0.5
  },
  "ai": {
    "defaultModel": "gemini-2.0-flash-lite",
    "embeddingModel": "text-embedding-004",
    "embeddingDimension": 768,
    "maxRetries": 3,
    "timeoutMs": 30000,
    "maxTokens": 4096,
    "preferredModels": [
      "gemini-2.0-flash-lite",
      "gemini-2.5-flash",
      "gpt-4o-mini",
      "groq/llama-3.1-8b"
    ],
    "enableCostWarnings": true
  },
  "validation": {
    "username": {
      "minLength": 3,
      "maxLength": 30
    },
    "fields": {
      "maxLength": 200,
      "maxDescriptionLength": 2000
    },
    "resume": {
      "maxSkills": 50,
      "maxExperiences": 20,
      "maxEducations": 10,
      "maxProjects": 20
    }
  },
  "cache": {
    "systemConfigTtlMs": 3600000,
    "templateCacheTtlMs": 1800000,
    "tierCacheTtlMs": 86400000,
    "aiCacheTtlMs": 86400000
  }
}
```

5. **Click "Save"**

---

### PROD Environment (switchcv-e5136)

**⚠️ You can use the automated script for PROD since you have the key:**

```bash
node scripts/setup-firebase-config.js prod
```

**OR manually:**

1. Go to Firebase Console → **switchcv-e5136**
2. Firestore Database → Collection `config` → Document `system`
3. Paste the PROD JSON (see docs/MIGRATION_STATUS.md)
4. Save

---

## Verification

After setup, verify the configuration:

**Test API Endpoint:**

```bash
# Start your dev server
npm run dev

# In another terminal
curl http://localhost:3000/api/system-config | jq
```

**Expected Response:**

```json
{
  "config": {
    "maintenance": { ... },
    "auth": { ... },
    ...
  },
  "fetchedAt": "2025-12-01T..."
}
```

---

## Quick Testing

**Test Maintenance Mode:**

1. Go to Firebase Console → Firestore
2. Edit `config/system` document
3. Change `maintenance.isActive` to `true`
4. Change `maintenance.message` to "System maintenance"
5. Save
6. Wait up to 1 hour (dev) or 60 seconds (prod) for cache refresh
7. Check your app - maintenance banner should appear

**Test Tier Limits:**

1. Change `tiers.basic.resumeLimit` to `3`
2. Save
3. Login as basic user
4. Try to create more than 3 resumes - should be blocked

---

## Troubleshooting

**Config not updating?**

- Check cache TTL (1 hour for dev, 60s for prod)
- Restart dev server to force refresh
- Check browser console for API errors

**Validation errors?**

- Check server logs for Zod validation errors
- Ensure all required fields are present
- Ensure values are within safe ranges (see system-config-validator.ts)

**Need to rollback?**

- Firebase keeps version history
- Go to document → History tab → Restore previous version
