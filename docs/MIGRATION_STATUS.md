# System Configuration Migration - Status Report

**Date:** December 1, 2025  
**Status:** Phase 1-3 Complete ✅ | Phase 4-6 Pending 🔧

---

## ✅ Completed Work

### Phase 1: Type Definitions (Complete)

- ✅ Created `src/lib/system-config-types.ts` with all comprehensive types
- ✅ Updated `src/lib/system-config.ts` with full default configuration
- ✅ Implemented merge helpers for all config sections
- ✅ Added support for all new configuration sections:
  - Rate limits (API, search, AI enhancement, username check, support feedback)
  - Tier configs (basic, premium, enterprise)
  - Search quota config
  - AI configuration
  - Validation rules
  - Expanded cache configuration

### Phase 2: Validation (Complete)

- ✅ Created `src/lib/system-config-validator.ts` with Zod schemas
- ✅ Implemented `validateSystemConfig()` function with safe ranges
- ✅ Implemented `validateAICosts()` warning function for expensive models
- ✅ Added validation for all configuration sections with appropriate min/max values

### Phase 3: API Route (Complete)

- ✅ Updated `src/app/api/system-config/route.ts` to use validation
- ✅ Added error handling for malformed Firebase data
- ✅ Added logging for configuration loads and warnings
- ✅ Fallback to defaults if Firebase document doesn't exist or is invalid

### Phase 4: Setup Script (Complete)

- ✅ Created `scripts/setup-firebase-config.js` for automated Firebase setup
- ✅ Includes both DEV and PROD configuration presets
- ✅ Validates environment before writing
- ✅ Shows configuration summary after setup

---

## 🔧 Remaining Work

### Phase 4: Replace Hardcoded Values in Code

**Files that need updates:**

1. **src/config/constants.ts** - Replace hardcoded constants with system config reads

   - Rate limit values
   - Validation limits
   - Cache TTL values
   - AI service defaults

2. **src/lib/config.ts** - Replace tier configuration objects

   - `RESUME_CREATION_LIMITS`
   - `RESUME_EDITING_ALLOWED`
   - `RESUME_RETENTION_DAYS`
   - `RESUME_DELETION_GRACE_DAYS`
   - `RESUME_EXPIRY_WARNING_HOURS`
   - `RECRUITER_CONTACT_LIMITS`
   - `RECRUITER_SEARCH_LIMITS`

3. **src/config/aiModels.ts** - Update to read from system config

   - Default model selection
   - Preferred models list
   - Max tokens configuration

4. **Other files** (as identified in migration plan):
   - `src/lib/services/supportFeedbackService.ts` - Rate limits
   - `functions/src/middleware/rateLimiter.ts` - Rate limits
   - `functions/src/resumeService.ts` - AI enhancement limits
   - `functions/src/config/index.ts` - AI defaults
   - `src/app/api/profiles/search/route.ts` - Search limits
   - `src/lib/validations/resume.ts` - Validation rules

### Phase 5: Firebase Setup

**To setup DEV environment:**

```bash
node scripts/setup-firebase-config.js dev
```

**To setup PROD environment (CAREFULLY!):**

```bash
node scripts/setup-firebase-config.js prod
```

**Manual alternative (Firebase Console):**

1. Go to Firebase Console → Firestore
2. Navigate to `config` collection
3. Create/edit `system` document
4. Paste JSON from migration plan (see below)

### Phase 6: Testing

**Required tests:**

- [ ] Unit tests for validation schemas
- [ ] Integration tests for API route
- [ ] E2E tests for config polling
- [ ] Manual testing of maintenance mode
- [ ] Manual testing of tier limits
- [ ] Manual testing of rate limits

---

## 📋 Quick Setup Guide

### 1. Setup Firebase Config (DEV)

```bash
# Make sure you have key.json in the root directory
node scripts/setup-firebase-config.js dev
```

This will create the `config/system` document in your DEV Firebase project with:

- ✅ Relaxed rate limits for testing
- ✅ Mock data enabled
- ✅ Generous tier limits
- ✅ High search quotas
- ✅ Analytics disabled

### 2. Setup Firebase Config (PROD)

```bash
# ⚠️ Be VERY careful with production!
node scripts/setup-firebase-config.js prod
```

This will create the `config/system` document in your PROD Firebase project with:

