// =============================================================================
// MAINTENANCE CONFIGURATION
// =============================================================================
export type MaintenanceConfig = {
  isActive: boolean;
  message: string;
  blocking: boolean;
};

// =============================================================================
// AUTHENTICATION CONFIGURATION
// =============================================================================
export type AuthConfig = {
  registrationClosed: boolean;
  loginDisabled: boolean;
};

// =============================================================================
// FEATURE FLAGS
// =============================================================================
export type FeaturesConfig = {
  enableAnalytics: boolean;
  enableMockData: boolean;
};

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================
export type RateLimitConfig = {
  api: {
    windowMs: number;
    maxRequests: number;
  };
  search: {
    perMinute: number;
  };
  aiEnhancement: {
    basic: {
      perHour: number;
      perDay: number;
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
  usernameCheck: {
    maxRequests: number;
    windowMs: number;
  };
  supportFeedback: {
    maxPerHour: number;
    windowMs: number;
  };
};

// =============================================================================
// TIER CONFIGURATION
// =============================================================================
export type TierConfig = {
  resumeLimit: number;
  canEdit: boolean;
  retentionDays: number | null;
  deletionGracePeriodDays: number | null;
  expiryWarningHours: number | null;
  recruiterContacts: {
    total?: number;
    perMonth?: number;
  };
  recruiterSearches: number;
};

// =============================================================================
// SEARCH QUOTA CONFIGURATION
// =============================================================================
export type SearchQuotaConfig = {
  basicQuota: number;
  premiumQuota: number;
  similarityThreshold: number;
  maxResults: number;
  costPerSearch: number;
};

// =============================================================================
// AI CONFIGURATION
// =============================================================================
export type AIConfig = {
  defaultModel: string;
  embeddingModel: string;
  embeddingDimension: number;
  maxRetries: number;
  timeoutMs: number;
  maxTokens: number;
  preferredModels: string[];
  enableCostWarnings: boolean;
};

// =============================================================================
// VALIDATION RULES
// =============================================================================
export type ValidationConfig = {
  username: {
    minLength: number;
    maxLength: number;
  };
  fields: {
    maxLength: number;
    maxDescriptionLength: number;
  };
  resume: {
    maxSkills: number;
    maxExperiences: number;
    maxEducations: number;
    maxProjects: number;
  };
};

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================
export type CacheConfig = {
  systemConfigTtlMs: number;
  templateCacheTtlMs: number;
  tierCacheTtlMs: number;
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
