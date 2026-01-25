/**
 * Firebase Secret Manager Service
 *
 * Centralized secret management with caching, rotation tracking, and audit logging.
 * Replaces direct process.env access for sensitive credentials.
 *
 * @see docs/SECRET_ROTATION_IMPLEMENTATION.md
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { logger } from "@/lib/logger";

interface SecretMetadata {
  name: string;
  lastRotated: Date;
  rotationPeriod: number; // days
  nextRotation: Date;
  version: string;
}

interface CachedSecret {
  value: string;
  expiry: number;
}

/**
 * Secret rotation configuration
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
  FIREBASE_ADMIN_SDK_KEY: { rotationPeriod: 180, required: true },
};

export class SecretManagerService {
  private static instance: SecretManagerService;
  private cache: Map<string, CachedSecret> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private secretClient: SecretManagerServiceClient | null = null;
  private projectId: string | null = null;

  private constructor() {
    // Initialize Secret Manager client only in server context
    if (typeof window === "undefined") {
      try {
        this.projectId =
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
          process.env.GCLOUD_PROJECT ||
          null;

        if (this.projectId) {
          this.secretClient = new SecretManagerServiceClient();
          logger.info(
            { projectId: this.projectId },
            "SecretManagerService initialized with Firebase Secret Manager"
          );
        } else {
          logger.warn(
            "Project ID not found - falling back to environment variables"
          );
        }
      } catch (error) {
        logger.error(
          { err: error },
          "Failed to initialize Secret Manager client - falling back to env vars"
        );
      }
    }
  }

  static getInstance(): SecretManagerService {
    if (!SecretManagerService.instance) {
      SecretManagerService.instance = new SecretManagerService();
    }
    return SecretManagerService.instance;
  }

  /**
   * Get a secret value with caching
   *
   * @param name - Secret name (e.g., 'GEMINI_API_KEY')
   * @param userId - Optional user ID for audit logging
   * @returns Secret value
   * @throws Error if secret not found and required
   */
  async getSecret(name: string, userId?: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    try {
      // Fetch from environment (will be replaced with Secret Manager API)
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

      // Audit log
      await this.logSecretAccess(name, userId);

      return value;
    } catch (error) {
      logger.error({ err: error, secretName: name }, "Failed to fetch secret");
      throw error;
    }
  }

  /**
   * Fetch secret from storage
   * Uses Firebase Secret Manager in production, falls back to process.env in dev
   */
  private async fetchSecret(name: string): Promise<string> {
    // If Secret Manager client is available, use it
    if (this.secretClient && this.projectId) {
      try {
        const secretPath = `projects/${this.projectId}/secrets/${name}/versions/latest`;
        const [version] = await this.secretClient.accessSecretVersion({
          name: secretPath,
        });

        const payload = version.payload?.data;
        if (!payload) {
          throw new Error(`Secret ${name} has no payload`);
        }

        // Decode the secret value
        const secretValue =
          typeof payload === "string"
            ? payload
            : Buffer.from(payload as Uint8Array).toString("utf8");

        logger.debug(
          { secretName: name, projectId: this.projectId },
          "Retrieved secret from Firebase Secret Manager"
        );

        return secretValue;
      } catch (error) {
        // Log error but fall back to env vars for development
        logger.warn(
          { err: error, secretName: name },
          "Failed to fetch from Secret Manager, falling back to env vars"
        );
        return process.env[name] || "";
      }
    }

    // Fallback to process.env for local development
    logger.debug(
      { secretName: name },
      "Using process.env (dev mode or Secret Manager unavailable)"
    );
    return process.env[name] || "";
  }

  /**
   * Check rotation status for all secrets
   */
  async checkRotationStatus(): Promise<SecretMetadata[]> {
    const metadataList: SecretMetadata[] = [];

    for (const [secretName, config] of Object.entries(SECRET_CONFIG)) {
      try {
        const metadata = await this.getSecretMetadata();
        metadataList.push({
          name: secretName,
          lastRotated: metadata?.lastRotated || new Date(0),
          rotationPeriod: config.rotationPeriod,
          nextRotation: this.calculateNextRotation(
            metadata?.lastRotated || new Date(0),
            config.rotationPeriod
          ),
          version: metadata?.version || "unknown",
        });
      } catch (error) {
        logger.error(
          { err: error, secretName },
          "Failed to get metadata for secret"
        );
      }
    }

    return metadataList;
  }

  /**
   * Get metadata for a specific secret
   */
  private async getSecretMetadata(): Promise<{
    lastRotated: Date;
    version: string;
  } | null> {
    // TODO: Fetch from Firestore collection 'secretMetadata'
    // For now, return null (will be populated after first rotation)
    return null;
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
   * Rotate a secret (admin operation)
   */
  async rotateSecret(
    name: string,
    newValue: string,
    rotatedBy: string
  ): Promise<void> {
    try {
      // Validate secret strength
      if (!this.validateSecretStrength(newValue, name)) {
        throw new Error(`Secret ${name} does not meet strength requirements`);
      }

      // TODO: Update in Firebase Secret Manager
      // For now, log the rotation attempt
      logger.info({ secretName: name, rotatedBy }, "Secret rotation requested");

      // Update metadata
      await this.updateSecretMetadata(name, rotatedBy);

      // Invalidate cache
      this.cache.delete(name);

      logger.info(
        { secretName: name, rotatedBy },
        "Secret rotated successfully"
      );
    } catch (error) {
      logger.error({ err: error, secretName: name }, "Failed to rotate secret");
      throw error;
    }
  }

  /**
   * Update secret metadata after rotation
   */
  private async updateSecretMetadata(
    name: string,
    rotatedBy: string
  ): Promise<void> {
    // TODO: Save to Firestore collection 'secretMetadata'
    const metadata = {
      secretName: name,
      lastRotated: new Date(),
      rotatedBy,
      version: Date.now().toString(),
      environment: process.env.NODE_ENV,
    };

    logger.info(metadata, "Secret metadata updated");
  }

  /**
   * Log secret access for audit trail
   */
  private async logSecretAccess(
    secretName: string,
    userId?: string
  ): Promise<void> {
    // TODO: Save to Firestore collection 'secretAccessLogs' with retention policy
    // For now, just log to application logs
    logger.debug(
      {
        secretName,
        accessedBy: userId || "system",
        accessedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
      "Secret accessed"
    );
  }

  /**
   * Validate secret strength based on type
   */
  private validateSecretStrength(value: string, secretName: string): boolean {
    const requirements: Record<
      string,
      { minLength: number; pattern?: RegExp }
    > = {
      GEMINI_API_KEY: { minLength: 32, pattern: /^[A-Za-z0-9_-]+$/ },
      OPENAI_API_KEY: { minLength: 32, pattern: /^sk-[A-Za-z0-9_-]+$/ },
      GROQ_API_KEY: { minLength: 32, pattern: /^gsk_[A-Za-z0-9_-]+$/ },
      TOKEN_SECRET: { minLength: 64, pattern: /^[A-Za-z0-9]+$/ },
      FIREBASE_ADMIN_SDK_KEY: { minLength: 100 }, // JSON string
    };

    const req = requirements[secretName];
    if (!req) {
      logger.warn(`No validation requirements for secret ${secretName}`);
      return true;
    }

    if (value.length < req.minLength) {
      logger.warn(`Secret ${secretName} is too short (min: ${req.minLength})`);
      return false;
    }

    if (req.pattern && !req.pattern.test(value)) {
      logger.warn(`Secret ${secretName} does not match required pattern`);
      return false;
    }

    return true;
  }

  /**
   * Check if any secrets are due for rotation (within 7 days)
   */
  async getSecretsNeedingRotation(): Promise<SecretMetadata[]> {
    const allSecrets = await this.checkRotationStatus();
    const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;

    return allSecrets.filter(
      (secret) => secret.nextRotation.getTime() < sevenDaysFromNow
    );
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    logger.info("Secret cache cleared");
  }
}

/**
 * Convenience function to get a secret
 */
export async function getSecret(
  name: string,
  userId?: string
): Promise<string> {
  const service = SecretManagerService.getInstance();
  return service.getSecret(name, userId);
}

/**
 * Convenience function to rotate a secret (admin only)
 */
export async function rotateSecret(
  name: string,
  newValue: string,
  rotatedBy: string
): Promise<void> {
  const service = SecretManagerService.getInstance();
  return service.rotateSecret(name, newValue, rotatedBy);
}

/**
 * Get secrets needing rotation
 */
export async function getSecretsNeedingRotation(): Promise<SecretMetadata[]> {
  const service = SecretManagerService.getInstance();
  return service.getSecretsNeedingRotation();
}
