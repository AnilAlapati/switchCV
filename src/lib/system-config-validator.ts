import { z } from "zod";
import type { SystemConfig } from "./system-config-types";
import { logger } from "./logger";

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

const RateLimitConfigSchema = z.object({
  api: z.object({
    windowMs: z.number().min(1000).max(3600000),
    maxRequests: z.number().min(1).max(1000),
  }),
  search: z.object({
    perMinute: z.number().min(1).max(100),
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
    windowMs: z.number().min(3600000).max(86400000),
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
  timeoutMs: z.number().min(5000).max(120000),
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

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateSystemConfig(
  data: unknown,
  defaultConfig: SystemConfig
): SystemConfig {
  try {
    return SystemConfigSchema.parse(data);
  } catch (error) {
    logger.error({ error }, "❌ Invalid system config, using defaults:");
    return defaultConfig;
  }
}

export function validateAICosts(config: SystemConfig): void {
  const expensiveModels: Record<string, number> = {
    "gpt-4o": 10.0,
    "gpt-4-turbo": 10.0,
    "claude-3.5-sonnet": 6.0,
    "claude-3-opus": 15.0,
  };

  const cost = expensiveModels[config.ai.defaultModel];
  if (cost && config.ai.enableCostWarnings) {
    logger.warn({ comparison: `Cost: $${cost}/1M tokens vs $0.15 for Gemini Flash` }, `🚨 WARNING: Expensive AI model selected: ${config.ai.defaultModel}`);
  }
}
