import * as admin from "firebase-admin";
import { existsSync, readFileSync } from "node:fs";
import { logger } from "@/lib/logger";

/**
 * Firebase Admin Environment Configuration Error
 */
export class FirebaseAdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseAdminConfigError";
  }
}

type ServiceAccount = admin.ServiceAccount & Record<string, unknown>;

type FirebaseConfigEnv = {
  projectId?: string;
};

type FirebaseDefaultsEnv = {
  config?: {
    projectId?: string;
  };
};

function parseServiceAccount(raw: string): ServiceAccount | null {
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    // Support base64-encoded JSON payloads from some secret managers.
    try {
      return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as ServiceAccount;
    } catch {
      return null;
    }
  }
}

function parseJsonEnv<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function resolveProjectId(): { projectId: string | null; source: string | null } {
  if (process.env.GCLOUD_PROJECT) {
    return { projectId: process.env.GCLOUD_PROJECT, source: "GCLOUD_PROJECT" };
  }

  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return {
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      source: "GOOGLE_CLOUD_PROJECT",
    };
  }

  const firebaseConfig = parseJsonEnv<FirebaseConfigEnv>(process.env.FIREBASE_CONFIG);
  if (firebaseConfig?.projectId) {
    return { projectId: firebaseConfig.projectId, source: "FIREBASE_CONFIG" };
  }

  const firebaseDefaults = parseJsonEnv<FirebaseDefaultsEnv>(process.env.__FIREBASE_DEFAULTS__);
  if (firebaseDefaults?.config?.projectId) {
    return {
      projectId: firebaseDefaults.config.projectId,
      source: "__FIREBASE_DEFAULTS__",
    };
  }

  if (process.env.FIREBASE_PROJECT_ID) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      source: "FIREBASE_PROJECT_ID",
    };
  }

  // LAST RESORT (local dev): avoid direct `process.env.NEXT_PUBLIC_*` access
  // so Next.js doesn't inline `.env.local` values into production bundles.
  const nextPublicProjectId = process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"];
  if (nextPublicProjectId) {
    return {
      projectId: nextPublicProjectId,
      source: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    };
  }

  return { projectId: null, source: null };
}

function loadServiceAccountFromFile(): ServiceAccount | null {
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE,
    "/secrets/service-account.json",
    "/workspace/secrets/service-account.json",
  ].filter((p): p is string => Boolean(p));

  for (const filePath of candidatePaths) {
    try {
      if (!existsSync(filePath)) {
        continue;
      }

      const raw = readFileSync(filePath, "utf8").trim();
      if (!raw) {
        continue;
      }

      const parsed = parseServiceAccount(raw);
      if (parsed) {
        logger.info(
          { filePath },
          "Using Firebase Admin service account from file",
        );
        return parsed;
      }

      logger.warn(
        { filePath },
        "Service account file exists but could not be parsed as JSON",
      );
    } catch (error) {
      logger.warn(
        { err: error, filePath },
        "Failed reading Firebase service account file",
      );
    }
  }

  return null;
}

function resolveServiceAccount(): ServiceAccount | null {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (fromEnv) {
    const parsed = parseServiceAccount(fromEnv);
    if (parsed) {
      return parsed;
    }
    logger.warn(
      "FIREBASE_SERVICE_ACCOUNT is set but not valid JSON; falling back to file/ADC",
    );
  }

  return loadServiceAccountFromFile();
}

/**
 * Validate required environment variables for Firebase Admin
 */
export function validateEnvironment(): void {
  const { projectId } = resolveProjectId();

  if (!projectId) {
    // Fallback for production: Log warn but don't throw yet.
    // The initialization function handles the fallback value.
    if ((process.env.NODE_ENV as string) === "production") {
      logger.warn(
        { fallbackProjectId: "switchcv-e5136" },
        "Project ID missing in env, will fallback to default"
      );
      return;
    }

    // Dev-only, allowlisted env snapshot to help local debugging.
    // Avoid logging arbitrary env vars (blocklists are easy to miss).
    if ((process.env.NODE_ENV as string) !== "production") {
      logger.error(
        {
          NODE_ENV: process.env.NODE_ENV,
          GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
          GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
          FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? "[set]" : undefined,
          __FIREBASE_DEFAULTS__: process.env.__FIREBASE_DEFAULTS__
            ? "[set]"
            : undefined,
          NEXT_PUBLIC_FIREBASE_PROJECT_ID:
            process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
        },
        "Missing Project ID. Env snapshot:"
      );
    }

    throw new FirebaseAdminConfigError(
      "Missing required environment variable: GCLOUD_PROJECT/GOOGLE_CLOUD_PROJECT (or FIREBASE_CONFIG projectId)."
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

    const { projectId: resolvedProjectId, source } = resolveProjectId();
    let projectId = resolvedProjectId;

    // Fallback for production if missing
    if (!projectId && (process.env.NODE_ENV as string) === "production") {
      projectId = "switchcv-e5136";
      // Safe to set server-side vars (non-NEXT_PUBLIC)
      process.env.GCLOUD_PROJECT = projectId;
      process.env.GOOGLE_CLOUD_PROJECT = projectId;
    }

    if (projectId) {
      logger.info({ projectId, source }, "Resolved Firebase project ID");
    }

    // Set GOOGLE_CLOUD_PROJECT for ADC quota project (required for identitytoolkit.googleapis.com)
    if (!process.env.GOOGLE_CLOUD_PROJECT && projectId) {
      process.env.GOOGLE_CLOUD_PROJECT = projectId;
    }

    // Prefer explicit service account credentials (env JSON or mounted file),
    // then fall back to Application Default Credentials.
    const serviceAccount = resolveServiceAccount();
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId ?? undefined,
      });
    } else {
      // Use Application Default Credentials (ADC)
      admin.initializeApp({
        projectId: projectId ?? undefined,
      });
    }
    // console.log(
    //   "Firebase Admin Initialized successfully with Project ID:",
    //   projectId
    // );
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Firebase Admin SDK");
    // We must throw here because the app cannot function without admin
    throw error;
  }
}

// Initialize on module load
initializeFirebaseAdmin();

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export default admin;
