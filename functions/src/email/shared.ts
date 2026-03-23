/**
 * Shared utilities for email functions: verification tokens, approval config,
 * token generation, and URL building helpers.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { randomUUID, createHash, randomBytes } from "crypto";
import { config } from "../config";

const LOCAL_BASE_URL = "http://localhost:3000";
const PROJECT_BASE_URLS: Record<string, string> = {
  "switchcv-dev": "https://switchcv-dev.web.app",
  "switchcv-staging": "https://switchcv-staging.web.app",
  "switchcv-e5136": "https://switchcv.com",
};

const defaultVerificationPath =
  process.env.VERIFICATION_PATH ||
  process.env.NEXT_PUBLIC_AUTH_VERIFICATION_PATH ||
  "/auth?mode=verify-email";

export const normalizeBase = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const resolveProjectId = (): string | undefined =>
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const isLocalhostUrl = (value: string): boolean => {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return value.includes("localhost") || value.includes("127.0.0.1");
  }
};

export const resolvePublicBaseUrl = (): string => {
  const explicitBaseUrl =
    process.env.WEBSITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return normalizeBase(explicitBaseUrl || LOCAL_BASE_URL);
  }

  const projectId = resolveProjectId();
  const fallbackBaseUrl = PROJECT_BASE_URLS["switchcv-e5136"];
  const projectBaseUrl = projectId ? PROJECT_BASE_URLS[projectId] : undefined;

  if (!explicitBaseUrl) {
    if (!projectBaseUrl) {
      functions.logger.warn(
        {
          projectId: projectId || "unknown",
          fallbackBaseUrl,
        },
        "Unknown project ID for email links; using fallback public base URL",
      );
      return normalizeBase(fallbackBaseUrl);
    }

    return normalizeBase(projectBaseUrl);
  }

  const normalizedExplicitBaseUrl = normalizeBase(explicitBaseUrl);
  if (!projectBaseUrl) {
    functions.logger.warn(
      {
        projectId: projectId || "unknown",
        explicitBaseUrl: normalizedExplicitBaseUrl,
      },
      "Unknown project ID for email links; using explicit public base URL",
    );
    return normalizedExplicitBaseUrl;
  }

  const normalizedProjectBaseUrl = normalizeBase(projectBaseUrl);
  const knownProjectMismatch =
    Object.values(PROJECT_BASE_URLS)
      .map((url) => normalizeBase(url))
      .includes(normalizedExplicitBaseUrl) &&
    normalizedExplicitBaseUrl !== normalizedProjectBaseUrl;

  if (isLocalhostUrl(normalizedExplicitBaseUrl) || knownProjectMismatch) {
    functions.logger.warn(
      {
        projectId: projectId || "unknown",
        explicitBaseUrl: normalizedExplicitBaseUrl,
        resolvedBaseUrl: normalizedProjectBaseUrl,
      },
      "Overriding mismatched public base URL for email links",
    );
    return normalizedProjectBaseUrl;
  }

  return normalizedExplicitBaseUrl;
};

export const buildVerificationLink = (): string => {
  const explicitLink =
    process.env.AUTH_VERIFICATION_URL || process.env.EMAIL_VERIFICATION_URL;
  if (explicitLink) {
    return explicitLink;
  }

  const baseUrl = resolvePublicBaseUrl();
  const path = defaultVerificationPath.startsWith("/")
    ? defaultVerificationPath
    : `/${defaultVerificationPath}`;
  return `${baseUrl}${path}`;
};

export const generateCustomVerificationToken = async (
  userId: string,
): Promise<string> => {
  const token = randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + 24 * 60 * 60 * 1000,
  ); // 24h

  // Store only the hash — never persist raw token
  await admin.firestore().collection("verificationTokens").add({
    userId,
    tokenHash,
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    used: false,
  });

  const baseUrl = resolvePublicBaseUrl();
  return `${baseUrl}/api/auth/verify?token=${token}`;
};

/**
 * Fetches user approval configuration from Firestore
 */
export async function getUserApprovalConfig(): Promise<{
  enabled: boolean;
  adminEmail: string;
  autoApproveDomains: string[];
}> {
  try {
    const configDoc = await admin
      .firestore()
      .collection("config")
      .doc("system")
      .get();

    if (configDoc.exists) {
      const configData = configDoc.data()?.userApproval;
      const resolvedAdminEmail =
        configData?.adminEmail || config.get("email").adminEmail;
      const enabled = configData?.enabled === true; // explicit true required — missing/undefined = disabled
      functions.logger.info(
        `[UserApprovalConfig] enabled=${enabled}, adminEmail="${resolvedAdminEmail}" (source: ${configData?.adminEmail ? "Firestore config/system" : "code default"})`,
      );
      return {
        enabled,
        adminEmail: resolvedAdminEmail,
        autoApproveDomains: configData?.autoApproveDomains || [],
      };
    }
  } catch (error) {
    functions.logger.warn(
      "Failed to fetch user approval config, using defaults (disabled):",
      error,
    );
  }

  // Safe default: approval disabled when config is missing or unreadable
  return {
    enabled: false,
    adminEmail: config.get("email").adminEmail,
    autoApproveDomains: [],
  };
}

/**
 * Checks if an email domain should be auto-approved
 */
export function shouldAutoApprove(
  email: string,
  autoApproveDomains: string[],
): boolean {
  if (!email || autoApproveDomains.length === 0) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return autoApproveDomains.some((d) => d.toLowerCase() === domain);
}

/**
 * Generate a secure approval token
 */
export function generateApprovalToken(
  action: "approve" | "decline",
  requestId: string,
): { token: string; hash: string; expiresAt: admin.firestore.Timestamp } {
  // Generate 32 bytes of random data (256 bits)
  const randomData = randomBytes(32).toString("hex");

  // Combine with action and requestId for uniqueness
  const token = `${action}_${requestId}_${randomData}`;

  // Create SHA256 hash for storage
  const hash = createHash("sha256").update(token).digest("hex");

  // Token expires in 7 days
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  return { token, hash, expiresAt };
}
