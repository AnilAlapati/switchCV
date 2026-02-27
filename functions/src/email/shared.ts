/**
 * Shared utilities for email functions: verification tokens, approval config,
 * token generation, and URL building helpers.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { randomUUID, createHash, randomBytes } from "crypto";
import { config } from "../config";

const defaultVerificationPath =
  process.env.VERIFICATION_PATH ||
  process.env.NEXT_PUBLIC_AUTH_VERIFICATION_PATH ||
  "/auth?mode=verify-email";

export const normalizeBase = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

export const buildVerificationLink = (): string => {
  const explicitLink =
    process.env.AUTH_VERIFICATION_URL || process.env.EMAIL_VERIFICATION_URL;
  if (explicitLink) {
    return explicitLink;
  }

  const baseUrl = normalizeBase(
    process.env.WEBSITE_URL || "https://switchcv.com",
  );
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

  const baseUrl = normalizeBase(
    process.env.WEBSITE_URL || "https://switchcv.com",
  );
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
      functions.logger.info(
        `[UserApprovalConfig] enabled=${configData?.enabled ?? true}, adminEmail="${resolvedAdminEmail}" (source: ${configData?.adminEmail ? "Firestore config/system" : "code default"})`,
      );
      return {
        enabled: configData?.enabled ?? true,
        adminEmail: resolvedAdminEmail,
        autoApproveDomains: configData?.autoApproveDomains || [],
      };
    }
  } catch (error) {
    functions.logger.warn(
      "Failed to fetch user approval config, using defaults:",
      error,
    );
  }

  return {
    enabled: true,
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
