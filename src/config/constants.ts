/**
 * System-wide Constants Configuration
 *
 * Centralizes magic numbers and hardcoded values that were previously
 * scattered across the codebase. This makes configuration easier to
 * manage and modify.
 *
 * @module config/constants
 */

import { useSystemConfig } from "@/context/SystemConfigProvider";

/**
 * ID Generation Configuration
 */
export const ID_GENERATION = {
  /** Maximum numeric ID value (8 digits) */
  MAX_NUMERIC_ID: 99_999_999,
  /** Firestore document path for ID counter */
  COUNTER_DOC_PATH: "system/resumeIdCounter",
  /** Firestore sub-collection that stores sharded counters */
  SHARD_COLLECTION_PATH: "system/resumeIdCounter/shards",
  /** Number of counter shards to spread write load across */
  SHARD_COUNT: 16,
  /** Maximum retry attempts for ID generation */
  MAX_RETRIES: 3,
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
 * Application Configuration
 */
export const APP_CONFIG = {
  /** Support email address */
  SUPPORT_EMAIL: "support@switchcv.com",
  /** App version prefix */
  VERSION_PREFIX: "AI",
} as const;

/**
 * UI & Interaction Configuration
 */
export const UI_CONFIG = {
  /**
   * Notification polling interval in milliseconds.
   * Set to a high value (1000 minutes) to reduce read costs during development.
   * Normal production value might be 60000 (1 minute).
   */
  NOTIFICATION_POLLING_INTERVAL_MS: 60_000_000, // 1000 minutes
} as const;

/**
 * Draft Resume Configuration
 * Manages the draft → publish lifecycle for resumes
 */
export const DRAFT_CONFIG = {
  /** Length of alphanumeric draft IDs (e.g., "d7xK9mP2") */
  ID_LENGTH: 8,
  /** Characters used for draft ID generation (alphanumeric, no ambiguous chars) */
  ID_CHARSET: "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789",
  /** Firestore collection for draft resumes */
  COLLECTION: "drafts",
  /** Firestore collection for draft ID mappings */
  ID_MAPPING_COLLECTION: "draftIdMapping",
  /** Maximum retry attempts for unique ID generation */
  MAX_ID_RETRIES: 5,
} as const;

/**
 * Resume Lifecycle States
 */
export const RESUME_STATES = {
  /** Resume is being edited, not visible to recruiters */
  DRAFT: "draft",
  /** Resume is published and searchable */
  PUBLISHED: "published",
  /** Resume was unpublished for editing (shows "being edited" message) */
  EDITING: "editing",
} as const;

/**
 * Reserved Usernames
 * These usernames cannot be claimed by users to prevent confusion,
 * impersonation, and to reserve system/brand names.
 */
export const RESERVED_USERNAMES = [
  // Brand & Company
  "switchcv",
  "switch-cv",
  "switch_cv",
  "switchcv-team",
  "switchcv-official",
  // System & Admin
  "admin",
  "administrator",
  "root",
  "system",
  "moderator",
  "mod",
  "staff",
  "team",
  "official",
  // Support & Help
  "support",
  "help",
  "helpdesk",
  "contact",
  "feedback",
  "info",
  "service",
  "customer-service",
  // Security & Legal
  "security",
  "abuse",
  "report",
  "legal",
  "privacy",
  "terms",
  "dmca",
  "copyright",
  // Technical & Infrastructure
  "api",
  "www",
  "mail",
  "email",
  "ftp",
  "cdn",
  "static",
  "assets",
  "images",
  "files",
  "upload",
  "download",
  // Business & Billing
  "billing",
  "payments",
  "invoice",
  "sales",
  "enterprise",
  "business",
  "careers",
  "jobs",
  "hire",
  "hiring",
  // Common Reserved
  "test",
  "demo",
  "example",
  "sample",
  "null",
  "undefined",
  "anonymous",
  "guest",
  "user",
  "users",
  "account",
  "profile",
  "settings",
  "dashboard",
  "login",
  "logout",
  "signup",
  "signin",
  "register",
  "password",
  "reset",
  "verify",
  "confirm",
  // Social Media Style
  "everyone",
  "all",
  "here",
  "channel",
  "me",
  "myself",
  "you",
] as const;

/** Type for reserved usernames */
export type ReservedUsername = (typeof RESERVED_USERNAMES)[number];

/**
 * Username Configuration
 * Static constants that don't require Firebase config
 */
export const USERNAME_CONFIG = {
  /** Debounce delay for availability check in ms */
  CHECK_DEBOUNCE_MS: 400,
  /** Minimum username length */
  MIN_LENGTH: 3,
  /** Maximum username length */
  MAX_LENGTH: 30,
  /** Rate limit for username availability checks per minute */
  CHECK_RATE_LIMIT_PER_MINUTE: 10,
} as const;

/**
 * Dynamic Constants Hook
 * Returns constants that can be configured via Firebase
 */
export const useConstants = () => {
  const { config } = useSystemConfig();

  return {
    /**
     * AI Service Configuration
     */
    AI_SERVICE: {
      /** Model cache duration in milliseconds */
      MODEL_CACHE_DURATION_MS: config.cache.aiCacheTtlMs,
      /** Maximum remote model refresh attempts */
      MAX_MODEL_REFRESH_ATTEMPTS: 2,
      /** Default fallback model when preferred models unavailable */
      FALLBACK_MODEL: config.ai.defaultModel,
      /** Preferred model patterns in order of preference */
      MODEL_PREFERENCES: config.ai.preferredModels,
    } as const,

    /**
     * Session and Cache Configuration
     */
    CACHE: {
      /** Default session timeout in milliseconds (30 minutes) */
      SESSION_TIMEOUT_MS: 30 * 60 * 1000,
      /** API response cache duration in seconds */
      API_CACHE_SECONDS: config.cache.systemConfigTtlMs / 1000,
    } as const,

    /**
     * Rate Limiting Configuration
     */
    RATE_LIMITS: {
      /** Maximum API requests per minute */
      API_REQUESTS_PER_MINUTE: config.rateLimits.api.maxRequests,
      /** Maximum AI generation requests per hour (basic tier) */
      AI_REQUESTS_PER_HOUR: config.rateLimits.aiEnhancement.basic.perHour,
      /** Maximum profile search requests per minute */
      SEARCH_REQUESTS_PER_MINUTE: config.rateLimits.search.perMinute,
      /** Maximum seed generation requests per hour */
      SEED_REQUESTS_PER_HOUR: 10, // Not in config yet
    } as const,

    /**
     * Validation Limits
     */
    VALIDATION: {
      /** Maximum resume title length */
      MAX_TITLE_LENGTH: config.validation.fields.maxLength,
      /** Maximum summary length */
      MAX_SUMMARY_LENGTH: config.validation.fields.maxDescriptionLength,
      /** Maximum skills count */
      MAX_SKILLS: config.validation.resume.maxSkills,
      /** Maximum experience entries */
      MAX_EXPERIENCE_ENTRIES: config.validation.resume.maxExperiences,
      /** Maximum education entries */
      MAX_EDUCATION_ENTRIES: config.validation.resume.maxEducations,
    } as const,

    /**
     * Username Configuration (Dynamic)
     */
    USERNAME_VALIDATION: {
      /** Minimum username length */
      MIN_LENGTH: config.validation.username.minLength,
      /** Maximum username length */
      MAX_LENGTH: config.validation.username.maxLength,
      /** Rate limit for username availability checks per minute */
      CHECK_RATE_LIMIT_PER_MINUTE: config.rateLimits.usernameCheck.maxRequests,
    } as const,

    /**
     * AI Search Configuration
     */
    AI_SEARCH: {
      /** Gemini embedding model for vector generation */
      EMBEDDING_MODEL: config.ai.embeddingModel,
      /** Vector dimension for text-embedding-004 */
      VECTOR_DIMENSION: config.ai.embeddingDimension,
      /** Maximum results to return per search */
      MAX_RESULTS: config.search.maxResults,
      /** Minimum similarity score (0-1) to include in results */
      MIN_SIMILARITY_SCORE: config.search.similarityThreshold,
      /** Monthly search quota for premium tier */
      PREMIUM_MONTHLY_QUOTA: config.search.premiumQuota,
      /** Monthly search quota for enterprise tier */
      ENTERPRISE_MONTHLY_QUOTA: config.search.premiumQuota, // Using premium for enterprise too
      /** Firestore collection for search quota tracking */
      QUOTA_COLLECTION: "searchQuotas",
    } as const,
  };
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  /** Profile search requests per minute per user */
  PROFILE_SEARCH_PER_MINUTE: 30,

  /** Resume generation requests per minute per user */
  RESUME_GENERATION_PER_MINUTE: 5,

  /** AI API calls per minute per user */
  AI_CALLS_PER_MINUTE: 20,

  /** Contact request notifications per hour per recruiter */
  CONTACT_REQUESTS_PER_HOUR: 50,

  /** Access request approvals per minute per user */
  ACCESS_REQUESTS_PER_MINUTE: 30,

  /** General API requests per minute per user */
  GENERAL_API_PER_MINUTE: 100,
} as const;

/**
 * Cache configuration (in milliseconds)
 */
export const CACHE_TTL = {
  /** Resume cache - 5 minutes */
  RESUME: 5 * 60 * 1000,

  /** User profile cache - 10 minutes */
  USER_PROFILE: 10 * 60 * 1000,

  /** Search results cache - 3 minutes */
  SEARCH_RESULTS: 3 * 60 * 1000,

  /** Public profile cache - 1 hour */
  PUBLIC_PROFILE: 60 * 60 * 1000,

  /** AI model list cache - 1 hour */
  AI_MODELS: 60 * 60 * 1000,
} as const;

/**
 * Pagination configuration
 */
export const PAGINATION = {
  /** Default page limit */
  DEFAULT_LIMIT: 20,

  /** Maximum page limit */
  MAX_LIMIT: 100,

  /** Minimum page limit */
  MIN_LIMIT: 1,

  /** Default offset */
  DEFAULT_OFFSET: 0,
} as const;

/**
 * Search configuration
 */
export const SEARCH_CONFIG = {
  /** Minimum search query length */
  MIN_QUERY_LENGTH: 2,

  /** Maximum search query length */
  MAX_QUERY_LENGTH: 500,
} as const;

/**
 * Access request configuration
 */
export const ACCESS_REQUEST = {
  /** Access token expiry in hours */
  TOKEN_EXPIRY_HOURS: 24,

  /** Request expiry in days */
  REQUEST_EXPIRY_DAYS: 7,

  /** Maximum pending requests per recruiter */
  MAX_PENDING_PER_RECRUITER: 100,

  /** Maximum daily requests per recruiter */
  MAX_DAILY_PER_RECRUITER: 500,
} as const;

/**
 * Authentication configuration
 */
export const AUTH = {
  /** Password minimum length */
  PASSWORD_MIN_LENGTH: 8,

  /** Password maximum length */
  PASSWORD_MAX_LENGTH: 128,

  /** Session timeout in milliseconds (30 minutes) */
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,

  /** Token expiry in hours */
  TOKEN_EXPIRY_HOURS: 24,

  /** Refresh token expiry in days */
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
} as const;

/**
 * AI configuration
 */
export const AI_CONFIG = {
  /** Default AI model */
  DEFAULT_MODEL: 'gemini-1.5-flash',

  /** Maximum tokens for AI generation */
  MAX_TOKENS: 1000,

  /** Temperature for AI requests (0-1) */
  TEMPERATURE: 0.8,

  /** Maximum retries for AI API calls */
  MAX_RETRIES: 3,

  /** Timeout for AI API calls in milliseconds */
  TIMEOUT_MS: 30000,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
} as const;
