/**
 * Server-side system config fetcher
 *
 * Provides a way to fetch system configuration from Firebase Firestore
 * for use in server-side code where React hooks cannot be used.
 *
 * @module lib/getSystemConfig
 */

import {
  defaultSystemConfig,
  mergeWithDefaultConfig,
  type SystemConfig,
} from "@/lib/system-config";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Fetches the current system configuration from Firebase Firestore
 *
 * @returns Promise<SystemConfig> - The merged system configuration
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    const docRef = adminDb.collection("config").doc("system");
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      const data = snapshot.data() as Partial<SystemConfig>;
      return mergeWithDefaultConfig(data);
    }

    return defaultSystemConfig;
  } catch {
    // Silently fall back to default config on error
    return defaultSystemConfig;
  }
}

/**
 * Gets constants object based on current system configuration
 *
 * @returns Promise<object> - Constants object with dynamic values
 */
export async function getConstants() {
  const config = await getSystemConfig();

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
      /** Draft update rate limit per minute */
      DRAFT_UPDATES_PER_MINUTE: 60,
      /** Notification requests per minute */
      NOTIFICATIONS_PER_MINUTE: 100,
      /** Resume enhancement per hour */
      RESUME_ENHANCE_PER_HOUR: 20,
      /** Resume creation per hour */
      RESUME_CREATE_PER_HOUR: 10,
      /** Admin model refresh per minute */
      ADMIN_REFRESH_PER_MINUTE: 5,
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
     * Username Configuration
     */
    USERNAME_CONFIG: {
      /** Minimum username length */
      MIN_LENGTH: config.validation.username.minLength,
      /** Maximum username length */
      MAX_LENGTH: config.validation.username.maxLength,
      /** Debounce delay for availability check in ms */
      CHECK_DEBOUNCE_MS: 400,
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

    /**
     * Tier Configuration
     */
    tiers: config.tiers,
  };
}
