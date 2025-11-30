# System Configuration Migration Plan

**Date:** November 30, 2025  
**Project:** SwitchCV  
**Goal:** Move hardcoded configuration values to Firebase Firestore for dynamic management

---

## Table of Contents

1. [Overview](#overview)
2. [TypeScript Type Definitions](#typescript-type-definitions)
3. [DEV Configuration](#dev-configuration)
4. [PROD Configuration](#prod-configuration)
5. [Validation Schema](#validation-schema)
6. [Migration Checklist](#migration-checklist)
7. [Testing Checklist](#testing-checklist)
8. [Rollback Plan](#rollback-plan)

---

## Overview

### Current State

- ~180 configuration values hardcoded across codebase
- Changes require code deployment (~5 min)
- No runtime flexibility
- Difficult to A/B test or toggle features

### Target State

- Critical config values in Firebase `config/system` document
- Changes via Firebase Console (~30 sec)
- No deployment needed for config updates
- Easy rollback via Firebase version history

### Benefits

✅ **No redeploy** for config changes  
✅ **Instant updates** (within polling interval)  
✅ **Version history** (Firebase keeps all versions)  
✅ **Easy rollback** (restore previous version)  
✅ **A/B testing** ready  
✅ **Emergency toggles** (maintenance mode, feature flags)

### Risks & Mitigations

⚠️ **Typos in Firebase** → Validation schema with safe ranges  
⚠️ **Cost explosion** (wrong AI model) → Alerts on expensive models  
⚠️ **Business logic errors** (wrong tier limits) → Min/max validation  
⚠️ **Access control** → Only trusted admins edit Firebase

---

## TypeScript Type Definitions

### File: `src/lib/system-config.ts`

```typescript
// =============================================================================
// MAINTENANCE CONFIGURATION
// =============================================================================
// Controls system-wide maintenance mode and user access
export type MaintenanceConfig = {
  // Whether maintenance mode is active (shows banner to users)
  // USE: Emergency maintenance, scheduled downtime
  isActive: boolean;

  // Message to display to users during maintenance
  // USE: "System upgrade in progress. Back in 30 minutes."
  message: string;

  // Whether to completely block access (true) or just show warning (false)
  // USE: true = hard maintenance (no access), false = soft warning
  blocking: boolean;
};

// =============================================================================
// AUTHENTICATION CONFIGURATION
// =============================================================================
// Controls user registration and login capabilities
export type AuthConfig = {
  // Disable new user registrations (existing users can still login)
  // USE: Closed beta, capacity limits, security incidents
  registrationClosed: boolean;

  // Disable all logins (emergency kill switch)
  // USE: Security breach, system-wide emergency
  loginDisabled: boolean;
};

// =============================================================================
// FEATURE FLAGS
// =============================================================================
// Toggle application features without code deployment
export type FeaturesConfig = {
  // Enable analytics tracking (PostHog, Google Analytics)
  // USE: GDPR compliance, debugging, A/B testing
  enableAnalytics: boolean;

  // Enable mock data for testing (DEV only, never in PROD)
  // USE: Demo mode, testing without real data
  enableMockData: boolean;
};

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================
// Prevents abuse and controls API usage
export type RateLimitConfig = {
  // General API rate limiting
  api: {
    // Time window in milliseconds (60000 = 1 minute)
    // USE: How long to track requests
    windowMs: number;

    // Maximum requests allowed per window per user/IP
    // USE: Prevent API abuse, DDoS protection
    maxRequests: number;
  };

  // Search-specific rate limits
  search: {
    // Maximum searches per minute per user
    // USE: Prevent recruiter scraping, control costs
    perMinute: number;
  };

  // AI resume enhancement rate limits (tier-based)
  // USE: Control expensive AI API costs per user tier
  aiEnhancement: {
    basic: {
      perHour: number; // Max AI enhancements per hour
      perDay: number; // Max AI enhancements per day
    };
    premium: {
      perHour: number;
      perDay: number;
    };
    enterprise: {
      perHour: number;
      perDay: number;
    };
  };

  // Username availability check rate limits
  // USE: Prevent username enumeration attacks
  usernameCheck: {
    maxRequests: number; // Max checks per window
    windowMs: number; // Time window in ms
  };

  // Support feedback submission limits
  // USE: Prevent spam, abuse of support system
  supportFeedback: {
    maxPerHour: number; // Max submissions per hour per IP
    windowMs: number; // Time window in ms
  };
};

// =============================================================================
// TIER CONFIGURATION (BUSINESS LOGIC)
// =============================================================================
// Defines capabilities and limits for each subscription tier
// ⚠️ CRITICAL: Changes directly affect revenue and user experience
export type TierConfig = {
  // Maximum resumes a user can create
  // USE: Core product limitation, upsell driver
  resumeLimit: number;

  // Whether users can edit published resumes
  // USE: Premium feature, forces recreation for basic users
  canEdit: boolean;

  // Days before resume auto-deletes (null = never)
  // USE: Storage management, upsell to premium
  retentionDays: number | null;

  // Days before showing deletion warning
  // USE: Give users time to upgrade before losing data
  deletionGracePeriodDays: number | null;

  // Hours before expiry to send warning email
  // USE: 72 = 3 days notice to upgrade
  expiryWarningHours: number | null;

  // Recruiter contact limits
  // USE: Control recruiter-candidate matching volume
  recruiterContacts: {
    total?: number; // Lifetime limit (for basic)
    perMonth?: number; // Monthly limit (for premium/enterprise)
  };

  // Maximum recruiter searches allowed
  // USE: Prevent excessive database queries
  recruiterSearches: number;
};

// =============================================================================
// SEARCH QUOTA CONFIGURATION
// =============================================================================
// Controls AI-powered resume search capabilities
export type SearchQuotaConfig = {
  // Monthly search quota for basic tier
  // USE: Limit free tier usage, encourage upgrades
  basicQuota: number;

  // Monthly search quota for premium+ tiers
  // USE: Effectively unlimited for paid users
  premiumQuota: number;

  // Minimum similarity score to return results (0-1)
  // USE: 0.5 = 50% match, higher = stricter results
  similarityThreshold: number;

  // Maximum results to return per search
  // USE: Performance, user experience, cost control
  maxResults: number;

  // Cost per search (for internal tracking/analytics)
  // USE: Calculate monthly burn rate
  costPerSearch: number;
};

// =============================================================================
// AI CONFIGURATION
// =============================================================================
// Controls AI model selection and behavior
// ⚠️ CRITICAL: Wrong model selection can cost thousands per day
export type AIConfig = {
  // Default AI model for resume enhancements
  // USE: Balance cost vs quality
  // OPTIONS:
  //   - "gemini-2.0-flash-lite" ($0.15/1M tokens) ✅ RECOMMENDED
  //   - "gpt-4o-mini" ($0.60/1M tokens)
  //   - "gpt-4o" ($10.00/1M tokens) ⚠️ EXPENSIVE
  defaultModel: string;

  // Model for generating resume embeddings (vector search)
  // USE: Must match embedding dimension in database
  // OPTIONS: "text-embedding-004" (768 dim), "text-embedding-3-small" (1536 dim)
  embeddingModel: string;

  // Embedding vector dimension
  // USE: Must match embeddingModel output (768 for text-embedding-004)
  // ⚠️ CRITICAL: Mismatch breaks vector search
  embeddingDimension: number;

  // Number of retry attempts for failed AI calls
  // USE: Handle transient API failures (network issues, rate limits)
  maxRetries: number;

  // Timeout for AI API calls in milliseconds
  // USE: Prevent hanging requests, improve user experience
  // RECOMMENDED: 30000 (30 seconds)
  timeoutMs: number;

  // Maximum tokens per AI request
  // USE: Cost control, prevent runaway generation
  // BALANCE: Higher = better quality, Lower = lower cost
  maxTokens: number;

  // AI provider priority list (fallback order)
  // USE: If primary fails, try next in list
  // FORMAT: ["gemini-2.0-flash-lite", "gpt-4o-mini", "groq/llama-3.1-8b"]
  preferredModels: string[];

  // Enable AI cost warnings (log when using expensive models)
  // USE: Alert admins if expensive models are selected
  enableCostWarnings: boolean;
};

// =============================================================================
// VALIDATION RULES
// =============================================================================
// Input validation limits across the application
export type ValidationConfig = {
  // Username constraints
  username: {
    minLength: number; // Minimum characters (prevent "ab")
    maxLength: number; // Maximum characters (database limit)
  };

  // General field length limits
  fields: {
    maxLength: number; // For names, titles, etc (200)
    maxDescriptionLength: number; // For descriptions, bios (2000)
  };

  // Resume-specific limits
  resume: {
    maxSkills: number; // Maximum skills per resume
    maxExperiences: number; // Maximum work experiences
    maxEducations: number; // Maximum education entries
    maxProjects: number; // Maximum projects
  };
};

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================
// Controls caching behavior across the application
export type CacheConfig = {
  // System config cache TTL (how often to refetch from Firebase)
  // USE: Dev = 1 hour (quiet logs), Prod = 60s (responsive)
  systemConfigTtlMs: number;

  // Resume template cache TTL
  // USE: Templates rarely change, safe to cache longer
  templateCacheTtlMs: number;

  // User tier cache TTL
  // USE: Tier changes are rare, cache for performance
  tierCacheTtlMs: number;

  // AI response cache TTL
  // USE: Same prompt = same answer, reduce API costs
  aiCacheTtlMs: number;
};

// =============================================================================
// MASTER SYSTEM CONFIGURATION TYPE
// =============================================================================
export type SystemConfig = {
  maintenance: MaintenanceConfig;
  auth: AuthConfig;
  features: FeaturesConfig;
  rateLimits: RateLimitConfig;
  tiers: {
    basic: TierConfig;
    premium: TierConfig;
    enterprise: TierConfig;
  };
  search: SearchQuotaConfig;
  ai: AIConfig;
  validation: ValidationConfig;
  cache: CacheConfig;
};
```

---

## DEV Configuration

### Firebase Console: `switchcv-dev` → Firestore → `config/system`

**Paste this JSON:**

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

**DEV Notes:**

- 🟢 **Relaxed rate limits** - Easy testing without hitting limits
- 🟢 **Mock data enabled** - Safe to use fake data
- 🟢 **Basic tier generous** - 5 resumes, can edit, no expiry
- 🟢 **Search quota high** - Unlimited testing
- 🟢 **1 hour config polling** - Quiet logs
- 🟢 **Analytics disabled** - No tracking in dev

---

## PROD Configuration

### Firebase Console: `switchcv-e5136` → Firestore → `config/system`

**⚠️ CAREFULLY paste this JSON:**

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
    "defaultModel": "gemini-2.0-flash-lite",
    "embeddingModel": "text-embedding-004",
    "embeddingDimension": 768,
    "maxRetries": 2,
    "timeoutMs": 30000,
    "maxTokens": 2048,
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
    "systemConfigTtlMs": 60000,
    "templateCacheTtlMs": 1800000,
    "tierCacheTtlMs": 86400000,
    "aiCacheTtlMs": 86400000
  }
}
```

**PROD Notes:**

- 🔴 **Strict rate limits** - Prevent abuse, control costs
- 🔴 **Mock data disabled** - Production data only
- 🔴 **Basic tier restricted** - 1 resume, 7 day expiry, no edit
- 🔴 **Search quota limited** - 50/month for basic tier
- 🔴 **60s config polling** - Responsive to changes
- 🔴 **Analytics enabled** - Track user behavior
- 🔴 **Lower AI retries** - Fail fast, reduce cost

---

## Validation Schema

### Create: `src/lib/system-config-validator.ts`

```typescript
import { z } from "zod";
import type { SystemConfig } from "./system-config";

// Safe ranges to prevent catastrophic mistakes
const RateLimitConfigSchema = z.object({
  api: z.object({
    windowMs: z.number().min(1000).max(3600000), // 1 sec to 1 hour
    maxRequests: z.number().min(1).max(1000), // 1 to 1000
  }),
  search: z.object({
    perMinute: z.number().min(1).max(100), // 1 to 100
  }),
  aiEnhancement: z.object({
    basic: z.object({
      perHour: z.number().min(1).max(50),
      perDay: z.number().min(1).max(200),
    }),
    premium: z.object({
      perHour: z.number().min(1).max(100),
      perDay: z.number().min(1).max(1000),
    }),
    enterprise: z.object({
      perHour: z.number().min(1).max(500),
      perDay: z.number().min(1).max(5000),
    }),
  }),
  usernameCheck: z.object({
    maxRequests: z.number().min(1).max(100),
    windowMs: z.number().min(1000).max(3600000),
  }),
  supportFeedback: z.object({
    maxPerHour: z.number().min(1).max(50),
    windowMs: z.number().min(3600000).max(86400000), // 1-24 hours
  }),
});

const TierConfigSchema = z.object({
  resumeLimit: z.number().min(0).max(10000),
  canEdit: z.boolean(),
  retentionDays: z.number().min(1).max(365).nullable(),
  deletionGracePeriodDays: z.number().min(1).max(30).nullable(),
  expiryWarningHours: z.number().min(1).max(720).nullable(),
  recruiterContacts: z.object({
    total: z.number().min(1).max(10000).optional(),
    perMonth: z.number().min(1).max(10000).optional(),
  }),
  recruiterSearches: z.number().min(0).max(10000),
});

const AIConfigSchema = z.object({
  defaultModel: z.string().min(1).max(100),
  embeddingModel: z.string().min(1).max(100),
  embeddingDimension: z.number().min(128).max(2048),
  maxRetries: z.number().min(0).max(10),
  timeoutMs: z.number().min(5000).max(120000), // 5s to 2min
  maxTokens: z.number().min(100).max(32768),
  preferredModels: z.array(z.string()).min(1).max(20),
  enableCostWarnings: z.boolean(),
});

export const SystemConfigSchema = z.object({
  maintenance: z.object({
    isActive: z.boolean(),
    message: z.string().max(500),
    blocking: z.boolean(),
  }),
  auth: z.object({
    registrationClosed: z.boolean(),
    loginDisabled: z.boolean(),
  }),
  features: z.object({
    enableAnalytics: z.boolean(),
    enableMockData: z.boolean(),
  }),
  rateLimits: RateLimitConfigSchema,
  tiers: z.object({
    basic: TierConfigSchema,
    premium: TierConfigSchema,
    enterprise: TierConfigSchema,
  }),
  search: z.object({
    basicQuota: z.number().min(0).max(1000000),
    premiumQuota: z.number().min(0).max(10000000),
    similarityThreshold: z.number().min(0).max(1),
    maxResults: z.number().min(1).max(100),
    costPerSearch: z.number().min(0).max(10),
  }),
  ai: AIConfigSchema,
  validation: z.object({
    username: z.object({
      minLength: z.number().min(1).max(10),
      maxLength: z.number().min(10).max(100),
    }),
    fields: z.object({
      maxLength: z.number().min(50).max(1000),
      maxDescriptionLength: z.number().min(100).max(10000),
    }),
    resume: z.object({
      maxSkills: z.number().min(10).max(200),
      maxExperiences: z.number().min(5).max(100),
      maxEducations: z.number().min(5).max(50),
      maxProjects: z.number().min(5).max(100),
    }),
  }),
  cache: z.object({
    systemConfigTtlMs: z.number().min(10000).max(3600000),
    templateCacheTtlMs: z.number().min(60000).max(86400000),
    tierCacheTtlMs: z.number().min(60000).max(604800000),
    aiCacheTtlMs: z.number().min(60000).max(604800000),
  }),
});

// Validate config and fallback to defaults if invalid
export function validateSystemConfig(
  data: unknown,
  defaultConfig: SystemConfig
): SystemConfig {
  try {
    return SystemConfigSchema.parse(data);
  } catch (error) {
    console.error("❌ Invalid system config, using defaults:", error);
    return defaultConfig;
  }
}

// Check for expensive AI models and warn
export function validateAICosts(config: SystemConfig): void {
  const expensiveModels: Record<string, number> = {
    "gpt-4o": 10.0,
    "claude-3.5-sonnet": 6.0,
    "gpt-4-turbo": 10.0,
  };

  const cost = expensiveModels[config.ai.defaultModel];
  if (cost) {
    console.warn(
      `🚨 WARNING: Expensive AI model selected: ${config.ai.defaultModel}`,
      `Cost: $${cost}/1M tokens vs $0.15 for Gemini Flash`
    );
  }
}
```

---

## Migration Checklist

### Phase 1: Expand Type Definitions ✅

- [ ] Update `src/lib/system-config.ts` with new types
- [ ] Add comprehensive comments to each field
- [ ] Update `defaultSystemConfig` with all new fields
- [ ] Update `mergeWithDefaultConfig` function to handle new structure

### Phase 2: Create Validation ✅

- [ ] Create `src/lib/system-config-validator.ts`
- [ ] Add Zod schemas for all config sections
- [ ] Implement `validateSystemConfig` function
- [ ] Implement `validateAICosts` warning function

### Phase 3: Update API Route ✅

- [ ] Modify `src/app/api/system-config/route.ts` to validate config
- [ ] Add error handling for validation failures
- [ ] Add logging for config loads

### Phase 4: Replace Hardcoded Values 🔧

Files to update (replace hardcoded values with config reads):

#### Rate Limits

- [ ] `src/config/constants.ts` - Replace `RATE_LIMIT_*` constants
- [ ] `src/lib/services/supportFeedbackService.ts` - Replace rate limit values
- [ ] `functions/src/middleware/rateLimiter.ts` - Replace rate limit values

#### Tier Limits

- [ ] `src/lib/config.ts` - Replace `TIER_CONFIGS` object
- [ ] `functions/src/resumeService.ts` - Replace tier-based AI limits

#### AI Configuration

- [ ] `src/config/constants.ts` - Replace `AI_*` constants
- [ ] `src/config/aiModels.ts` - Replace model configurations
- [ ] `src/lib/services/aiProviderService.ts` - Replace model selection logic
- [ ] `functions/src/config/index.ts` - Replace AI defaults

#### Search/Quota

- [ ] `src/config/constants.ts` - Replace `*_SEARCH_QUOTA` constants
- [ ] `src/app/api/profiles/search/route.ts` - Replace pagination limits

#### Validation Rules

- [ ] `src/config/constants.ts` - Replace `USERNAME_*`, `MAX_*` constants
- [ ] `src/lib/validations/resume.ts` - Make Zod schemas read from config

#### Cache Settings

- [ ] `src/config/constants.ts` - Replace `*_CACHE_TTL_MS` constants
- [ ] `src/context/SystemConfigProvider.tsx` - Already dynamic ✅

### Phase 5: Firebase Setup 🔥

- [ ] **DEV**: Create `config/system` document in `switchcv-dev`
- [ ] **DEV**: Paste DEV configuration JSON
- [ ] **DEV**: Verify document exists and is readable
- [ ] **PROD**: Create `config/system` document in `switchcv-e5136`
- [ ] **PROD**: Paste PROD configuration JSON (CAREFULLY!)
- [ ] **PROD**: Double-check all values before saving

### Phase 6: Code Integration 🔗

- [ ] Update all files to import and use `useSystemConfig()` hook
- [ ] Remove old hardcoded constant imports
- [ ] Update tests to mock system config
- [ ] Add fallback logic for missing config values

---

## Testing Checklist

### Unit Tests

- [ ] Test `validateSystemConfig` with valid config
- [ ] Test `validateSystemConfig` with invalid config (should fallback)
- [ ] Test `validateAICosts` with expensive models (should warn)
- [ ] Test `mergeWithDefaultConfig` with partial configs

### Integration Tests

- [ ] Test API route `/api/system-config` returns config
- [ ] Test API route handles missing Firebase document
- [ ] Test API route handles malformed Firebase data
- [ ] Test config polling updates in browser

### E2E Tests

- [ ] Sign up with rate limits active
- [ ] Test basic tier resume limit (1 resume)
- [ ] Test basic tier recruiter contact limit (2 contacts)
- [ ] Test AI enhancement with tier limits
- [ ] Test search quota limits
- [ ] Toggle maintenance mode and verify banner

### Manual Testing

**DEV Environment:**

- [ ] Change `maintenance.isActive` → true in Firebase, verify banner appears
- [ ] Change `tiers.basic.resumeLimit` → 3, verify limit updates
- [ ] Change `ai.defaultModel`, verify model selection changes
- [ ] Test with invalid JSON, verify fallback to defaults

**PROD Environment:**

- [ ] ⚠️ **DO NOT** test destructive changes
- [ ] Only verify config loads correctly
- [ ] Monitor logs for validation errors
- [ ] Check Firebase Console permissions

---

## Rollback Plan

### If Something Goes Wrong

#### Option 1: Restore Previous Firebase Version

1. Go to Firebase Console → Firestore → `config/system`
2. Click "History" tab
3. Select previous version
4. Click "Restore"
5. ✅ Changes revert instantly (within polling interval)

#### Option 2: Fix Invalid Config

1. Identify validation error in logs
2. Edit `config/system` document in Firebase Console
3. Fix invalid field
4. Save
5. ✅ Valid config loads on next poll

#### Option 3: Emergency Fallback to Defaults

1. Delete `config/system` document in Firebase
2. Code automatically uses `defaultSystemConfig`
3. System continues working with hardcoded defaults
4. Restore config when ready

#### Option 4: Code Rollback (Last Resort)

1. Revert Git commit
2. Redeploy previous version
3. Old hardcoded values active again
4. ⚠️ Requires ~5 min deployment time

---

## Next Steps

1. **Review this plan** - Adjust values as needed
2. **Start with types** - Expand `SystemConfig` in `system-config.ts`
3. **Add validation** - Create `system-config-validator.ts`
4. **Test in DEV** - Paste DEV config to Firebase
5. **Update code** - Replace hardcoded values (20 files)
6. **Deploy & test** - Verify everything works
7. **PROD deployment** - Carefully paste PROD config
8. **Monitor** - Watch logs for issues

---

**Status:** Ready for Implementation 🚀  
**Estimated Time:** 2-4 hours  
**Risk Level:** Low (with validation)  
**Impact:** High (no more deploys for config changes!)
