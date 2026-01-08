/**
 * Secret Manager Service for Firebase Cloud Functions
 *
 * Server-side secret management with Firebase Secret Manager integration.
 * Handles secret caching, rotation tracking, and audit logging.
 *
 * @see docs/SECRET_ROTATION_IMPLEMENTATION.md
 */

import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";

interface SecretMetadata {
  name: string;
  lastRotated: Date;
  rotationPeriod: number;
  nextRotation: Date;
  version: string;
}

interface CachedSecret {
  value: string;
  expiry: number;
}

/**
 * Secret rotation configuration (matches frontend config)
 */
const SECRET_CONFIG: Record<
  string,
  { rotationPeriod: number; required: boolean }
> = {
  GEMINI_API_KEY: { rotationPeriod: 90, required: true },
  OPENAI_API_KEY: { rotationPeriod: 90, required: false },
  GROQ_API_KEY: { rotationPeriod: 90, required: false },
  HUGGINGFACE_TOKEN: { rotationPeriod: 90, required: false },
  TOKEN_SECRET: { rotationPeriod: 30, required: true },
  SMTP_PASS: { rotationPeriod: 90, required: true },
};

export class SecretManagerService {
  private static instance: SecretManagerService;
  private cache: Map<string, CachedSecret> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private db = getFirestore();

  private constructor() {
    logger.info("SecretManagerService initialized (Cloud Functions)");
  }

  static getInstance(): SecretManagerService {
    if (!SecretManagerService.instance) {
      SecretManagerService.instance = new SecretManagerService();
    }
    return SecretManagerService.instance;
  }

  /**
   * Get a secret value with caching
   */
  async getSecret(name: string, context?: string): Promise<string> {
    // Check cache
    const cached = this.cache.get(name);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    try {
      // Fetch from environment (Firebase Secret Manager injects these)
      const value = await this.fetchSecret(name);

      if (!value) {
        const config = SECRET_CONFIG[name];
        if (config?.required) {
          throw new Error(`Required secret ${name} is not configured`);
        }
        logger.warn(`Optional secret ${name} not found`);
        return "";
      }

      // Cache the value
      this.cache.set(name, {
        value,
        expiry: Date.now() + this.CACHE_TTL,
      });

      // Audit log (non-blocking)
      this.logSecretAccess(name, context).catch((err) => {
        logger.warn("Failed to log secret access", { error: err });
      });

      return value;
    } catch (error) {
      logger.error(`Failed to fetch secret ${name}`, { error });
      throw error;
    }
  }

  /**
   * Fetch secret from Firebase Secret Manager
   */
  private async fetchSecret(name: string): Promise<string> {
    // Firebase Secret Manager injects secrets as environment variables
    // when functions are deployed with: firebase deploy --only functions
    // and secrets are defined with: firebase functions:secrets:set SECRET_NAME
    return process.env[name] || "";
  }

  /**
   * Check rotation status for all secrets
   */
  async checkRotationStatus(): Promise<SecretMetadata[]> {
    const metadataList: SecretMetadata[] = [];

    for (const [secretName, config] of Object.entries(SECRET_CONFIG)) {
      try {
        const metadata = await this.getSecretMetadata(secretName);

        const lastRotated = metadata?.lastRotated
          ? new Date(metadata.lastRotated)
          : new Date(0);

        metadataList.push({
          name: secretName,
          lastRotated,
          rotationPeriod: config.rotationPeriod,
          nextRotation: this.calculateNextRotation(
            lastRotated,
            config.rotationPeriod
          ),
          version: metadata?.version || "unknown",
        });
      } catch (error) {
        logger.error(`Failed to get metadata for ${secretName}`, { error });
      }
    }

    return metadataList;
  }

  /**
   * Get metadata for a specific secret from Firestore
   */
  private async getSecretMetadata(name: string): Promise<{
    lastRotated: string;
    version: string;
  } | null> {
    try {
      const doc = await this.db.collection("secretMetadata").doc(name).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        lastRotated: data?.lastRotated || new Date(0).toISOString(),
        version: data?.version || "unknown",
      };
    } catch (error) {
      logger.error(`Failed to fetch metadata for ${name}`, { error });
      return null;
    }
  }

  /**
   * Calculate next rotation date
   */
  private calculateNextRotation(lastRotated: Date, periodDays: number): Date {
    const next = new Date(lastRotated);
    next.setDate(next.getDate() + periodDays);
    return next;
  }

  /**
   * Update secret metadata after rotation
   */
  async updateSecretMetadata(name: string, rotatedBy: string): Promise<void> {
    try {
      const metadata = {
        secretName: name,
        lastRotated: new Date().toISOString(),
        rotatedBy,
        version: Date.now().toString(),
        environment: process.env.NODE_ENV || "production",
        updatedAt: new Date(),
      };

      await this.db
        .collection("secretMetadata")
        .doc(name)
        .set(metadata, { merge: true });

      // Invalidate cache
      this.cache.delete(name);

      logger.info("Secret metadata updated", {
        secretName: name,
        version: metadata.version,
      });
    } catch (error) {
      logger.error(`Failed to update metadata for ${name}`, { error });
      throw error;
    }
  }

  /**
   * Log secret access for audit trail
   */
  private async logSecretAccess(
    secretName: string,
    context?: string
  ): Promise<void> {
    try {
      // Log to Firestore with automatic cleanup after 90 days
      await this.db.collection("secretAccessLogs").add({
        secretName,
        context: context || "unknown",
        accessedAt: new Date(),
        environment: process.env.NODE_ENV || "production",
        // Firestore TTL policy will clean up old logs
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
    } catch (error) {
      // Don't fail the secret access if logging fails
      logger.warn("Failed to log secret access", {
        error,
        secretName,
      });
    }
  }

  /**
   * Clear cache (useful for forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    logger.info("Secret cache cleared");
  }

  /**
   * Get secrets needing rotation (within 7 days)
   */
  async getSecretsNeedingRotation(): Promise<SecretMetadata[]> {
    const allSecrets = await this.checkRotationStatus();
    const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;

    return allSecrets.filter(
      (secret) => secret.nextRotation.getTime() < sevenDaysFromNow
    );
  }
}

/**
 * Convenience function to get a secret
 */
export async function getSecret(
  name: string,
  context?: string
): Promise<string> {
  const service = SecretManagerService.getInstance();
  return service.getSecret(name, context);
}

/**
 * Update secret metadata (called after rotation)
 */
export async function updateSecretMetadata(
  name: string,
  rotatedBy: string
): Promise<void> {
  const service = SecretManagerService.getInstance();
  return service.updateSecretMetadata(name, rotatedBy);
}

/**
 * Get secrets needing rotation
 */
export async function getSecretsNeedingRotation(): Promise<SecretMetadata[]> {
  const service = SecretManagerService.getInstance();
  return service.getSecretsNeedingRotation();
}
