/**
 * System-wide Constants Configuration
 *
 * Centralizes magic numbers and hardcoded values that were previously
 * scattered across the codebase. This makes configuration easier to
 * manage and modify.
 *
 * @module config/constants
 */

/**
 * ID Generation Configuration
 */
export const ID_GENERATION = {
  /** Maximum numeric ID value (8 digits) */
  MAX_NUMERIC_ID: 99_999_999,
  /** Firestore document path for ID counter */
  COUNTER_DOC_PATH: "system/resumeIdCounter",
  /** Maximum retry attempts for ID generation */
  MAX_RETRIES: 3,
} as const;

/**
 * AI Service Configuration
 */
export const AI_SERVICE = {
  /** Model cache duration in milliseconds (24 hours) */
  MODEL_CACHE_DURATION_MS: 24 * 60 * 60 * 1000,
  /** Maximum remote model refresh attempts */
  MAX_MODEL_REFRESH_ATTEMPTS: 2,
  /** Default fallback model when preferred models unavailable */
  FALLBACK_MODEL: "gemini-2.0-flash-lite",
  /** Preferred model patterns in order of preference */
  MODEL_PREFERENCES: [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
    "gemini-pro-latest",
  ],
} as const;

/**
 * Quota Service Configuration
 */
export const QUOTA_SERVICE = {
  /** Firestore collection for quota tracking */
  COLLECTION_NAME: "quotas",
  /** Default daily request limit */
  DEFAULT_DAILY_LIMIT: 100,
  /** Premium daily request limit */
  PREMIUM_DAILY_LIMIT: 1000,
} as const;

/**
 * Session and Cache Configuration
 */
export const CACHE = {
  /** Default session timeout in milliseconds (30 minutes) */
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  /** API response cache duration in seconds */
  API_CACHE_SECONDS: 60,
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMITS = {
  /** Maximum API requests per minute */
  API_REQUESTS_PER_MINUTE: 60,
  /** Maximum AI generation requests per hour */
  AI_REQUESTS_PER_HOUR: 20,
  /** Maximum profile search requests per minute */
  SEARCH_REQUESTS_PER_MINUTE: 30,
  /** Maximum seed generation requests per hour */
  SEED_REQUESTS_PER_HOUR: 10,
} as const;

/**
 * Validation Limits
 */
export const VALIDATION = {
  /** Maximum resume title length */
  MAX_TITLE_LENGTH: 200,
  /** Maximum summary length */
  MAX_SUMMARY_LENGTH: 2000,
  /** Maximum skills count */
  MAX_SKILLS: 50,
  /** Maximum experience entries */
  MAX_EXPERIENCE_ENTRIES: 20,
  /** Maximum education entries */
  MAX_EDUCATION_ENTRIES: 10,
} as const;

/**
 * Application Configuration
 */
export const APP_CONFIG = {
  /** Support email address */
  SUPPORT_EMAIL: "support@switchcv.com",
  /** App version prefix */
  VERSION_PREFIX: "AI",
} as const;
