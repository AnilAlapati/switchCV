import type {
  SystemConfig,
  MaintenanceConfig,
  AuthConfig,
  FeaturesConfig,
  RateLimitConfig,
  TierConfig,
  SearchQuotaConfig,
  AIConfig,
  ValidationConfig,
  CacheConfig,
} from "./system-config-types";

// Re-export types for convenience
export type {
  SystemConfig,
  MaintenanceConfig,
  AuthConfig,
  FeaturesConfig,
  RateLimitConfig,
  TierConfig,
  SearchQuotaConfig,
  AIConfig,
  ValidationConfig,
  CacheConfig,
};

// =============================================================================
// CACHE TTL NORMALIZATION
// =============================================================================
const CACHE_TTL_MIN_MS = 10_000; // 10 seconds
const CACHE_TTL_MAX_MS = 30 * 60 * 1000; // 30 minutes

const getEnvCacheTtl = (): number | undefined => {
  const value = Number(process.env.NEXT_PUBLIC_SYSTEM_CONFIG_CACHE_TTL_MS);
  return Number.isFinite(value) ? value : undefined;
};

const clampCacheTtl = (value: number): number =>
  Math.min(Math.max(value, CACHE_TTL_MIN_MS), CACHE_TTL_MAX_MS);

const DEFAULT_CACHE_TTL_MS = (() => {
  const envOverride = getEnvCacheTtl();
  if (typeof envOverride === "number") {
    return clampCacheTtl(envOverride);
  }
  return clampCacheTtl(5 * 60 * 1000);
})();

export const normalizeCacheTtl = (value?: number): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_CACHE_TTL_MS;
  }
  return clampCacheTtl(value);
};

// =============================================================================
// DEFAULT CONFIGURATION (PROD VALUES)
// =============================================================================
export const defaultSystemConfig: SystemConfig = {
  maintenance: {
    isActive: false,
    message: "",
    blocking: false,
  },
  auth: {
    registrationClosed: false,
    loginDisabled: false,
  },
  features: {
    enableAnalytics: true,
    enableMockData: false,
  },
  rateLimits: {
    api: {
      windowMs: 60000,
      maxRequests: 60,
    },
    search: {
      perMinute: 20,
    },
    aiEnhancement: {
      basic: {
        perHour: 5,
        perDay: 10,
      },
      premium: {
        perHour: 10,
        perDay: 40,
      },
      enterprise: {
        perHour: 30,
        perDay: 200,
      },
    },
    usernameCheck: {
      maxRequests: 10,
      windowMs: 60000,
    },
    supportFeedback: {
      maxPerHour: 5,
      windowMs: 3600000,
    },
  },
  tiers: {
    basic: {
      resumeLimit: 1,
      canEdit: false,
      retentionDays: 7,
      deletionGracePeriodDays: 3,
      expiryWarningHours: 72,
      recruiterContacts: {
        total: 2,
      },
      recruiterSearches: 2,
    },
    premium: {
      resumeLimit: 50,
      canEdit: true,
      retentionDays: null,
      deletionGracePeriodDays: null,
      expiryWarningHours: null,
      recruiterContacts: {
        perMonth: 50,
      },
      recruiterSearches: 9999,
    },
    enterprise: {
      resumeLimit: 9999,
      canEdit: true,
      retentionDays: null,
      deletionGracePeriodDays: null,
      expiryWarningHours: null,
      recruiterContacts: {
        perMonth: 9999,
      },
      recruiterSearches: 9999,
    },
  },
  search: {
    basicQuota: 50,
    premiumQuota: 999999,
    similarityThreshold: 0.5,
    maxResults: 10,
    costPerSearch: 0.5,
  },
  ai: {
    defaultModel: "gemini-2.5-flash-lite",
    embeddingModel: "text-embedding-004",
    embeddingDimension: 768,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokens: 2048,
    preferredModels: [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gpt-4o-mini",
      "groq/llama-3.1-8b",
    ],
    enableCostWarnings: true,
  },
  validation: {
    username: {
      minLength: 3,
      maxLength: 30,
    },
    fields: {
      maxLength: 200,
      maxDescriptionLength: 2000,
    },
    resume: {
      maxSkills: 50,
      maxExperiences: 20,
      maxEducations: 10,
      maxProjects: 20,
    },
  },
  cache: {
    systemConfigTtlMs: DEFAULT_CACHE_TTL_MS,
    templateCacheTtlMs: 1800000,
    tierCacheTtlMs: 86400000,
    aiCacheTtlMs: 86400000,
  },
  agentic: {
    enabled: true,
    budgetCap: 70, // Hard cap
    monthlySoftCap: 30, // Soft cap
  },
  registrations: {
    enabled: true,
    waitlistMode: false,
  },
};

