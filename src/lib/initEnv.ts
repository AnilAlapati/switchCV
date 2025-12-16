/**
 * Environment Setup Hook
 *
 * This file is imported early in the application lifecycle
 * to validate environment variables and ensure the app is properly configured.
 *
 * @module lib/initEnv
 */

import { validateEnv } from './validateEnv';

/**
 * Initialize environment variables
 * This should be called as early as possible in the application startup
 */
export function initializeEnvironment(): void {
  if (typeof window !== 'undefined') {
    // Browser environment - skip validation
    return;
  }

  try {
    // Validate all required environment variables
    validateEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Environment initialization failed:');
    console.error(message);
    
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast
      process.exit(1);
    } else {
      // In development, warn but continue
      console.warn('⚠️ Continuing in development mode despite validation errors');
    }
  }
}

// Auto-initialize when this module is imported
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  initializeEnvironment();
}
