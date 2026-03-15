export const TIER_RATE_LIMITS = {
  basic: {
    ai_generation: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 20,
    },
    conversation_turn: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 60, // Chat messages are cheap — allow enough for a real conversation
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
    conversation_turn: {
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 120,
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
    conversation_turn: {
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
 * Hard per-user cap on actual resume CREATION regardless of tier.
 * Only counted when a resume document is saved to Firestore (not per conversation turn).
 * Prevents a single user from mass-generating resumes.
 */
export const RESUME_GENERATION_HARD_CAP = {
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
} as const;

export type RateLimitScope = keyof typeof TIER_RATE_LIMITS.basic;
