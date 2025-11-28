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
 * AI Search Configuration
 * Semantic search powered by Gemini embeddings
 */
export const AI_SEARCH = {
  /** Gemini embedding model for vector generation */
  EMBEDDING_MODEL: "text-embedding-004",
  /** Vector dimension for text-embedding-004 */
  VECTOR_DIMENSION: 768,
  /** Maximum results to return per search */
  MAX_RESULTS: 10,
  /** Minimum similarity score (0-1) to include in results */
  MIN_SIMILARITY_SCORE: 0.5,
  /** Monthly search quota for premium tier */
  PREMIUM_MONTHLY_QUOTA: 50,
  /** Monthly search quota for enterprise tier (effectively unlimited) */
  ENTERPRISE_MONTHLY_QUOTA: 999999,
  /** Firestore collection for search quota tracking */
  QUOTA_COLLECTION: "searchQuotas",
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
 * Username Configuration
 * Reserved usernames that cannot be claimed by users
 */
export const USERNAME_CONFIG = {
  /** Minimum username length */
  MIN_LENGTH: 3,
  /** Maximum username length */
  MAX_LENGTH: 30,
  /** Debounce delay for availability check in ms */
  CHECK_DEBOUNCE_MS: 400,
  /** Rate limit for username availability checks per minute */
  CHECK_RATE_LIMIT_PER_MINUTE: 10,
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