// =============================================================================
// MERGE HELPERS
// =============================================================================
const deepMerge = <T extends object>(target: T, source?: Partial<T>): T => {
  if (!source) return target;
  const result = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }
  return result;
};

export const mergeWithDefaultConfig = (
  partial?: Partial<SystemConfig>
): SystemConfig => ({
  maintenance: deepMerge(defaultSystemConfig.maintenance, partial?.maintenance),
  auth: deepMerge(defaultSystemConfig.auth, partial?.auth),
  features: deepMerge(defaultSystemConfig.features, partial?.features),
  rateLimits: {
    api: deepMerge(
      defaultSystemConfig.rateLimits.api,
      partial?.rateLimits?.api
    ),
    search: deepMerge(
      defaultSystemConfig.rateLimits.search,
      partial?.rateLimits?.search
    ),
    aiEnhancement: {
      basic: deepMerge(
        defaultSystemConfig.rateLimits.aiEnhancement.basic,
        partial?.rateLimits?.aiEnhancement?.basic
      ),
      premium: deepMerge(
        defaultSystemConfig.rateLimits.aiEnhancement.premium,
        partial?.rateLimits?.aiEnhancement?.premium
      ),
      enterprise: deepMerge(
        defaultSystemConfig.rateLimits.aiEnhancement.enterprise,
        partial?.rateLimits?.aiEnhancement?.enterprise
      ),
    },
    usernameCheck: deepMerge(
      defaultSystemConfig.rateLimits.usernameCheck,
      partial?.rateLimits?.usernameCheck
    ),
    supportFeedback: deepMerge(
      defaultSystemConfig.rateLimits.supportFeedback,
      partial?.rateLimits?.supportFeedback
    ),
  },
  tiers: {
    basic: deepMerge(defaultSystemConfig.tiers.basic, partial?.tiers?.basic),
    premium: deepMerge(
      defaultSystemConfig.tiers.premium,
      partial?.tiers?.premium
    ),
    enterprise: deepMerge(
      defaultSystemConfig.tiers.enterprise,
      partial?.tiers?.enterprise
    ),
  },
  search: deepMerge(defaultSystemConfig.search, partial?.search),
  ai: deepMerge(defaultSystemConfig.ai, partial?.ai),
  validation: {
    username: deepMerge(
      defaultSystemConfig.validation.username,
      partial?.validation?.username
    ),
    fields: deepMerge(
      defaultSystemConfig.validation.fields,
      partial?.validation?.fields
    ),
    resume: deepMerge(
      defaultSystemConfig.validation.resume,
      partial?.validation?.resume
    ),
  },
  cache: {
    systemConfigTtlMs: normalizeCacheTtl(partial?.cache?.systemConfigTtlMs),
    templateCacheTtlMs:
      partial?.cache?.templateCacheTtlMs ??
      defaultSystemConfig.cache.templateCacheTtlMs,
    tierCacheTtlMs:
      partial?.cache?.tierCacheTtlMs ??
      defaultSystemConfig.cache.tierCacheTtlMs,
    aiCacheTtlMs:
      partial?.cache?.aiCacheTtlMs ?? defaultSystemConfig.cache.aiCacheTtlMs,
  },
  agentic: deepMerge(defaultSystemConfig.agentic, partial?.agentic),
  registrations: deepMerge(
    defaultSystemConfig.registrations,
    partial?.registrations
  ),
});
