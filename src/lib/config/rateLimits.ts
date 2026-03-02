export const TIER_RATE_LIMITS = {
  basic: {
    ai_generation: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 20,
    },
    chat: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 20,
    },
    default: {
      windowMs: 60 * 1000, // 1 minute
      limit: 10,
    },
  },
  premium: {
    ai_generation: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 50,
    },
    chat: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 100,
    },
    default: {
      windowMs: 60 * 1000, // 1 minute
      limit: 60,
    },
  },
  enterprise: {
    ai_generation: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 500,
    },
    chat: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 500,
    },
    default: {
      windowMs: 60 * 1000, // 1 minute
      limit: 600,
    },
  },
} as const;

/**
 * Hard per-user cap on resume creation regardless of tier.
 * Prevents a single user from generating more than N resumes per hour.
 * Applied on top of the tier-based ai_generation limit.
 */
export const RESUME_GENERATION_HARD_CAP = {
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
} as const;

export type RateLimitScope = keyof typeof TIER_RATE_LIMITS.basic;
