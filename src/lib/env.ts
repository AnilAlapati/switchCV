/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at startup using Zod.
 * Fails fast if critical configuration is missing.
 */

import { z } from "zod";

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Firebase Client Configuration (Public)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1).optional(),

  // Firebase Admin (Server-side only)
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),

  // AI Service Configuration (Server-side only)
  GEMINI_API_KEY: z.string().min(1).optional(), // Optional for dev
  OPENAI_API_KEY: z.string().min(1).optional(), // OpenAI GPT models
  GROQ_API_KEY: z.string().min(1).optional(), // Groq (fast & free tier)
  ANTHROPIC_API_KEY: z.string().min(1).optional(), // Claude (future)
  HUGGINGFACE_TOKEN: z.string().min(1).optional(),

  // Application URLs
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),

  // Feature Flags (Public)
  NEXT_PUBLIC_DEV_MODE: z.enum(["true", "false"]).optional(),
  NEXT_PUBLIC_DEV_TIER: z.enum(["basic", "premium", "enterprise"]).optional(),
  NEXT_PUBLIC_DEV_ROLE: z.enum(["jobseeker", "recruiter", "admin"]).optional(),
  NEXT_PUBLIC_ENABLE_SEEDING_DEBUG: z.enum(["true", "false"]).optional(),
  NEXT_PUBLIC_USE_FIRESTORE_NOTIFICATIONS: z.enum(["true", "false"]).optional(),

  // Seeding Limits (Server-side)
  SEED_BASIC_MONTHLY_LIMIT: z.string().optional(),
  SEED_PREMIUM_MONTHLY_LIMIT: z.string().optional(),
  SEED_ENTERPRISE_MONTHLY_LIMIT: z.string().optional(),
  SEED_GLOBAL_LIVE_MONTHLY_LIMIT: z.string().optional(),

  // Support & Feedback
  SUPPORT_FEEDBACK_TO: z.string().email().optional(),
  SUPPORT_FEEDBACK_DRY_RUN: z.enum(["true", "false"]).optional(),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Resume Mode
  RESUME_MODE: z.string().optional(),

  // Version
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables.
 * Access environment variables through this object instead of process.env.
 */
export const env = envSchema.parse(process.env);

/**
 * Check if running in production
 */
export const isProd = env.NODE_ENV === "production";

/**
 * Check if running in development
 */
export const isDev = env.NODE_ENV === "development";

/**
 * Check if running in test environment
 */
export const isTest = env.NODE_ENV === "test";
