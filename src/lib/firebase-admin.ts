/* eslint-disable no-console */
import * as admin from "firebase-admin";

/**
 * Firebase Admin Environment Configuration Error
 */
export class FirebaseAdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseAdminConfigError";
  }
}

/**
 * Validate required environment variables for Firebase Admin
 */
export function validateEnvironment(): void {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

  if (!projectId) {
    // Log available env vars for debugging (excluding secrets)
    const safeEnv = Object.keys(process.env).reduce((acc, key) => {
      if (
        !key.includes("KEY") &&
        !key.includes("SECRET") &&
        !key.includes("PASS")
      ) {
        acc[key] = process.env[key];
      }
      return acc;
    }, {} as Record<string, string | undefined>);

    console.error("Missing Project ID. Available Env:", safeEnv);

    throw new FirebaseAdminConfigError(
      "Missing required environment variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID or GCLOUD_PROJECT."
    );
  }
}

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebaseAdmin(): void {
  // Check if default app is already initialized
  const defaultApp = admin.apps.find((app) => app?.name === "[DEFAULT]");
  if (defaultApp) {
    return;
  }

  try {
    // Validate environment before initialization
    validateEnvironment();

    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

    // Try to get service account from environment variable first
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } else {
      // Use Application Default Credentials (ADC)
      admin.initializeApp({
        projectId,
      });
    }
    console.log(
      "Firebase Admin Initialized successfully with Project ID:",
      projectId
    );
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    // We must throw here because the app cannot function without admin
    throw error;
  }
}

// Initialize on module load
initializeFirebaseAdmin();

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export default admin;