- 🔴 Strict rate limits
- 🔴 Mock data disabled
- 🔴 Restricted tier limits
- 🔴 Limited search quotas
- 🔴 Analytics enabled

### 3. Verify Configuration

After setup, verify the configuration is working:

1. **Check API endpoint:**

   ```bash
   curl http://localhost:3000/api/system-config
   ```

2. **Check Firebase Console:**

   - Go to Firestore
   - Navigate to `config/system`
   - Verify document exists with correct values

3. **Test configuration changes:**
   - Change `maintenance.isActive` to `true` in Firebase
   - Wait for cache TTL (60s for prod, 1hr for dev)
   - Verify maintenance banner appears

---

## 🔥 Firebase Configuration JSONs

### DEV Configuration

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
    "defaultModel": "gemini-2.5-flash-lite",
    "embeddingModel": "text-embedding-004",
    "embeddingDimension": 768,
    "maxRetries": 3,
    "timeoutMs": 30000,
    "maxTokens": 4096,
    "preferredModels": [
      "gemini-2.5-flash-lite",
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

### PROD Configuration

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
    "enableAnalytics": true,
    "enableMockData": false
  },
  "rateLimits": {
    "api": {
      "windowMs": 60000,
      "maxRequests": 20
    },
    "search": {
      "perMinute": 10
    },
    "aiEnhancement": {
      "basic": {
        "perHour": 2,
        "perDay": 5
      },
      "premium": {
        "perHour": 10,
        "perDay": 40
      },
      "enterprise": {
        "perHour": 30,
        "perDay": 200
      }
    },
    "usernameCheck": {
      "maxRequests": 10,
      "windowMs": 60000
    },
    "supportFeedback": {
      "maxPerHour": 5,
      "windowMs": 3600000
    }
  },
  "tiers": {
    "basic": {
      "resumeLimit": 1,
      "canEdit": false,
      "retentionDays": 7,
      "deletionGracePeriodDays": 3,
      "expiryWarningHours": 72,
      "recruiterContacts": {
        "total": 2
      },
      "recruiterSearches": 2
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
    "basicQuota": 50,
    "premiumQuota": 999999,
    "similarityThreshold": 0.5,
    "maxResults": 10,
    "costPerSearch": 0.5
  },
  "ai": {
    "defaultModel": "gemini-2.5-flash-lite",
    "embeddingModel": "text-embedding-004",
    "embeddingDimension": 768,
    "maxRetries": 2,
    "timeoutMs": 30000,
    "maxTokens": 2048,
    "preferredModels": [
      "gemini-2.5-flash-lite",
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
    "systemConfigTtlMs": 60000,
    "templateCacheTtlMs": 1800000,
    "tierCacheTtlMs": 86400000,
    "aiCacheTtlMs": 86400000
  }
}
```

---

## 🎯 Next Steps

1. **Run Firebase setup for DEV:**

   ```bash
   node scripts/setup-firebase-config.js dev
   ```

2. **Test the configuration:**

   - Start dev server
   - Test API endpoint
   - Verify config loads correctly
   - Test maintenance mode toggle

3. **Update hardcoded values** (Phase 4):

   - See list of files above
   - Replace hardcoded constants with system config reads
   - Test each change thoroughly

4. **Run Firebase setup for PROD** (after thorough testing):

   ```bash
   node scripts/setup-firebase-config.js prod
   ```

5. **Monitor and validate:**
   - Watch logs for validation errors
   - Check Firebase Console for config changes
   - Test rollback procedures

---

## 🔄 Rollback Procedures

If something goes wrong, you can quickly rollback:

### Option 1: Restore Previous Firebase Version

1. Go to Firebase Console → Firestore → `config/system`
2. Click "History" tab
3. Select previous version
4. Click "Restore"

### Option 2: Delete Config (Use Defaults)

1. Delete `config/system` document in Firebase
2. Code automatically falls back to `defaultSystemConfig`

### Option 3: Code Rollback

```bash
git revert <commit-hash>
npm run deploy
```

---

## 📝 Notes

- All configuration changes require validation against Zod schemas
- Invalid configs automatically fallback to defaults
- Expensive AI models trigger cost warnings
- Config cache TTL: 60s (prod), 1hr (dev)
- Firebase version history available for easy rollback

**Status:** Ready for Firebase setup and Phase 4 implementation! 🚀
