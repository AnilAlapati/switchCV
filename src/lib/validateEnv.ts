/**
 * Environment Variable Validation Utility
 *
 * Validates that all required environment variables are present and valid
 * on application startup. Prevents runtime crashes due to missing configs.
 *
 * @module lib/validateEnv
 * @example
 * ```typescript
 * // In next.config.ts or app startup
 * import { validateEnv } from '@/lib/validateEnv';
 * validateEnv();
 * ```
 */

/**
 * Environment variables required for the application to function
 */
interface RequiredEnv {
  // Firebase Admin SDK (server-side only)
  FIREBASE_ADMIN_SDK_KEY: string;

  // AI Provider APIs (server-side only)
  GEMINI_API_KEY?: string;
  HUGGINGFACE_TOKEN?: string;

  // Public Firebase config (can be public)
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;

  // Environment mode
  NODE_ENV: "development" | "production" | "test";
}

/**
 * Validates environment variables on startup
 * @throws {Error} If any required environment variables are missing
 * @returns {boolean} True if all variables are valid
 */
export function validateEnv(): boolean {
  const required: (keyof RequiredEnv)[] = [
    "FIREBASE_ADMIN_SDK_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];

  // In production, AI keys are required
  if (process.env.NODE_ENV === "production") {
    required.push("GEMINI_API_KEY");
  }

  const missing: string[] = [];
  const invalid: Array<{ key: string; reason: string }> = [];

  for (const key of required) {
    const value = process.env[key];

    if (!value) {
      missing.push(key);
    } else if (
      key.startsWith("NEXT_PUBLIC_") &&
      !validatePublicConfig(key, value)
    ) {
      invalid.push({ key, reason: "Invalid format" });
    }
  }

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables:\n${missing
      .map((k) => `  - ${k}`)
      .join("\n")}`;
    throw new Error(errorMsg);
  }

  if (invalid.length > 0) {
    const errorMsg = `Invalid environment variables:\n${invalid
      .map((i) => `  - ${i.key}: ${i.reason}`)
      .join("\n")}`;
    throw new Error(errorMsg);
  }

  return true;
}

/**
 * Validates public Firebase configuration
 * @param key - Environment variable key
 * @param value - Environment variable value
 * @returns {boolean} True if configuration is valid
 */
function validatePublicConfig(key: string, value: string): boolean {
  if (!value || value.length === 0) return false;

  // Basic validation for Firebase config keys
  switch (key) {
    case "NEXT_PUBLIC_FIREBASE_API_KEY":
    case "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN":
    case "NEXT_PUBLIC_FIREBASE_PROJECT_ID":
    case "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET":
    case "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID":
    case "NEXT_PUBLIC_FIREBASE_APP_ID":
      return value.length > 0 && value !== "undefined" && value !== "null";
    default:
      return true;
  }
}

/**
 * Check if a specific environment variable is set
 * @param key - Environment variable key
 * @returns {boolean} True if the variable is set
 */
export function hasEnv(key: string): boolean {
  return process.env[key] !== undefined && process.env[key] !== "";
}

/**
 * Get environment variable with fallback
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns {string} The environment variable value or default
 */
export function getEnv(key: string, defaultValue: string = ""): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get environment variable and validate it exists
 * @param key - Environment variable key
 * @returns {string} The environment variable value
 * @throws {Error} If the variable is not set
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable not set: ${key}`);
  }
  return value;
}
