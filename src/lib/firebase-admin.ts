import * as admin from "firebase-admin";

/**
 * Firebase Admin Environment Configuration Error
 */
class FirebaseAdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseAdminConfigError";
  }
}

/**
 * Validate required environment variables for Firebase Admin
 */
function validateEnvironment(): void {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new FirebaseAdminConfigError(
      "Missing required environment variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID. " +
        "Please set this in your .env.local file or environment configuration."
    );
  }

  // Validate project ID format (alphanumeric with hyphens)
  if (!/^[a-z0-9-]+$/.test(projectId)) {
    throw new FirebaseAdminConfigError(
      `Invalid NEXT_PUBLIC_FIREBASE_PROJECT_ID format: "${projectId}". ` +
        "Project ID should only contain lowercase letters, numbers, and hyphens."
    );
  }
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Validate environment before initialization
    validateEnvironment();

    // Try to get service account from environment variable first
    // This is useful for development and certain deployment environments
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Use Application Default Credentials (ADC)
      // This works in:
      // - Local development with gcloud auth
      // - Google Cloud environment (Cloud Run, Cloud Functions, GCE, etc.)
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } catch (error) {
    // Using console.error here intentionally - logger may not be initialized yet
    // This is a bootstrap error that must be visible
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export default admin;
